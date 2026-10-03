import { commandGuilds } from "@/util/commandGuilds";
import { CommandData, AutocompleteCommand, ChatInputCommand } from "commandkit";
import { ApplicationCommandOptionType, MessageFlags } from "discord.js";
import { ExtendedLevel, Level } from "@/types/level";
import { api } from "@/api";
import { MutualVictors } from "@/types/record";
import { Logger } from "commandkit";
import { db } from "@/db/prisma";
import { guildId } from "@/config";
import { SuggestionType } from "generated/prisma/enums";

export const metadata = commandGuilds();

export const command: CommandData = {
    name: "suggestion",
    description: "Tag/description suggestion management",
    options: [
        {
            name: "tag-victors",
            description:
                "Asks 0-2 victors of a given level to approve a suggestion",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "level",
                    description: "The name of the level",
                    autocomplete: true,
                    required: true,
                    type: ApplicationCommandOptionType.String,
                },
                {
                    name: "type",
                    description:
                        "The number of players to include initially. Defaults to 3",
                    required: true,
                    choices: [
                        {
                            name: "Tags",
                            value: "Tags",
                        },
                        {
                            name: "Description",
                            value: "Description",
                        },
                    ],
                    type: ApplicationCommandOptionType.String,
                },
            ],
        },
        {
            name: "tag-tiebreaker",
            description: "Asks the tiebreaker to approve/deny a suggestion",
            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: "close-thread",
            description: "Closes the current suggestion thread",
            type: ApplicationCommandOptionType.Subcommand,
        },
    ],
};

export const autocomplete: AutocompleteCommand = async ({ interaction }) => {
    const focused = interaction.options.getFocused();
    const res = await api.send<Level[]>("/aredl/levels", "GET", {
        name_contains: focused.toLowerCase(),
    });
    if (res.error) {
        return;
    }
    const levels = res.data;
    return await interaction.respond(
        await levels
            .filter(
                (level) =>
                    level.name.toLowerCase().includes(focused.toLowerCase()) ||
                    level.position == Number(focused.toLowerCase())
            )
            .sort((a, b) =>
                a.name.toLowerCase() === focused.toLowerCase()
                    ? -1
                    : b.name.toLowerCase() === focused.toLowerCase()
                      ? 1
                      : 0
            )
            .slice(0, 25)
            .map((level) => ({
                name: `#${level.position} - ${level.name}`,
                value: level.id,
            }))
    );
};

export const chatInput: ChatInputCommand = async ({ interaction }) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (
        !interaction.channel ||
        !interaction.channel.isSendable() ||
        !interaction.channel.isThread()
    ) {
        return await interaction.editReply(":x: Invalid channel!");
    }
    
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "tag-victors") {
        const starterMessage = await interaction.channel.fetchStarterMessage();
        if (!starterMessage) {
            return await interaction.editReply(
                ":x: Starter message not found!"
            );
        }
        const levelId = interaction.options.getString("level", true);
        const threadType = interaction.options.getString(
            "type",
            true
        ) as SuggestionType;

        const victorsRes = await api.send<MutualVictors>(
            `/aredl/records/mutual-victors?level_id=${levelId}&other_level_id=${levelId}`
        );
        if (victorsRes.error) {
            Logger.error(`Error fetching victors for level ${levelId}!`);
            Logger.error(`${victorsRes.status}: ${victorsRes.data.message}`);
            return await interaction.editReply("Error fetching victors!");
        }

        const { level, mutuals } = victorsRes.data;

        if (mutuals.length === 0) {
            return await interaction.editReply("No mutual victors found!");
        }

        const guild = interaction.client.guilds.cache.get(guildId);
        if (!guild) {
            return await interaction.editReply(":x: AREDL server not found!");
        }

        const members = await guild.members.fetch().catch((e) => {
            Logger.error("Error fetching guild members: " + e);
            return undefined;
        });
        if (!members) {
            return await interaction.editReply(
                ":x: Guild member fetch failed, try again in a few minutes"
            );
        }

        // Exclude mutuals who don't have a discord connected or are voluntarily on the no ping list
        const filteredMutuals = mutuals
            .filter((mutual) => {
                if (!mutual.discord_id) return false;
                if (!members.has(mutual.discord_id)) return false;
                return (
                    db.noPingLists.findUnique({
                        where: { userId: mutual.discord_id, banned: false },
                        select: { userId: true },
                    }) !== null
                );
            })
            .slice(-3, undefined);

        if (filteredMutuals.length === 0) {
            return await interaction.editReply("No victors found!");
        }

        const lastMutuals =
            filteredMutuals.length === 1
                ? filteredMutuals
                : filteredMutuals.slice(-2);

        const pings = lastMutuals
            .toReversed()
            .map((mutual) => `<@${mutual.discord_id}>`)
            .join(" ");

        const reply = await interaction.channel.send({
            content: `${pings} Welcome to the **${level.name}** ${threadType.toLowerCase()} suggestion thread.${threadType === "Tags" ? (level.tags && level.tags.length > 0 ? `\n\n_Current tags: ${level.tags.join(", ")}_` : "") : level.description ? `\n\n_Current description: ${level.description}_` : ""}`,
            poll: {
                question: {
                    text: `Do you agree with the suggestion above?`,
                },
                answers: [
                    {
                        text: "Yes",
                        emoji: "✅",
                    },
                    {
                        text: "No",
                        emoji: "❌",
                    },
                ],
                allowMultiselect: false,
                duration: 24, // hours
            },
            // Do not ping the replier
            allowedMentions: {
                users: [
                    interaction.user.id,
                    ...lastMutuals.map((mutual) => mutual.discord_id!),
                ],
            },
        });

        reply.pin().catch((e) => {
            Logger.error(
                `/tag getvictors - Failed to pin the reply message (ID: ${reply.id}): ${e}`
            );
        });

        await db.suggestionThreads.create({
            data: {
                threadId: interaction.channelId,
                type: threadType,
                tieBreakerId:
                    filteredMutuals.length === 3
                        ? filteredMutuals[0]!.discord_id!
                        : null,
                levelId: level.id,
            },
        });

        return await interaction.editReply(
            `:white_check_mark: Thread created!${filteredMutuals.length === 3 ? ` Tiebreaker: <@${filteredMutuals[0]!.discord_id!}>` : ""}`
        );
    } else if (subcommand === "tag-tiebreaker") {
        const dbThread = await db.suggestionThreads.findUnique({
            where: { threadId: interaction.channelId },
        });
        if (!dbThread)
            return await interaction.editReply(
                "No suggestion thread found for this channel!"
            );

        if (!dbThread.tieBreakerId)
            return await interaction.editReply(
                "No tiebreaker has been assigned for this thread!"
            );

        const pollMessage = (
            await interaction.channel.messages.fetchPins()
        ).items.find(
            ({ message }) => message.author.id === interaction.client.user.id
        )?.message;
        if (!pollMessage)
            return await interaction.editReply(
                "No poll message found for this thread!"
            );

        const levelRes = await api.send<ExtendedLevel>(
            `/aredl/levels/${dbThread.levelId}`
        );
        if (levelRes.error) {
            Logger.error(`Error fetching level ${dbThread.levelId}!`);
            Logger.error(levelRes.data.message);
            return await interaction.editReply("Error fetching level!");
        }

        await pollMessage.reply({
            content: `<@${dbThread.tieBreakerId}> Welcome to the **${levelRes.data.name}** ${dbThread.type.toLowerCase()} suggestion thread. You have been selected as a tiebreaker. Do you agree with the suggestion above?`,
            allowedMentions: {
                users: [dbThread.tieBreakerId],
            },
        });

        const victorsRes = await api.send<MutualVictors>(
            `/aredl/records/mutual-victors?level_id=${dbThread.levelId}&other_level_id=${dbThread.levelId}`
        );
        if (victorsRes.error) {
            Logger.error(
                `Error fetching victors for level ${dbThread.levelId}!`
            );
            Logger.error(`${victorsRes.status}: ${victorsRes.data.message}`);
            return await interaction.editReply(
                ":white_check_mark: Mentioned tiebreaker, but there was an error finding a new tiebreaker!"
            );
        }

        const { mutuals } = victorsRes.data;

        const guild = interaction.client.guilds.cache.get(guildId);
        if (!guild) {
            return await interaction.editReply(":x: AREDL server not found!");
        }

        const members = await guild.members.fetch().catch((e) => {
            Logger.error("Error fetching guild members: " + e);
            return undefined;
        });
        if (!members) {
            return await interaction.editReply(
                ":white_check_mark: Mentioned tiebreaker, but there was an error fetching server members to find new tiebreaker"
            );
        }

        // Exclude mutuals who don't have a discord connected or are voluntarily on the no ping list
        const filteredMutuals = mutuals.filter((mutual) => {
            if (!mutual.discord_id) return false;
            if (!members.has(mutual.discord_id)) return false;
            return (
                db.noPingLists.findUnique({
                    where: { userId: mutual.discord_id, banned: false },
                    select: { userId: true },
                }) !== null
            );
        });

        if (filteredMutuals.length === 0) {
            return await interaction.editReply(
                ":white_check_mark Tiebreaker has been notified. No other victors eligible to be a tiebreaker found."
            );
        }

        const currentTiebreaker = filteredMutuals.findIndex((user) => user.discord_id === dbThread.tieBreakerId);
        const newTiebreaker = filteredMutuals[currentTiebreaker - 1];
        if (!newTiebreaker) {
            return await interaction.editReply(
                ":white_check_mark: Tiebreaker has been notified. No other victors eligible to be a tiebreaker found."
            );
        }

        await db.suggestionThreads.update({
            where: {
                threadId: interaction.channelId,
            },
            data: {
                tieBreakerId: newTiebreaker.discord_id!
            }
        })


        return await interaction.editReply(
            `:white_check_mark: Tiebreaker has been notified. New tiebreaker: <@${newTiebreaker.discord_id}>`
        );
    } else if (subcommand === "close-thread") {
        const dbThread = await db.suggestionThreads.findUnique({
            where: { threadId: interaction.channelId },
        });
        if (!dbThread)
            return await interaction.editReply(
                ":x: No suggestion thread found for this channel!"
            );

        const pollMessage = (
            await interaction.channel.messages.fetchPins()
        ).items.find(
            ({ message }) => message.author.id === interaction.client.user.id
        )?.message;

        if (pollMessage?.poll) {
            await pollMessage.poll.end();
        }

        await db.suggestionThreads
            .delete({
                where: { threadId: interaction.channelId },
            })
            .catch(async (e) => {
                Logger.error(
                    `Failed to delete the suggestion thread for channel (ID: ${interaction.channelId})`
                );
                Logger.error(e);
                return await interaction.editReply(
                    ":x: Failed to delete thread from bot"
                );
            });

        await interaction.channel
            .send(":white_check_mark: This suggestion thread has been closed.")
            .catch(async (e) => {
                Logger.error(
                    `Failed to send the closure message for channel (ID: ${interaction.channelId})`
                );
                Logger.error(e);
            });
        await interaction.channel
            .edit({
                archived: true,
                locked: true,
            })
            .catch(async (e) => {
                Logger.error(
                    `Failed to edit the suggestion thread for channel (ID: ${interaction.channelId})`
                );
                Logger.error(e);
                return await interaction.editReply(
                    ":x: Failed to close and lock thread!"
                );
            });
        await interaction.editReply(
            ":white_check_mark: Thread has been closed and locked."
        );
    }
};

import {
    MessageFlags,
    SeparatorSpacingSize,
    AttachmentBuilder,
    ApplicationCommandOptionType,
} from "discord.js";
import { api } from "../../../api";
import { opinionPermsRoleID, extremeGrinderRoleID, guildId } from "@/config";
import {
    AutocompleteCommand,
    ChatInputCommand,
    CommandData,
    Container,
    File,
    Separator,
    TextDisplay,
} from "commandkit";
import { Level } from "@/types/level";
import { MutualVictors } from "@/types/record";
import { db } from "@/db/prisma";
import { commandGuilds } from "@/util/commandGuilds";

const processLevelName = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9_]/g, "_");
};

export const metadata = commandGuilds();

export const command: CommandData = {
    name: "list",
    description: "Staff list management",
    options: [
        {
            name: "mutualvictors",
            description: "Finds all victors that have beaten both levels",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "level1",
                    description: "The name of the first level",
                    autocomplete: true,
                    required: true,
                    type: ApplicationCommandOptionType.String,
                },
                {
                    type: ApplicationCommandOptionType.String,
                    name: "level2",
                    description: "The name of the second level. Omitting will only show records done on level1.",
                    autocomplete: true,
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    name: "high-extremes",
                    description:
                        "Whether to only show players with 50+ extremes",
                    choices: [{ name: "Yes", value: 1 }],
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    name: "showinchannel",
                    description:
                        "Whether to send the message in this channel instead of only showing it to you",
                    choices: [{ name: "Yes", value: 1 }],
                },
            ],
        }
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
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "mutualvictors") {
        const ID1 = interaction.options.getString("level1", true);
        const ID2 = interaction.options.getString("level2");
        const highExtremes =
            interaction.options.getInteger("high-extremes") === 1;
        const ephemeral = interaction.options.getInteger("showinchannel") !== 1;

        const singularLevel = !ID2 || ID1 === ID2;

        const mutualsRes = await api.send<MutualVictors>(
            `/aredl/records/mutual-victors?level_id=${ID1}&other_level_id=${ID2 || ID1}&high_extremes=${highExtremes}`
        );

        if (mutualsRes.error) {
            const container = (
                <Container accentColor={0xff0000}>
                    <TextDisplay>## :x: Error!</TextDisplay>
                    <TextDisplay>
                        {`Error fetching mutual victors data!`}
                    </TextDisplay>
                </Container>
            );
            return await interaction.reply({
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [container],
            });
        }

        const { level, other_level, mutuals } = mutualsRes.data;

        const headerMessage = singularLevel
            ? `**[${level.name}](https://aredl.net/list/${ID1})**`
            : `**[${level.name}](https://aredl.net/list/${ID1})** vs **[${other_level.name}](https://aredl.net/list/${ID2})**`;

        if (mutuals.length == 0) {
            const container = (
                <Container accentColor={0xff6f00}>
                    <TextDisplay>{`##${!singularLevel ? " Mutual" : ""} Victors`}</TextDisplay>
                    <TextDisplay>
                        {`${headerMessage}${highExtremes ? " (High Extremes)" : ""}`}
                    </TextDisplay>
                    <TextDisplay>
                        {`*There are no mutual victors on ${singularLevel ? "this level" : "these levels"}.*`}
                    </TextDisplay>
                </Container>
            );
            return await interaction.reply({
                flags: ephemeral
                    ? [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral]
                    : [MessageFlags.IsComponentsV2],
                components: [container],
            });
        }

        const guild = interaction.client.guilds.cache.get(guildId);
        if (!guild) {
            const container = (
                <Container accentColor={0xff0000}>
                    <TextDisplay>## :x: Error</TextDisplay>
                    <TextDisplay>Error fetching guild data!</TextDisplay>
                </Container>
            );
            return await interaction.reply({
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [container],
                allowedMentions: { parse: [] },
            });
        }
        const members = await guild?.members.fetch().catch(() => undefined);
        if (!members) {
            const container = (
                <Container accentColor={0xff0000}>
                    <TextDisplay>## :x: Error</TextDisplay>
                    <TextDisplay>Error fetching guild members!</TextDisplay>
                </Container>
            );
            return await interaction.reply({
                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                components: [container],
                allowedMentions: { parse: [] },
            });
        }

        const victorsData = await Promise.all(
            mutuals.map(async (victor) => {
                const nplEntry = victor.discord_id
                    ? await db.noPingLists.findFirst({
                          where: { userId: victor.discord_id },
                      })
                    : null;

                const member = !victor.discord_id
                    ? undefined
                    : members.get(victor.discord_id);
                return {
                    username: `- ${victor.global_name}`,
                    discordTag: victor.discord_id
                        ? `<@${victor.discord_id}>`
                        : undefined,
                    inServer: member ? true : false,
                    hasPerms: member
                        ? member.roles.cache.hasAny(
                              opinionPermsRoleID,
                              extremeGrinderRoleID
                          )
                        : undefined,
                    noPingList: nplEntry,
                };
            })
        );

        const victors = victorsData
            .map((v) => ({
                username: v.username,
                discordTag: v.discordTag,
                inServer: v.inServer,
                hasPerms: v.hasPerms,
                noPingList: v.noPingList,
            }))
            .sort((a, b) => {
                const sortOrder = [
                    { type: "no_linked_discord", order: 1 },
                    { type: "not_in_server", order: 2 },
                    { type: "no_ping_list", order: 3 },
                    { type: "no_opinion_perms", order: 4 },
                    { type: "has_opinion_perms", order: 5 },
                ];
                const aType = a.discordTag
                    ? a.inServer
                        ? a.noPingList
                            ? "no_ping_list"
                            : a.hasPerms
                              ? "has_opinion_perms"
                              : "no_opinion_perms"
                        : "not_in_server"
                    : "no_linked_discord";
                const bType = b.discordTag
                    ? b.inServer
                        ? a.noPingList
                            ? "no_ping_list"
                            : b.hasPerms
                              ? "has_opinion_perms"
                              : "no_opinion_perms"
                        : "not_in_server"
                    : "no_linked_discord";

                const aOrder =
                    sortOrder.find((o) => o.type === aType)?.order ?? -1;
                const bOrder =
                    sortOrder.find((o) => o.type === bType)?.order ?? -1;

                if (aOrder !== bOrder) {
                    return bOrder - aOrder;
                }
                return a.username?.localeCompare(b.username || "");
            });

        const str = victors
            .map(
                (v) =>
                    `${v.username}${v.discordTag ? `\t${v.discordTag}` : ""}${v.discordTag === undefined ? "" : v.noPingList ? `\t(${v.noPingList.banned ? "Opinion Banned" : "No Ping List"})\t${v.noPingList.notes || ""}` : !v.hasPerms ? `\t${v.inServer ? "(No opinion perms)" : "(Not in server)"}` : ""}`
            )
            .join("\n");

        // Discord message character limit (also account for other text on embed, limit is 4000)
        const tooLong = str.length > 3850;

        const name = singularLevel
            ? `mutual_victors_${processLevelName(level.name)}.txt`
            : `mutual_victors_${processLevelName(level.name)}_${processLevelName(other_level.name)}.txt`;
        const attachment = new AttachmentBuilder(Buffer.from(str)).setName(
            name
        );
        const files = [attachment];

        const container = (
            <Container accentColor={0xff6f00}>
                <TextDisplay>{`##${!singularLevel ? " Mutual" : ""} Victors`}</TextDisplay>
                <TextDisplay>
                    {`${headerMessage}${highExtremes ? " (High Extremes)" : ""}`}
                </TextDisplay>
                <TextDisplay>
                    {`*There ${mutuals.length === 1 ? `is 1 ${!singularLevel ? `mutual ` : ""}victor` : `are ${mutuals.length} ${!singularLevel ? `mutual ` : ""}victors`} on ${singularLevel ? "this level" : "these levels"}.*`}
                </TextDisplay>
                <Separator spacing={SeparatorSpacingSize.Small} />
                {!tooLong && <TextDisplay>{str}</TextDisplay>}
                <File url={`attachment://${name}`} />
            </Container>
        );

        return await interaction.reply({
            flags: ephemeral
                ? [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral]
                : MessageFlags.IsComponentsV2,
            components: [container],
            files: files,
            allowedMentions: { parse: [] },
        });
    }
};

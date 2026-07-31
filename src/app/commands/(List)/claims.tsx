import { AutocompleteCommand, CommandData, ChatInputCommand } from "commandkit";
import {
    ContainerBuilder,
    TextDisplayBuilder,
    ApplicationCommandOptionType,
    SeparatorSpacingSize,
    MessageFlags,
} from "discord.js";
import { commandGuilds } from "@/util/commandGuilds.ts";
import { db } from "@/db/prisma.ts";
import {
    claimNotificationsExpirationMinutes,
    claimUntilNotificationWaitMinutes,
} from "@/config.ts";
import { createTask } from "@commandkit/tasks";

export const metadata = commandGuilds();

export const command: CommandData = {
    name: "claim",
    description: "Commands for changelog claims",
    options: [
        {
            name: "add",
            type: ApplicationCommandOptionType.Subcommand,
            description: "Add a claim to the claims list",
            options: [
                {
                    name: "level",
                    type: ApplicationCommandOptionType.String,
                    description: "The name of the level",
                    required: true,
                },
            ],
        },
        {
            name: "find",
            type: ApplicationCommandOptionType.Subcommand,
            description: "Lookup a claim on the claims list",
            options: [
                {
                    name: "level",
                    type: ApplicationCommandOptionType.String,
                    description: "The name of the level",
                    autocomplete: true,
                    required: true,
                },
            ],
        },
        {
            name: "edit",
            description: "Edit a claim on the claims list",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "claim",
                    type: ApplicationCommandOptionType.String,
                    description: "The claim to edit",
                    autocomplete: true,
                    required: true,
                },
                {
                    name: "new-level",
                    type: ApplicationCommandOptionType.String,
                    description: "The new name of the level.",
                },
                {
                    name: "mod",
                    type: ApplicationCommandOptionType.User,
                    description: "The mod to assign the claim to.",
                },
            ],
        },
        {
            name: "delete",
            description:
                "Remove a claim from the claims list.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "claim",
                    type: ApplicationCommandOptionType.String,
                    description: "The claim to delete.",
                    required: true,
                    autocomplete: true,
                },
            ],
        },
        {
            name: "check",
            description:
                "WARNING: Only use this command right before drafting a changelog.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "level",
                    type: ApplicationCommandOptionType.String,
                    description: "The name of the level.",
                    required: true,
                    autocomplete: true,
                },
            ],
        },
    ],
};

export const autocomplete: AutocompleteCommand = async ({ interaction }) => {
    const focused = interaction.options.getFocused(true);
    // in the context of all users
    if (focused.name === "level") {
        const dbClaims = await db.changelogClaims.findMany({
            where: {
                level: {
                    contains: focused.value,
                },
            },
            take: 25,
            orderBy: {
                createdAt: "desc",
            },
        });

        return await interaction.respond(
            dbClaims.map((claim) => ({
                name: claim.level,
                value: claim.id,
            }))
        );
    } else if (focused.name === "claim") {
        const isAdmin = interaction.memberPermissions?.has("Administrator");
        if (isAdmin) {
            const dbClaims = await db.changelogClaims.findMany({
                where: {
                    level: {
                        contains: focused.value,
                    },
                },
                take: 25,
                orderBy: {
                    createdAt: "desc",
                },
            });

            return await interaction.respond(
                dbClaims.map((claim) => ({
                    name: claim.level,
                    value: claim.id,
                }))
            );
        } else {
            const dbClaims = await db.changelogClaims.findMany({
                where: {
                    mod: interaction.user.id,
                    level: {
                        contains: focused.value,
                    },
                },
                take: 25,
            });

            return await interaction.respond(
                dbClaims.map((claim) => ({
                    name: claim.level,
                    value: claim.id,
                }))
            );
        }
    }
};

export const chatInput: ChatInputCommand = async ({ interaction }) => {
    const subcommand = interaction.options.getSubcommand();
    // adding claim
    if (subcommand === "add") {
        await interaction.deferReply();
        const level = interaction.options.getString("level", true);

        const userHasClaims = (await db.changelogClaims.count({
            where: { mod: interaction.user.id },
        })) > 0;
        
        if (userHasClaims) {
            return await interaction.editReply({
                content: ":x: You may only have one claim at a time!",
            });
        }

        await db.changelogClaims.create({
            data: {
                id: interaction.id,
                level,
                mod: interaction.user.id,
            },
        });

        return await interaction.editReply({
            components: [
                new ContainerBuilder()
                    .setAccentColor(0x00ff55)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `:white_check_mark: Claimed **${level}**!`
                        )
                    ),
            ],
            flags: [MessageFlags.IsComponentsV2],
        });
    } else if (subcommand === "find") {
        await interaction.deferReply();
        const claimId = interaction.options.getString("level", true);
        const claim = await db.changelogClaims.findUnique({
            where: { id: claimId },
        });
        if (!claim) {
            return await interaction.editReply({
                content: ":x: Claim not found.",
            });
        }
        return await interaction.editReply({
            components: [
                new ContainerBuilder()
                    .setAccentColor(0xff6f00)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## ${claim.level}`
                        ),
                        new TextDisplayBuilder().setContent(
                            `:white_check_mark: Claimed by <@${claim.mod}>`
                        )
                    )
                    .addSeparatorComponents((sep) =>
                        sep.setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `-# Claimed on <t:${Math.floor(claim.createdAt.getTime() / 1000)}:f>`
                        )
                    ),
            ],
            flags: [MessageFlags.IsComponentsV2],
            allowedMentions: { parse: [] },
        });
    } else if (subcommand === "edit") {
        await interaction.deferReply();
        const claimId = interaction.options.getString("claim", true);
        const mod = interaction.options.getUser("mod");
        const newName = interaction.options.getString("new-level");

        if (mod) {
            const userHasClaims = (await db.changelogClaims.count({
                where: { mod: mod.id },
            })) > 0;
            
            if (userHasClaims) {
                return await interaction.editReply({
                    content: ":x: The new user already has a claim!",
                });
            }
        }

        await db.changelogClaims.update({
            where: { id: claimId },
            data: {
                mod: mod?.id ?? undefined,
                level: newName ?? undefined,
            },
        });

        await interaction.editReply(":white_check_mark: Updated claim!");
    } else if (subcommand === "delete") {
        await interaction.deferReply();
        const claimId = interaction.options.getString("claim", true);

        await db.changelogClaims.delete({
            where: { id: claimId },
        });

        await interaction.editReply(":white_check_mark: Deleted claim!");
    } else if (subcommand === "check") {
        // do not defer
        const claimId = interaction.options.getString("level", true);
        const claim = await db.changelogClaims.findUnique({
            where: { id: claimId },
        });
        if (!claim) {
            return await interaction.reply({
                content: `:x: No claim for level ${claimId}!`,
            });
        }

        await interaction.reply({
            components: [
                new ContainerBuilder()
                    .setAccentColor(0xff6f00)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## Claim: ${claim.level}`
                        ),
                        new TextDisplayBuilder().setContent(
                            `<@${claim.mod}>, the changelog for ${claim.level} is ready to be sent! This claim will expire in ${claimNotificationsExpirationMinutes + (claimUntilNotificationWaitMinutes ?? 0)} minutes.`
                        )
                    ),
            ],
            flags: [MessageFlags.IsComponentsV2],
        });

        await createTask({
            name: "claim-notify",
            data: claim,
            schedule: new Date(
                Date.now() +
                    (claimUntilNotificationWaitMinutes ?? 0) * 60 * 1000
            ),
        });

        return;
    }
};

import {
    SeparatorSpacingSize,
    MessageFlags,
    ApplicationCommandOptionType,
} from "discord.js";
import { maxPoints } from "@/../config.json";
import {
    CommandData,
    ChatInputCommand,
    Container,
    TextDisplay,
    Separator,
} from "commandkit";
import { db } from "@/db/prisma";
import { commandGuilds } from "@/util/commandGuilds";

export const metadata = commandGuilds();

export const command: CommandData = {
    name: "pointsadmin",
    description: "Commands for admins to manage the staff points system",
    options: [
        {
            name: "all",
            description: "View all staff members' points values",
            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: "set",
            description: "Set the point values of a staff member",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "user",
                    description: "The user to set the points value for",
                    type: ApplicationCommandOptionType.User,
                    required: true,
                },
                {
                    name: "points",
                    description: "The points value to set",
                    type: ApplicationCommandOptionType.Number,
                    required: true,
                    min_value: 0,
                    max_value: 30,
                },
            ],
        },
        {
            name: "transfer",
            description:
                "Transfer a staff member's points a different staff member",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "transfer-from",
                    description: "The user whose points will be transfered",
                    type: ApplicationCommandOptionType.User,
                    required: true,
                },
                {
                    name: "transfer-to",
                    description: "The user to transfer the points to",
                    type: ApplicationCommandOptionType.User,
                    required: true,
                },
                {
                    name: "overwrite",
                    description:
                        "Whether to overwrite the recipient's points instead of adding to them",
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    choices: [
                        { name: "No", value: 0 },
                        { name: "Yes", value: 1 },
                    ],
                },
            ],
        },
        {
            name: "clear",
            description: "Clear a staff member's points",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "user",
                    description: "The user to clear the points for",
                    type: ApplicationCommandOptionType.User,
                    required: true,
                },
            ],
        },
        {
            name: "find",
            description: "Find a staff member's points",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "user",
                    description: "The user to find the points for",
                    type: ApplicationCommandOptionType.User,
                    required: true,
                },
            ],
        },
    ],
};

export const chatInput: ChatInputCommand = async ({ interaction }) => {
    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (subcommand === "all") {
        const allStats = await db.staff_points.findMany({
            orderBy: { points: "desc" },
        });

        const container = (
            <Container accentColor={0x75c8ff}>
                <TextDisplay>## Staff Points</TextDisplay>
                <Separator spacing={SeparatorSpacingSize.Small} />
                <TextDisplay>
                    {allStats.length == 0
                        ? "No data."
                        : allStats
                              .map(
                                  (stat) =>
                                      `<@${stat.user}> - _\`${Math.round(stat.points * 100) / 100}\` points_`
                              )
                              .join("\n")}
                </TextDisplay>
            </Container>
        );

        return await interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    } else if (subcommand === "find") {
        const user = interaction.options.getUser("user", true);
        const points = await db.staff_points.upsert({
            create: {
                user: user.id,
            },
            where: {
                user: user.id,
            },
            update: {},
        });

        return await interaction.editReply(
            `<@${user.id}> has ${Math.round(points.points * 100) / 100} points.`
        );
    } else if (subcommand === "set") {
        const user = interaction.options.getUser("user", true);
        const points = interaction.options.getNumber("points", true);
        await db.staff_points.upsert({
            create: { user: user.id, points: points },
            update: { user: user.id, points: points },
            where: { user: user.id },
        });

        return await interaction.editReply(
            `:white_check_mark: Set points for <@${user.id}> to ${Math.round(points * 100) / 100}.`
        );
    } else if (subcommand === "transfer") {
        const transferFrom = interaction.options.getUser("transfer-from", true);
        const transferTo = interaction.options.getUser("transfer-to", true);
        const overwrite = interaction.options.getInteger("overwrite") === 1;
        const transferFromPoints = await db.staff_points.findUnique({
            where: { user: transferFrom.id },
        });
        if (!transferFromPoints) {
            return await interaction.editReply(
                `:x: <@${transferFrom.id}> does not have any points.`
            );
        }

        const transferToPoints = await db.staff_points.upsert({
            create: { user: transferTo.id },
            update: {},
            where: { user: transferTo.id },
        });

        const newPoints = Math.min(
            overwrite
                ? transferFromPoints.points
                : transferToPoints.points + transferFromPoints.points,
            maxPoints
        );

        await db.staff_points.upsert({
            create: { user: transferTo.id, points: newPoints },
            update: { points: newPoints },
            where: { user: transferTo.id },
        });

        await db.staff_points.delete({ where: { user: transferFrom.id } });

        return await interaction.editReply(
            `:white_check_mark: Transferred points from <@${transferFrom.id}> to <@${transferTo.id}>. <@${transferTo.id}> now has ${Math.round(newPoints * 100) / 100} points.`
        );
    } else if (subcommand === "clear") {
        const user = interaction.options.getUser("user", true);
        const points = !!(await db.staff_points
            .delete({
                where: { user: user.id },
            })
            .catch(() => false));

        if (!points) {
            return await interaction.editReply(
                `:x: <@${user.id}> does not have any points.`
            );
        }
        return await interaction.editReply(
            `:white_check_mark: Cleared points for <@${user.id}>.`
        );
    }
};

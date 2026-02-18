import {
    EmbedBuilder,
    AttachmentBuilder,
    ApplicationCommandOptionType,
} from "discord.js";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { updateInfoMessage } from "@/app/tasks/infoMessageUpdate";
import { ChatInputCommand, CommandData } from "commandkit";
import { dailyStatsTable, infoMessagesTable } from "@/db/schema";
import { db } from "@/app";
import { asc, eq, gte } from "drizzle-orm";
import { commandGuilds } from "@/util/commandGuilds";

export const metadata = commandGuilds();

export const command: CommandData = {
    name: "stats",
    description: "Statistics about the server",
    options: [
        {
            name: "servertraffic",
            description: "Shows info about server members traffic",
            type: ApplicationCommandOptionType.Subcommand, // Subcommand
        },
        {
            name: "send-list-stats-message",
            description: "Send the initial stats info message (placeholder)",
            type: ApplicationCommandOptionType.Subcommand, // Subcommand
        },
        {
            name: "send-list-stats-message-public",
            description:
                "Send the initial stats info message (placeholder) (public version)",
            type: ApplicationCommandOptionType.Subcommand, // Subcommand
        },
    ],
};

export const chatInput: ChatInputCommand = async ({ interaction }) => {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();

    if (sub === "servertraffic") {
        const minDate = new Date(
            new Date().getTime() - 30 * 24 * 60 * 60 * 1000
        );

        const statsData = await db
            .select()
            .from(dailyStatsTable)
            .where(gte(dailyStatsTable.date, minDate))
            .orderBy(asc(dailyStatsTable.date));

        const labels = [];
        const datasJoined = [];
        const datasLeft = [];

        for (let i = 0; i < Math.min(30, statsData.length); i++) {
            labels.push(statsData[i]?.date);
            datasJoined.push(statsData[i]?.nbMembersJoined ?? 0);
            datasLeft.push(-(statsData[i]?.nbMembersLeft ?? 0));
        }

        const membersRenderer = new ChartJSNodeCanvas({
            width: 1600,
            height: 600,
            backgroundColour: "white",
        });
        const membersImage = await membersRenderer.renderToBuffer({
            type: "bar",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "Members arrivals",
                        backgroundColor: "blue",
                        data: datasJoined,
                    },
                    {
                        label: "Members leaves",
                        backgroundColor: "gray",
                        data: datasLeft,
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: "top" },
                    title: {
                        display: true,
                        text: "Members traffic over time",
                    },
                },
            },
        });

        const membersAttachment = new AttachmentBuilder(membersImage, {
            name: "membersgraph.png",
        });

        const totalJoined = datasJoined.reduce((a, b) => a + b, 0);
        const totalLeft = -datasLeft.reduce((a, b) => a + b, 0);

        const membersStatsEmbed = new EmbedBuilder()
            .setColor(0xffbf00)
            .setTitle("Members traffic")
            .addFields(
                { name: "Past 30 days :", value: " " },
                {
                    name: "Total arrivals:",
                    value: `${totalJoined}`,
                    inline: true,
                },
                {
                    name: "Total leaves:",
                    value: `${totalLeft}`,
                    inline: true,
                }
            )
            .setImage("attachment://membersgraph.png");

        return await interaction.editReply({
            embeds: [membersStatsEmbed],
            files: [membersAttachment],
        });
    }

    if (sub === "send-list-stats-message") {
        const existing = await db
            .select()
            .from(infoMessagesTable)
            .where(eq(infoMessagesTable.name, "list_stats"))
            .limit(1)
            .get();
        if (existing) {
            return interaction.editReply(
                `A \`list_stats\` message already exists. Delete it from the DB if you want to create a new one.`
            );
        }

        if (!interaction.channel?.isSendable()) {
            return interaction.editReply({
                content: ":x: Invalid channel",
            });
        }

        const msg = await interaction.channel.send({
            content: `List stats panel will appear here soon…`,
        });

        await db.insert(infoMessagesTable).values({
            name: "list_stats",
            guild: interaction.guild?.id ?? "1",
            channel: interaction.channel.id,
            discordid: msg.id,
        });

        updateInfoMessage(interaction.client);

        return interaction.editReply(
            `\`list_stats\` message sent and stored in the database.`
        );
    }

    if (sub === "send-list-stats-message-public") {
        const existing = await db
            .select()
            .from(infoMessagesTable)
            .where(eq(infoMessagesTable.name, "list_stats_public"))
            .limit(1)
            .get();
        if (existing) {
            return interaction.editReply(
                `A \`list_stats_public\` message already exists. Delete it from the DB if you want to create a new one.`
            );
        }

        if (!interaction.channel?.isSendable()) {
            return interaction.editReply({
                content: ":x: Invalid channel",
            });
        }

        const msg = await interaction.channel.send({
            content: `List stats panel will appear here soon…`,
        });

        await db.insert(infoMessagesTable).values({
            name: "list_stats_public",
            guild: interaction.guild?.id ?? "1",
            channel: interaction.channel.id,
            discordid: msg.id,
        });

        updateInfoMessage(interaction.client);

        return interaction.editReply(
            `\`list_stats_public\` message sent and stored in the database.`
        );
    }
};

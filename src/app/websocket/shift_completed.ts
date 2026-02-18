import {
    guildId,
    staffGuildId,
    completedShiftsID,
    enableSeparateStaffServer,
    pointsOnShiftComplete,
    maxPoints,
    defaultPoints,
} from "@/../config.json";
import { api } from "@/api";
import { WebsocketFinishedShift } from "@/types/shift";
import { User } from "@/types/user";
import { Logger } from "commandkit";
import { Client, EmbedBuilder } from "discord.js";
import { eq } from "drizzle-orm";
import { staffPointsTable } from "@/db/schema";
import { db } from "@/app";

export default {
    notification_type: "SHIFT_COMPLETED",
    handle: async (client: Client, data: WebsocketFinishedShift) => {
        const reviewerResponse = await api.send<User>(
            `/users/${data.user_id}`,
            "GET"
        );
        if (reviewerResponse.error) {
            Logger.error(
                `Error fetching reviewer data: ${reviewerResponse.data.message}`
            );
            return;
        }
        const reviewer = reviewerResponse.data;

        let newPoints = null;
        if (reviewer.discord_id) {
            const pointsResult = await db
                .select()
                .from(staffPointsTable)
                .where(eq(staffPointsTable.user, reviewer.discord_id))
                .get();
            const points =
                pointsResult ??
                (await db
                    .insert(staffPointsTable)
                    .values({
                        user: reviewer.discord_id,
                        points: defaultPoints,
                    })
                    .onConflictDoNothing()
                    .returning()
                    .get());

            newPoints = Math.min(
                points.points + pointsOnShiftComplete,
                maxPoints
            );
            await db
                .update(staffPointsTable)
                .set({
                    points: newPoints,
                })
                .where(eq(staffPointsTable.user, reviewer.discord_id));
        } else {
            Logger.warn(
                `Shift completed - no Discord ID found for ${reviewerResponse.data.global_name}`
            );
        }

        // unix epochs
        const startDate = Math.floor(new Date(data.start_at).getTime() / 1000);
        const endDate = Math.floor(new Date(data.end_at).getTime() / 1000);

        const archiveEmbed = new EmbedBuilder()
            .setColor(0x8fce00)
            .setTitle(`:white_check_mark: Shift complete!`)
            .setDescription(
                `${reviewerResponse.data.discord_id ? `<@${reviewerResponse.data.discord_id}>` : reviewerResponse.data.global_name}`
            )
            .addFields([
                {
                    name: "Count",
                    value: `${data.completed_count}/${data.target_count}`,
                    inline: true,
                },
                {
                    name: "Time",
                    value: `<t:${startDate}> - <t:${endDate}>`,
                    inline: true,
                },
                {
                    name: "Points",
                    value: `${newPoints ? Math.round(newPoints * 100) / 100 : "N/A"}`,
                    inline: true,
                },
            ])
            .setTimestamp();

        const guild = await client.guilds.cache.get(guildId);
        const staffGuild = enableSeparateStaffServer
            ? await client.guilds.cache.get(staffGuildId)
            : guild;

        const channel = await staffGuild?.channels.cache.get(completedShiftsID);
        if (channel && channel.isSendable()) {
            channel.send({ embeds: [archiveEmbed] });
        }
        return;
    },
};

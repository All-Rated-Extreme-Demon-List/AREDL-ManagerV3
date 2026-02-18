import {
    enableShiftReminders,
    shiftReminderExpireThreshold,
    sendShiftRemindersSchedule,
} from "@/../config.json";
import { api } from "@/api.js";
import { EmbedBuilder } from "discord.js";
import { Logger } from "commandkit";
import { task } from "@commandkit/tasks";
import { Shift } from "@/types/shift";
import { PaginatedResponse } from "@/types/api";
import { db } from "@/app";
import { User } from "@/types/user";
import { settingsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export default task({
    name: "sendShiftReminders",
    schedule: enableShiftReminders ? sendShiftRemindersSchedule : undefined,
    async execute({ client }) {
        Logger.info("Scheduled - Sending shift reminders");
        const shiftsResponse = await api.send<PaginatedResponse<Shift>>(
            "/shifts",
            "GET",
            { per_page: 999, status: "Running" },
            undefined
        );

        if (shiftsResponse.error) {
            Logger.error(
                `Scheduled - Error getting shifts: status ${shiftsResponse.status}\n${shiftsResponse.data.message}`
            );
            return;
        }

        const shifts = shiftsResponse.data.data;
        const now = new Date();

        for (const shift of shifts) {
            const endDate = new Date(shift.end_at);
            const timeUntilEnd = endDate.getTime() - now.getTime();
            const hours = shiftReminderExpireThreshold * 60 * 60 * 1000;
            if (timeUntilEnd <= hours && timeUntilEnd > 0) {
                const userResponse = await api.send<User>(
                    `/users/${shift.user.id}`,
                    "GET"
                );
                if (userResponse.error) {
                    Logger.error(
                        `Error fetching user data: ${userResponse.data.message}`
                    );
                    return;
                }
                if (!userResponse.data.discord_id) {
                    Logger.error("Error fetching user data: no discord id");
                    return;
                }

                const settings = await db
                    .select()
                    .from(settingsTable)
                    .where(eq(settingsTable.user, userResponse.data.discord_id))
                    .limit(1)
                    .get();
                if (settings && settings.shiftPings === false) {
                    continue;
                }
                // unix epochs
                const endSeconds = Math.floor(endDate.getTime() / 1000);

                const embed = new EmbedBuilder()
                    .setColor(0xf59842)
                    .setTitle(":warning: Shift Reminder")
                    .setDescription(
                        `Your shift will expire <t:${endSeconds}:R>!`
                    )
                    .setTimestamp();

                client.users.cache
                    .get(userResponse.data.discord_id)
                    ?.send({ embeds: [embed] });
            }
        }
    },
});

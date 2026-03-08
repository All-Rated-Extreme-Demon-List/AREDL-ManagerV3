import {
    enableShiftReminders,
    shiftReminderExpireThreshold,
    sendShiftRemindersSchedule,
} from "@/config";
import { api } from "@/api.js";
import { EmbedBuilder } from "discord.js";
import { Logger } from "commandkit";
import { task } from "@commandkit/tasks";
import { Shift } from "@/types/shift";
import { PaginatedResponse } from "@/types/api";
import { db } from "@/db/prisma";
import { User } from "@/types/user";

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

                const settings = await db.settings.findUnique({
                    where: { user: userResponse.data.discord_id },
                });
                if (settings?.shiftPings === false) {
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

                const user = client.users.cache
                    .get(userResponse.data.discord_id);
                if (!user || !user.dmChannel?.isSendable()) {
                    Logger.error(
                        `Could not send shift reminder to user ${userResponse.data.discord_id} - no DM channel`
                    );
                    continue;
                }
                await user.dmChannel.send({ embeds: [embed] });
            }
        }
    },
});

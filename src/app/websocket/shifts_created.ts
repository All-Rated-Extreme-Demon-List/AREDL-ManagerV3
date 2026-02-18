import {
    guildId,
    staffGuildId,
    enableSeparateStaffServer,
    shiftsStartedID,
} from "@/../config.json";
import { WebsocketShift } from "@/types/shift";
import { Logger } from "commandkit";
import { Client } from "discord.js";
import { createTask } from "@commandkit/tasks";

export default {
    notification_type: "SHIFTS_CREATED",
    handle: async (client: Client, data: WebsocketShift[]) => {
        if (!shiftsStartedID) return;

        const guild = await client.guilds.fetch(guildId);
        const staffGuild = enableSeparateStaffServer
            ? await client.guilds.fetch(staffGuildId)
            : guild;
        const channel = staffGuild.channels.cache.get(shiftsStartedID);
        if (!channel || !channel.isSendable()) {
            Logger.error("Shifts started channel not found or not sendable.");
        }
        for (const shift of data) {
            try {
                await createTask({
                    name: `send-shift-notif`,
                    data: shift,
                    schedule: new Date(shift.start_at),
                });
            } catch (err) {
                Logger.error(
                    "Failed to create shift notification in database:"
                );
                Logger.error(err);
            }
        }
    },
};

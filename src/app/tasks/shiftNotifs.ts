import { EmbedBuilder, TextChannel } from "discord.js";
import {
    shiftsStartedID,
    guildId,
    staffGuildId,
    enableSeparateStaffServer,
} from "@/../config.json";
import { Logger } from "commandkit";
import { User } from "@/types/user";
import { api } from "@/api";
import { db } from "@/app";
import { settingsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { task } from "@commandkit/tasks";
import { WebsocketShift } from "@/types/shift";

export const sendShiftNotif = async (
    channel: TextChannel,
    shift: WebsocketShift
) => {
    try {
        const reviewerResponse = await api.send<User>(
            `/users/${shift.user_id}`,
            "GET"
        );
        if (reviewerResponse.error) {
            Logger.error(
                `Shift Notification - Error fetching reviewer ${shift.user_id}: ${reviewerResponse.data.message}`
            );
            return 1;
        }
        let pingStr;
        if (reviewerResponse.data.discord_id) {
            const settings = await db
                .select()
                .from(settingsTable)
                .where(eq(settingsTable.user, reviewerResponse.data.discord_id))
                .limit(1)
                .get();
            if (!settings || settings.shiftPings === true) {
                pingStr = `<@${reviewerResponse.data.discord_id}>`;
            }
        }
        // Get unix timestamps for the Discord embed
        const startDate = Math.floor(new Date(shift.start_at).getTime() / 1000);
        const endDate = Math.floor(new Date(shift.end_at).getTime() / 1000);

        const archiveEmbed = new EmbedBuilder()
            .setColor(0x8fce00)
            .setTitle(`:white_check_mark: Shift started!`)
            .setDescription(
                `${reviewerResponse.data.discord_id ? `<@${reviewerResponse.data.discord_id}>` : reviewerResponse.data.global_name}`
            )
            .addFields([
                { name: "Count", value: `${shift.target_count} records` },
                { name: "Starts at", value: `<t:${startDate}>` },
                { name: "Ends at", value: `<t:${endDate}>, <t:${endDate}:R>` },
            ])
            .setTimestamp();

        await channel.send({ content: pingStr, embeds: [archiveEmbed] });
        Logger.info(
            `Successfully sent shift notification for ${shift.user_id}`
        );
        return 0;
    } catch (e) {
        Logger.error(
            `Shift Notification - Error sending shift notification: ${e}`
        );
        Logger.error(shift);
        return 1;
    }
};

// Register as a task so that notifications can wait until their start time before sending.
export default task({
    name: "send-shift-notif",
    async prepare() {
        return !!shiftsStartedID;
    },
    async execute({ data: shift, client }) {
        const guild = await client.guilds.fetch(guildId);
        const staffGuild = enableSeparateStaffServer
            ? await client.guilds.fetch(staffGuildId)
            : guild;
        const channel = staffGuild.channels.cache.get(shiftsStartedID);
        if (
            !channel ||
            !channel.isSendable() ||
            !(channel instanceof TextChannel)
        ) {
            Logger.error("Shifts started channel not found or not sendable.");
            return;
        }
        await sendShiftNotif(channel, shift as WebsocketShift).catch((e) => {
            Logger.error(e);
        });
    },
});

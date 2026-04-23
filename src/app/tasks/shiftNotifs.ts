import { EmbedBuilder, TextChannel } from "discord.js";
import {
    shiftsStartedID,
    guildId,
    staffGuildId,
    enableSeparateStaffServer,
    shadowStaffServerID,
    shadowStaffShiftsChannelID,
} from "@/config";
import { Logger } from "commandkit";
import { UserResolved } from "@/types/user";
import { api } from "@/api";
import { db } from "@/db/prisma";
import { task } from "@commandkit/tasks";
import { WebsocketShift } from "@/types/shift";
import { isHiddenReviewer } from "@/util/reviewersAlert";

export const sendShiftNotif = async (shift: WebsocketShift) => {
    try {
        const { default: client } = await import("@/app");
        const reviewerResponse = await api.send<UserResolved>(
            `/users/${shift.user_id}`,
            "GET"
        );
        if (reviewerResponse.error) {
            Logger.error(
                `Shift Notification - Error fetching reviewer ${shift.user_id}: ${reviewerResponse.data.message}`
            );
            return 1;
        }
        
        const hiddenReviewer = isHiddenReviewer(reviewerResponse.data);
        if (
            hiddenReviewer === true &&
            (!shadowStaffServerID || !shadowStaffShiftsChannelID)
        ) {
            return;
        }
        const guild = await client.guilds.fetch(guildId);
        const staffGuild = hiddenReviewer === true
            ? await client.guilds.fetch(shadowStaffServerID)
            : enableSeparateStaffServer
              ? await client.guilds.fetch(staffGuildId)
              : guild;
        const channel = staffGuild.channels.cache.get(
            hiddenReviewer ? shadowStaffShiftsChannelID : shiftsStartedID
        );
        if (
            !channel ||
            !channel.isSendable() ||
            !(channel instanceof TextChannel)
        ) {
            Logger.error("Shifts started channel not found or not sendable.");
            return;
        }

        let pingStr;
        if (reviewerResponse.data.discord_id) {
            const settings = await db.settings.findUnique({
                where: { user: reviewerResponse.data.discord_id },
            });
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

export default task({
    name: "send-shift-notif",
    async prepare() {
        return !!shiftsStartedID;
    },
    async execute({ data: shift }) {
        await sendShiftNotif(shift as WebsocketShift).catch((e) => {
            Logger.error(e);
        });
    },
});

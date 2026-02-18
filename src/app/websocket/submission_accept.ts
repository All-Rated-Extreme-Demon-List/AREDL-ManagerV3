import { UnresolvedSubmission } from "@/types/record";
import { Client } from "discord.js";
import {
    guildId,
    staffGuildId,
    platArchiveRecordsID,
    classicArchiveRecordsID,
    platRecordsID,
    classicRecordsID,
    ucRecordsID,
    enableSeparateStaffServer,
} from "@/../config.json";
import { api } from "@/api";
import { EmbedBuilder } from "discord.js";
import { getCompletionTime } from "@/util/completionTime";
import { Logger } from "commandkit";
import { ExtendedLevel } from "@/types/level";
import { User } from "@/types/user";
import { db } from "@/app";
import { ucThreadsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export default {
    notification_type: "SUBMISSION_ACCEPTED",
    handle: async (client: Client, data: UnresolvedSubmission) => {
        const isPlat =
            "completion_time" in data && data.completion_time !== null;

        const [levelResponse, submitterResponse, reviewerResponse] =
            await Promise.all([
                api.send<ExtendedLevel>(
                    `${isPlat ? "/arepl" : "/aredl"}/levels/${data.level_id}`,
                    "GET"
                ),
                api.send<User>(`/users/${data.submitted_by}`, "GET"),
                api.send<User>(`/users/${data.reviewer_id}`, "GET"),
            ]);

        if (levelResponse.error) {
            Logger.error(
                `Error fetching level data: ${levelResponse.data.message}`
            );
            return;
        }
        if (submitterResponse.error) {
            Logger.error(
                `Error fetching user data: ${submitterResponse.data.message}`
            );
            return;
        }
        if (reviewerResponse.error) {
            Logger.error(
                `Error fetching reviewer data: ${reviewerResponse.data.message}`
            );
            return;
        }

        const archiveEmbed = new EmbedBuilder()
            .setColor(0x8fce00)
            .setTitle(
                `:white_check_mark: [#${levelResponse.data.position}] ${levelResponse.data.name}`
            )
            .addFields([
                {
                    name: "Record submitted by",
                    value: `<@${submitterResponse.data.discord_id}>`,
                },
                {
                    name: "Record accepted by",
                    value: `<@${reviewerResponse.data.discord_id}>`,
                },
                {
                    name: "Device",
                    value: data.mobile ? "Mobile" : "PC",
                    inline: true,
                },
                {
                    name: "LDM",
                    value:
                        !data.ldm_id || data.ldm_id === 0
                            ? "None"
                            : String(data.ldm_id),
                    inline: true,
                },
                ...(data.completion_time
                    ? [
                          {
                              name: "Completion time",
                              value: getCompletionTime(data.completion_time),
                          },
                      ]
                    : []),
                { name: "Completion link", value: data.video_url },
                { name: "Raw link", value: data.raw_url || "None" },
                { name: "Mod menu", value: data.mod_menu || "None" },
                {
                    name: "User notes",
                    value:
                        data.user_notes && data.user_notes !== ""
                            ? data.user_notes
                            : "None",
                },
                {
                    name: "Reviewer notes",
                    value:
                        data.reviewer_notes && data.reviewer_notes !== ""
                            ? data.reviewer_notes
                            : "None",
                },
                {
                    name: "Private Reviewer Notes",
                    value:
                        data.private_reviewer_notes &&
                        data.private_reviewer_notes !== ""
                            ? data.private_reviewer_notes
                            : "None",
                },
                {
                    name: "Link",
                    value: `[Open submission](https://aredl.net/staff/submissions/${data.id}?list=${isPlat ? "platformer" : "classic"})`,
                },
            ])
            .setTimestamp();

        // Create embed to send in public channel
        const publicEmbed = new EmbedBuilder()
            .setColor(0x8fce00)
            .setTitle(
                `:white_check_mark: [#${levelResponse.data.position}] ${levelResponse.data.name}`
            )
            .setDescription(
                "Accepted\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800"
            )
            .addFields([
                {
                    name: "Record holder",
                    value: `${submitterResponse.data.global_name}`,
                    inline: true,
                },
                {
                    name: "Device",
                    value: `${data.mobile ? "Mobile" : "PC"}`,
                    inline: true,
                },
                ...(data?.completion_time
                    ? [
                          {
                              name: "Completion time",
                              value: getCompletionTime(data.completion_time),
                          },
                      ]
                    : []),
                ...(data?.reviewer_notes && data.reviewer_notes !== ""
                    ? [{ name: "Notes", value: data.reviewer_notes }]
                    : []),
            ]);

        // Send all messages simultaneously
        const guild = await client.guilds.fetch(guildId);
        const staffGuild = enableSeparateStaffServer
            ? await client.guilds.fetch(staffGuildId)
            : guild;

        const staffChannel = staffGuild.channels.cache.get(
            isPlat ? platArchiveRecordsID : classicArchiveRecordsID
        );

        const publicChannel = guild.channels.cache.get(
            isPlat ? platRecordsID : classicRecordsID
        );

        if (staffChannel && staffChannel.isSendable()) {
            staffChannel.send({ embeds: [archiveEmbed] });
        }

        if (publicChannel && publicChannel.isSendable()) {
            publicChannel.send({ embeds: [publicEmbed] });
            publicChannel.send({ content: `${data.video_url}` });
        }

        // Update UC thread if exists

        const ucThread = await db
            .select()
            .from(ucThreadsTable)
            .where(eq(ucThreadsTable.submission_id, data.id))
            .limit(1)
            .get();
        if (!ucThread) return;

        try {
            const ucChannel = await staffGuild.channels.fetch(ucRecordsID);
            if (!ucChannel || !ucChannel.isTextBased()) {
                Logger.error("UC channel not found or not valid.");
                return;
            }
            const firstMessage = await ucChannel.messages.fetch(
                ucThread.message_id
            );
            await firstMessage.reactions.removeAll();
            await firstMessage.react("✅");

            const thread = await staffGuild.channels.fetch(ucThread.thread_id);
            if (!thread || !thread.isTextBased()) {
                Logger.error("UC thread not found or not valid.");
                return;
            }
            const threadName = `[Accepted] #${levelResponse.data.position} ${levelResponse.data.name} - ${submitterResponse.data.global_name}`;
            await thread.setName(
                threadName.length > 100
                    ? `${threadName.slice(0, 97)}...`
                    : threadName
            );

            await thread.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x8fce00)
                        .setTitle(":white_check_mark: Accepted")
                        .addFields([
                            {
                                name: "Accepted by",
                                value: `<@${reviewerResponse.data.discord_id}>`,
                            },
                            {
                                name: "Reviewer notes",
                                value:
                                    data.reviewer_notes &&
                                    data.reviewer_notes !== ""
                                        ? data.reviewer_notes
                                        : "None",
                                inline: true,
                            },
                            {
                                name: "Private reviewer notes",
                                value:
                                    data.private_reviewer_notes &&
                                    data.private_reviewer_notes !== ""
                                        ? data.private_reviewer_notes
                                        : "None",
                                inline: true,
                            },
                        ])
                        .setTimestamp(),
                ],
            });
        } catch (err) {
            Logger.error("Failed to update UC thread after accept:");
            Logger.error(err);
        }
    },
};

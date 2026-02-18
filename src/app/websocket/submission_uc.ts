import {
    guildId,
    staffGuildId,
    platArchiveRecordsID,
    classicArchiveRecordsID,
    ucRecordsID,
    enableSeparateStaffServer,
} from "@/../config.json";
import { api } from "@/api";
import { Client, EmbedBuilder } from "discord.js";
import { getCompletionTime } from "@/util/completionTime";
import { UnresolvedSubmission } from "@/types/record";
import { Logger } from "commandkit";
import { ExtendedLevel } from "@/types/level";
import { User } from "@/types/user";
import { db } from "@/app";
import { ucThreadsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export default {
    notification_type: "SUBMISSION_UNDER_CONSIDERATION",
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
                data.reviewer_id
                    ? api.send<User>(`/users/${data.reviewer_id}`, "GET")
                    : Promise.resolve({ error: false, data: null }),
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
        if (reviewerResponse?.error) {
            Logger.error(
                `Error fetching reviewer data: ${reviewerResponse.data?.message}`
            );
            return;
        }

        const level = levelResponse.data;
        const submitter = submitterResponse.data;
        const reviewer = reviewerResponse?.data;

        const archiveEmbed = new EmbedBuilder()
            .setColor(0xffff00)
            .setTitle(`:hourglass: [#${level.position}] ${level.name}`)
            .addFields([
                {
                    name: "Record submitted by",
                    value: submitter?.discord_id
                        ? `<@${submitter.discord_id}>`
                        : (submitter.global_name ?? "Unknown"),
                },
                {
                    name: "Record put under consideration by",
                    value: reviewer?.discord_id
                        ? `<@${reviewer.discord_id}>`
                        : (reviewer?.global_name ?? "Unknown"),
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
                    name: "Private reviewer notes",
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

        const guild = await client.guilds.fetch(guildId);
        const staffGuild = enableSeparateStaffServer
            ? await client.guilds.fetch(staffGuildId)
            : guild;

        const channel = staffGuild.channels.cache.get(
            isPlat ? platArchiveRecordsID : classicArchiveRecordsID
        );
        if (channel && channel.isSendable()) {
            await channel.send({
                embeds: [archiveEmbed],
            });
        } else {
            Logger.warn("Archive channel not found or not sendable.");
        }

        const submissionId = String(data.id);
        const existing = await db
            .select()
            .from(ucThreadsTable)
            .where(eq(ucThreadsTable.submission_id, submissionId))
            .limit(1)
            .get();
        if (existing) return;

        const ucChannel = await staffGuild.channels.fetch(ucRecordsID);
        if (!ucChannel || !ucChannel.isSendable()) {
            Logger.error("UC channel not found or not sendable.");
            return;
        }

        const sentUCMessage = await ucChannel.send({
            content: `<@${reviewer?.discord_id}>`,
            embeds: [
                new EmbedBuilder()
                    .setColor(0xffff00)
                    .setTitle(`:hourglass: [#${level.position}] ${level.name}`)
                    .addFields([
                        {
                            name: "Submitted by",
                            value: `<@${submitter?.discord_id}>`,
                        },
                        {
                            name: "Put under consideration by",
                            value: `<@${reviewer?.discord_id}>`,
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
                        {
                            name: "Link",
                            value: `[Open submission](https://aredl.net/staff/submissions/${submissionId}?list=${isPlat ? "platformer" : "classic"})`,
                        },
                    ])
                    .setTimestamp(),
            ],
        });

        const threadName = `[UC] #${level.position} ${level.name} - ${submitter?.global_name ?? "Unknown"}`;

        const thread = await sentUCMessage.startThread({
            name:
                threadName.length > 100
                    ? `${threadName.slice(0, 97)}...`
                    : threadName,
            autoArchiveDuration: 10080,
        });

        await db.insert(ucThreadsTable).values({
            submission_id: submissionId,
            message_id: sentUCMessage.id,
            thread_id: thread.id,
        });
    },
};

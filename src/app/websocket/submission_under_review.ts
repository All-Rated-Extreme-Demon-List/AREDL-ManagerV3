import {
    enableSeparateStaffServer,
    guildId,
    staffGuildId,
    platArchiveRecordsID,
    classicArchiveRecordsID,
    adminsArchiveRecordsID,
} from "@/config";
import { api } from "@/api";
import { Client, EmbedBuilder } from "discord.js";
import { getCompletionTime } from "@/util/completionTime";
import { UnresolvedSubmission } from "@/types/record";
import { Logger } from "commandkit";
import { ExtendedLevel } from "@/types/level";
import { User } from "@/types/user";
import {
    checkHiddenReviewerAction,
    isHiddenReviewer,
} from "@/util/reviewersAlert";
import { getUserDisplayValue } from "@/util";

export default {
    notification_type: "SUBMISSION_UNDER_REVIEW",
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

        const level = levelResponse.data;
        const submitter = submitterResponse.data;
        const reviewer = reviewerResponse.data;
        const submitterDisplayValue = getUserDisplayValue(submitter);
        const reviewerDisplayValue = getUserDisplayValue(reviewer);

        const hiddenReviewer = isHiddenReviewer(reviewer);

        await checkHiddenReviewerAction(client, reviewer, {
            submissionId: String(data.id),
            levelName: level.name,
            levelPosition: level.position,
            state: "UnderReview",
            isPlat,
        });

        const archiveEmbed = new EmbedBuilder()
            .setColor(0x884bfa)
            .setTitle(`:purple_circle: [#${level.position}] ${level.name}`)
            .addFields([
                {
                    name: "Record submitted by",
                    value: submitterDisplayValue,
                },
                {
                    name: "Record put under review by",
                    value: reviewerDisplayValue,
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

        const staffChannel = staffGuild.channels.cache.get(
            hiddenReviewer && adminsArchiveRecordsID
                ? adminsArchiveRecordsID
                : isPlat
                  ? platArchiveRecordsID
                  : classicArchiveRecordsID
        );

        if (staffChannel && staffChannel.isSendable()) {
            await staffChannel.send({ embeds: [archiveEmbed] });
        } else {
            Logger.warn("Archive channel not found or not sendable.");
        }
    },
};

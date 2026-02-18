import {
    enableSeparateStaffServer,
    ucReminderSchedule,
    ucRemindersEnabled,
    ucReminderThreshold,
    ucReminderChannel,
    staffGuildId,
    guildId,
} from "@/../config.json";
import { api } from "@/api.js";
import { Logger } from "commandkit";
import { task } from "@commandkit/tasks";
import { PaginatedResponse } from "@/types/api";
import { db } from "@/app";
import { sentUcRemindersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Submission } from "@/types/record";

export default task({
    name: "sendUcReminders",
    schedule: ucRemindersEnabled ? ucReminderSchedule : undefined,
    async prepare() {
        return ucRemindersEnabled;
    },
    async execute({ client }) {
        const guild = await client.guilds.fetch(guildId);
        const staffGuild = enableSeparateStaffServer
            ? await client.guilds.fetch(staffGuildId)
            : guild;

        const channel = await staffGuild.channels.fetch(ucReminderChannel);
        if (!channel || !channel.isSendable()) {
            Logger.error(
                `Scheduled - Channel ${ucReminderChannel} is not sendable`
            );
            return;
        }

        const submissions: Submission[] = [];
        const classicSubmissionsRes = await api.send<
            PaginatedResponse<Submission>
        >(
            "/aredl/submissions",
            "GET",
            { per_page: 999, status_filter: "UnderConsideration" },
            undefined
        );
        if (classicSubmissionsRes.error) {
            Logger.error(
                `Scheduled - Error getting classic submissions: status ${classicSubmissionsRes.status}\n${classicSubmissionsRes.data.message}`
            );
        } else {
            const classicSubmissions = classicSubmissionsRes.data.data;
            submissions.push(...classicSubmissions);
        }
        const platSubmissionsRes = await api.send<
            PaginatedResponse<Submission>
        >(
            "/arepl/submissions",
            "GET",
            { per_page: 999, status_filter: "UnderConsideration" },
            undefined
        );
        if (platSubmissionsRes.error) {
            Logger.error(
                `Scheduled - Error getting platformer submissions: status ${platSubmissionsRes.status}\n${platSubmissionsRes.data.message}`
            );
        } else {
            const platSubmissions = platSubmissionsRes.data.data;
            submissions.push(...platSubmissions);
        }

        await submissions.sort(
            (a, b) => b.updated_at.getTime() - a.updated_at.getTime()
        );

        const alreadyReminded = await db.select().from(sentUcRemindersTable);

        alreadyReminded.forEach((reminded) => {
            const submissionExists = submissions.find(
                (submission) => submission.id === reminded.id
            );
            if (!submissionExists) {
                db.delete(sentUcRemindersTable).where(
                    eq(sentUcRemindersTable.id, reminded.id)
                );
                return false;
            }
            return true;
        });

        const messageLines = [];

        for (const submission of submissions) {
            const alreadyReminded = await db
                .select()
                .from(sentUcRemindersTable);
            if (
                alreadyReminded.find(
                    (reminded) => reminded.id === submission.id
                )
            ) {
                continue;
            }
            const updatedAt = submission.updated_at;
            // ucReminderThreshold in days
            const threshold = new Date(
                Date.now() - ucReminderThreshold * 24 * 60 * 60 * 1000
            );
            if (updatedAt > threshold) {
                continue;
            }

            const now = new Date();
            const diff = Math.round(
                (now.getTime() - updatedAt.getTime()) / 1000 / 3600 / 24
            );

            messageLines.push(
                `[This submission](${`<https://staff.aredl.net/dashboard/submissions/${submission.id}>`}) has been Under Consideration for ${diff} days (since ${updatedAt.toLocaleString(
                    "en-US",
                    {
                        timeZone: "UTC",
                        month: "numeric",
                        day: "numeric",
                    }
                )}).`
            );

            await db.insert(sentUcRemindersTable).values({
                id: submission.id,
            });
        }

        if (messageLines.length > 0) {
            await channel.send("# -----------------------");
            const messages = [];
            let currentMessage = "";
            messageLines.forEach((line, index) => {
                const newMessage = `${currentMessage}> (${index + 1}/${messageLines.length}) ${line}\n`;
                if (newMessage.length > 1500) {
                    messages.push(currentMessage);
                    currentMessage = `> (${index + 1}/${messageLines.length}) ${line}\n`;
                } else {
                    currentMessage = newMessage;
                }
            });
            if (currentMessage) {
                messages.push(currentMessage);
            }
            for (const message of messages) {
                const sent = await channel.send({ content: message });
                sent.suppressEmbeds(true);
            }
        }
    },
});

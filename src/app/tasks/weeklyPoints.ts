import { api } from "@/api";
import {
    pointsWeeklyCompleted,
    pointsBiweeklyMissed,
    sendWeeklyUpdates,
    guildId,
    weeklyUpdatesChannelId,
    enableSeparateStaffServer,
    staffGuildId,
    filterByGuildMembers,
    enableStaffPoints,
    enableWeeklyStaffPoints,
    defaultPoints,
    maxPoints,
} from "@/../config.json";
import { EmbedBuilder } from "discord.js";
import { Logger } from "commandkit";
import { task } from "@commandkit/tasks";
import { PaginatedResponse } from "@/types/api";
import { Shift } from "@/types/shift";
import { db } from "@/app";
import { staffPointsTable, weeklyMissedShiftsTable } from "@/db/schema";
import { count, eq } from "drizzle-orm";

const getShifts = async (cutoff: Date) => {
    const shifts = [];
    let page = 1;
    const maxPage = 15;

    while (true) {
        const shiftsReq = await api.send<PaginatedResponse<Shift>>(
            "/shifts",
            "GET",
            { page },
            undefined
        );
        if (shiftsReq.error) {
            Logger.error(
                `Error getting shifts (page ${page}): status ${shiftsReq.status}\n${shiftsReq.data.message}`
            );
            return;
        }
        shifts.push(...shiftsReq.data.data);
        if (
            shifts.at(-1) &&
            new Date(shifts.at(-1)!.end_at) >= cutoff &&
            page < maxPage &&
            shiftsReq.data.data.length > 0
        ) {
            page++;
        } else {
            return shifts.filter(
                (shift) =>
                    new Date(shift.end_at) >= cutoff &&
                    shift.status !== "Running"
            );
        }
    }
};

export default task({
    name: "weeklyPointsGain",
    schedule:
        enableStaffPoints && enableWeeklyStaffPoints ? "0 0 * * 0" : undefined, // weekly, on sunday at midnight
    async prepare() {
        return enableStaffPoints && enableWeeklyStaffPoints;
    },
    async execute({ client }) {
        Logger.info("Scheduled - Calculating weekly points");

        const guild = client.guilds.cache.get(guildId);
        const staffGuild = enableSeparateStaffServer
            ? client.guilds.cache.get(staffGuildId)
            : guild;

        if (!staffGuild) {
            Logger.error("Error getting staff guild");
            return;
        }

        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const allShiftsRes = await getShifts(oneWeekAgo);
        if (!allShiftsRes) {
            Logger.error("Error getting shifts");
            return;
        }
        const allShifts = allShiftsRes.reduce(
            (obj, shift) => {
                const discordId = shift.user.discord_id;
                if (discordId) {
                    obj[discordId] = [...(obj[discordId] ?? []), shift];
                }
                return obj;
            },
            {} as Record<string, Shift[]>
        );

        const isOddWeek =
            (
                await db
                    .select({ count: count() })
                    .from(weeklyMissedShiftsTable)
            )[0]?.count === 0;

        const changes = [];

        for (const [staffId, shifts] of Object.entries(allShifts)) {
            if (!staffGuild.members.cache.has(staffId) && filterByGuildMembers)
                continue;
            const allCompleted = shifts.every(
                (shift) => shift.status === "Completed"
            );
            const allMissed = shifts.every(
                (shift) => shift.status === "Expired"
            );

            const user = await db
                .insert(staffPointsTable)
                .values({
                    user: staffId,
                    points: defaultPoints,
                })
                .onConflictDoNothing()
                .returning()
                .get();

            // track whether this staff member has missed all shifts for next week
            if (isOddWeek) {
                await db.insert(weeklyMissedShiftsTable).values({
                    user: staffId,
                    missed_all: allMissed,
                });
            }

            if (allCompleted) {
                user.points = Math.min(
                    user.points + pointsWeeklyCompleted,
                    maxPoints
                );
                changes.push({
                    user: staffId,
                    completed: true,
                    diff: pointsWeeklyCompleted,
                });
            } else {
                if (!isOddWeek) {
                    const missedLastShift = await db
                        .select()
                        .from(weeklyMissedShiftsTable)
                        .where(eq(weeklyMissedShiftsTable.user, staffId))
                        .limit(1)
                        .get();

                    if (
                        missedLastShift &&
                        missedLastShift.missed_all && // if last week's shifts were missed
                        allMissed // and this week's shifts were missed
                    ) {
                        await db.update(staffPointsTable).set({
                            points: Math.max(
                                user.points - pointsBiweeklyMissed,
                                0
                            ),
                        });
                        changes.push({
                            user: staffId,
                            completed: false,
                            diff: -pointsBiweeklyMissed,
                        });
                    }
                }
            }
        }

        // reset missed shifts for next week
        if (!isOddWeek) {
            await db.delete(weeklyMissedShiftsTable);
        }

        if (sendWeeklyUpdates) {
            const channel = staffGuild.channels.cache.get(
                weeklyUpdatesChannelId
            );
            if (!channel || !channel.isSendable()) {
                Logger.error(
                    `Scheduled - Channel ${weeklyUpdatesChannelId} is not sendable`
                );
                return;
            }
            const embeds = changes
                .sort((a, b) => b.diff - a.diff)
                .map((change) => {
                    return new EmbedBuilder()
                        .setTitle(
                            change.completed
                                ? "Weekly points added"
                                : "Weekly points removed"
                        )
                        .setDescription(`<@${change.user}>`)
                        .setColor(change.completed ? 0x8fce00 : 0xcc0000)
                        .addFields([
                            {
                                name: "Status",
                                value: `${change.completed ? "Completed" : "Missed"}`,
                                inline: true,
                            },
                            {
                                name: "Points",
                                value: `${change.diff}`,
                                inline: true,
                            },
                        ]);
                });
            if (embeds.length > 0) {
                for (let i = 0; i < embeds.length; i += 10) {
                    const embedBatch = embeds.slice(i, i + 10);
                    await channel.send({
                        embeds: embedBatch,
                    });
                }
            }
        }

        return;
    },
});

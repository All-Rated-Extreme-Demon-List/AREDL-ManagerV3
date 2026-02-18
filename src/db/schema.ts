import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";
import { defaultPoints } from "@/../config.json";

export const dailyStatsTable = sqliteTable("dailyStats", {
    date: int({ mode: "timestamp" }).notNull(),
    nbMembersJoined: int().notNull().default(0),
    nbMembersLeft: int().notNull().default(0),
});

export const embedsTable = sqliteTable("embeds", {
    name: text().primaryKey(),
    guild: text().notNull(),
    channel: text().notNull(),
    discordid: text().notNull(),
    title: text(),
    description: text(),
    color: text(),
    image: text(),
});

export const messagesTable = sqliteTable("messages", {
    name: text().primaryKey(),
    guild: text().notNull(),
    channel: text().notNull(),
    discordid: text().notNull(),
});

export const settingsTable = sqliteTable("settings", {
    user: text().primaryKey(),
    shiftPings: int({ mode: "boolean" }).notNull().default(true),
});

export const sentUcRemindersTable = sqliteTable("sentUcReminders", {
    id: text().primaryKey(),
});

export const infoMessagesTable = sqliteTable("info_messages", {
    id: int().primaryKey({ autoIncrement: true }),
    name: text().notNull().unique(),
    guild: text().notNull(),
    channel: text().notNull(),
    discordid: text().notNull(),
});

export const staffPointsTable = sqliteTable("staff_points", {
    user: text().primaryKey(),
    points: int().notNull().default(defaultPoints),
});

export const weeklyMissedShiftsTable = sqliteTable("weekly_missed_shifts", {
    user: text().primaryKey(),
    missed_all: int({ mode: "boolean" }).notNull(),
});

export const noPingListTable = sqliteTable("noPingLists", {
    userId: text().primaryKey(),
    notes: text(),
    banned: int({ mode: "boolean" }).notNull().default(false),
});

export const ucThreadsTable = sqliteTable("uc_threads", {
    submission_id: text().primaryKey(),
    message_id: text().notNull(),
    thread_id: text().notNull(),
});

/*
  Warnings:

  - Made the column `date` on table `dailyStats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `channel` on table `embeds` required. This step will fail if there are existing NULL values in that column.
  - Made the column `discordid` on table `embeds` required. This step will fail if there are existing NULL values in that column.
  - Made the column `guild` on table `embeds` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `embeds` required. This step will fail if there are existing NULL values in that column.
  - Made the column `channel` on table `info_messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `discordid` on table `info_messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `guild` on table `info_messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `info_messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `channel` on table `messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `content` on table `messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `discordid` on table `messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `guild` on table `messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user` on table `settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `end_at` on table `shiftReminders` required. This step will fail if there are existing NULL values in that column.
  - Made the column `start_at` on table `shiftReminders` required. This step will fail if there are existing NULL values in that column.
  - Made the column `target_count` on table `shiftReminders` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user_id` on table `shiftReminders` required. This step will fail if there are existing NULL values in that column.
  - Made the column `message_id` on table `ucThreads` required. This step will fail if there are existing NULL values in that column.
  - Made the column `thread_id` on table `ucThreads` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_dailyStats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "nbMembersJoined" INTEGER NOT NULL DEFAULT 0,
    "nbMembersLeft" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_dailyStats" ("createdAt", "date", "id", "nbMembersJoined", "nbMembersLeft", "updatedAt") SELECT "createdAt", "date", "id", "nbMembersJoined", "nbMembersLeft", "updatedAt" FROM "dailyStats";
DROP TABLE "dailyStats";
ALTER TABLE "new_dailyStats" RENAME TO "dailyStats";
CREATE TABLE "new_embeds" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "guild" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "discordid" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "color" TEXT,
    "image" TEXT,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_embeds" ("channel", "color", "createdAt", "description", "discordid", "guild", "id", "image", "name", "sent", "title", "updatedAt") SELECT "channel", "color", "createdAt", "description", "discordid", "guild", "id", "image", "name", "sent", "title", "updatedAt" FROM "embeds";
DROP TABLE "embeds";
ALTER TABLE "new_embeds" RENAME TO "embeds";
CREATE TABLE "new_info_messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "guild" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "discordid" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_info_messages" ("channel", "createdAt", "discordid", "guild", "id", "name", "updatedAt") SELECT "channel", "createdAt", "discordid", "guild", "id", "name", "updatedAt" FROM "info_messages";
DROP TABLE "info_messages";
ALTER TABLE "new_info_messages" RENAME TO "info_messages";
CREATE TABLE "new_messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "guild" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "discordid" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_messages" ("channel", "content", "createdAt", "discordid", "guild", "id", "name", "sent", "updatedAt") SELECT "channel", "content", "createdAt", "discordid", "guild", "id", "name", "sent", "updatedAt" FROM "messages";
DROP TABLE "messages";
ALTER TABLE "new_messages" RENAME TO "messages";
CREATE TABLE "new_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user" TEXT NOT NULL,
    "shiftPings" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_settings" ("createdAt", "id", "shiftPings", "updatedAt", "user") SELECT "createdAt", "id", "shiftPings", "updatedAt", "user" FROM "settings";
DROP TABLE "settings";
ALTER TABLE "new_settings" RENAME TO "settings";
CREATE TABLE "new_shiftReminders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "start_at" DATETIME NOT NULL,
    "end_at" DATETIME NOT NULL,
    "target_count" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_shiftReminders" ("createdAt", "end_at", "id", "start_at", "target_count", "updatedAt", "user_id") SELECT "createdAt", "end_at", "id", "start_at", "target_count", "updatedAt", "user_id" FROM "shiftReminders";
DROP TABLE "shiftReminders";
ALTER TABLE "new_shiftReminders" RENAME TO "shiftReminders";
CREATE TABLE "new_ucThreads" (
    "submission_id" TEXT NOT NULL PRIMARY KEY,
    "message_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ucThreads" ("createdAt", "message_id", "submission_id", "thread_id", "updatedAt") SELECT "createdAt", "message_id", "submission_id", "thread_id", "updatedAt" FROM "ucThreads";
DROP TABLE "ucThreads";
ALTER TABLE "new_ucThreads" RENAME TO "ucThreads";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

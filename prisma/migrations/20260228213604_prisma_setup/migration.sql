/*
  Warnings:

  - You are about to drop the `acceptedRecords` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `changelogs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `deniedRecords` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `fishes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `infos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `levelsFromLegacies` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `levelsToLegacies` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `levelsToMoves` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `levelsToPlaces` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `messageLocks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pendingRecords` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `recordsToCommits` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shiftReminders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shifts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `staffs` table. If the table is not empty, all the data it contains will be lost.
  - The primary key for the `dailystats` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `dailystats` table. All the data in the column will be lost.
  - You are about to drop the column `nbRecordsAccepted` on the `dailystats` table. All the data in the column will be lost.
  - You are about to drop the column `nbRecordsDenied` on the `dailystats` table. All the data in the column will be lost.
  - You are about to drop the column `nbRecordsPending` on the `dailystats` table. All the data in the column will be lost.
  - You are about to drop the column `nbRecordsSubmitted` on the `dailystats` table. All the data in the column will be lost.
  - You are about to alter the column `nbMembersJoined` on the `dailystats` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("number")` to `Int`.
  - You are about to alter the column `nbMembersLeft` on the `dailystats` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("number")` to `Int`.
  - The primary key for the `embeds` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `embeds` table. All the data in the column will be lost.
  - You are about to alter the column `sent` on the `embeds` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("tinyint(1)")` to `Boolean`.
  - The primary key for the `info_messages` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `info_messages` table. All the data in the column will be lost.
  - The primary key for the `messages` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `messages` table. All the data in the column will be lost.
  - You are about to alter the column `sent` on the `messages` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("tinyint(1)")` to `Boolean`.
  - You are about to alter the column `banned` on the `noPingLists` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("tinyint(1)")` to `Boolean`.
  - The primary key for the `settings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `settings` table. All the data in the column will be lost.
  - You are about to alter the column `shiftPings` on the `settings` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("tinyint(1)")` to `Boolean`.
  - You are about to alter the column `points` on the `staff_points` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("number")` to `Int`.
  - You are about to alter the column `missed_all` on the `weekly_missed_shifts` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("tinyint(1)")` to `Boolean`.
  - Made the column `date` on table `dailystats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `channel` on table `embeds` required. This step will fail if there are existing NULL values in that column.
  - Made the column `discordid` on table `embeds` required. This step will fail if there are existing NULL values in that column.
  - Made the column `guild` on table `embeds` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `embeds` required. This step will fail if there are existing NULL values in that column.
  - Made the column `channel` on table `info_messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `discordid` on table `info_messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `guild` on table `info_messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `info_messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `channel` on table `messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `discordid` on table `messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `guild` on table `messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `messages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userId` on table `noPingLists` required. This step will fail if there are existing NULL values in that column.
  - Made the column `id` on table `sentUcReminders` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user` on table `settings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user` on table `staff_points` required. This step will fail if there are existing NULL values in that column.
  - Made the column `message_id` on table `ucThreads` required. This step will fail if there are existing NULL values in that column.
  - Made the column `submission_id` on table `ucThreads` required. This step will fail if there are existing NULL values in that column.
  - Made the column `thread_id` on table `ucThreads` required. This step will fail if there are existing NULL values in that column.
  - Made the column `missed_all` on table `weekly_missed_shifts` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user` on table `weekly_missed_shifts` required. This step will fail if there are existing NULL values in that column.

*/

DELETE FROM settings WHERE user IS NULL;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "acceptedRecords";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "changelogs";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "deniedRecords";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "fishes";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "infos";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "levelsFromLegacies";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "levelsToLegacies";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "levelsToMoves";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "levelsToPlaces";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "messageLocks";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "pendingRecords";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "recordsToCommits";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "shiftReminders";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "shifts";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "staffs";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_dailystats" (
    "date" DATETIME NOT NULL PRIMARY KEY,
    "nbMembersJoined" INTEGER NOT NULL DEFAULT 0,
    "nbMembersLeft" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_dailystats" ("createdAt", "date", "nbMembersJoined", "nbMembersLeft", "updatedAt") SELECT "createdAt", "date", coalesce("nbMembersJoined", 0) AS "nbMembersJoined", coalesce("nbMembersLeft", 0) AS "nbMembersLeft", "updatedAt" FROM "dailystats";
DROP TABLE "dailystats";
ALTER TABLE "new_dailystats" RENAME TO "dailystats";
CREATE TABLE "new_embeds" (
    "name" TEXT NOT NULL,
    "guild" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "discordid" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "description" TEXT,
    "color" TEXT,
    "image" TEXT,
    "sent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_embeds" ("channel", "color", "createdAt", "description", "discordid", "guild", "image", "name", "sent", "title", "updatedAt") SELECT "channel", "color", "createdAt", "description", "discordid", "guild", "image", "name", coalesce("sent", true) AS "sent", "title", "updatedAt" FROM "embeds";
DROP TABLE "embeds";
ALTER TABLE "new_embeds" RENAME TO "embeds";
CREATE TABLE "new_info_messages" (
    "name" TEXT NOT NULL,
    "guild" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "discordid" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_info_messages" ("channel", "createdAt", "discordid", "guild", "name", "updatedAt") SELECT "channel", "createdAt", "discordid", "guild", "name", "updatedAt" FROM "info_messages";
DROP TABLE "info_messages";
ALTER TABLE "new_info_messages" RENAME TO "info_messages";
CREATE TABLE "new_messages" (
    "name" TEXT NOT NULL,
    "guild" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "discordid" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT,
    "sent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_messages" ("channel", "content", "createdAt", "discordid", "guild", "name", "sent", "updatedAt") SELECT "channel", "content", "createdAt", "discordid", "guild", "name", coalesce("sent", true) AS "sent", "updatedAt" FROM "messages";
DROP TABLE "messages";
ALTER TABLE "new_messages" RENAME TO "messages";
CREATE TABLE "new_noPingLists" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "notes" TEXT,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_noPingLists" ("banned", "createdAt", "notes", "updatedAt", "userId") SELECT coalesce("banned", false) AS "banned", "createdAt", "notes", "updatedAt", "userId" FROM "noPingLists";
DROP TABLE "noPingLists";
ALTER TABLE "new_noPingLists" RENAME TO "noPingLists";
CREATE TABLE "new_sentUcReminders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_sentUcReminders" ("createdAt", "id", "updatedAt") SELECT "createdAt", "id", "updatedAt" FROM "sentUcReminders";
DROP TABLE "sentUcReminders";
ALTER TABLE "new_sentUcReminders" RENAME TO "sentUcReminders";
CREATE TABLE "new_settings" (
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "user" TEXT NOT NULL PRIMARY KEY,
    "shiftPings" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_settings" ("createdAt", "shiftPings", "updatedAt", "user") SELECT "createdAt", coalesce("shiftPings", true) AS "shiftPings", "updatedAt", "user" FROM "settings";
DROP TABLE "settings";
ALTER TABLE "new_settings" RENAME TO "settings";
CREATE TABLE "new_staff_points" (
    "user" TEXT NOT NULL PRIMARY KEY,
    "points" INTEGER NOT NULL DEFAULT 25,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_staff_points" ("createdAt", "points", "updatedAt", "user") SELECT "createdAt", coalesce("points", 25) AS "points", "updatedAt", "user" FROM "staff_points";
DROP TABLE "staff_points";
ALTER TABLE "new_staff_points" RENAME TO "staff_points";
CREATE TABLE "new_ucThreads" (
    "submission_id" TEXT NOT NULL PRIMARY KEY,
    "message_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ucThreads" ("createdAt", "message_id", "submission_id", "thread_id", "updatedAt") SELECT "createdAt", "message_id", "submission_id", "thread_id", "updatedAt" FROM "ucThreads";
DROP TABLE "ucThreads";
ALTER TABLE "new_ucThreads" RENAME TO "ucThreads";
CREATE TABLE "new_weekly_missed_shifts" (
    "user" TEXT NOT NULL PRIMARY KEY,
    "missed_all" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_weekly_missed_shifts" ("createdAt", "missed_all", "updatedAt", "user") SELECT "createdAt", "missed_all", "updatedAt", "user" FROM "weekly_missed_shifts";
DROP TABLE "weekly_missed_shifts";
ALTER TABLE "new_weekly_missed_shifts" RENAME TO "weekly_missed_shifts";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

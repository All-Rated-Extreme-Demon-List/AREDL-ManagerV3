-- CreateTable
CREATE TABLE "acceptedRecords" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT,
    "submitter" TEXT,
    "levelname" TEXT,
    "device" TEXT,
    "completionlink" TEXT,
    "raw" TEXT,
    "ldm" INTEGER,
    "additionalnotes" TEXT,
    "priority" tinyint(1),
    "moderator" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "modMenu" TEXT
);

-- CreateTable
CREATE TABLE "changelogs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "levelname" TEXT,
    "old_position" INTEGER,
    "new_position" INTEGER,
    "level_above" TEXT,
    "level_below" TEXT,
    "action" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "dailystats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME,
    "nbRecordsSubmitted" number DEFAULT '0',
    "nbRecordsPending" number DEFAULT '0',
    "nbRecordsAccepted" number DEFAULT '0',
    "nbRecordsDenied" number DEFAULT '0',
    "nbMembersJoined" number DEFAULT '0',
    "nbMembersLeft" number DEFAULT '0',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "deniedRecords" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT,
    "submitter" TEXT,
    "levelname" TEXT,
    "device" TEXT,
    "completionlink" TEXT,
    "raw" TEXT,
    "ldm" INTEGER,
    "additionalnotes" TEXT,
    "discordid" TEXT,
    "priority" tinyint(1),
    "denyReason" TEXT,
    "moderator" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "modMenu" TEXT
);

-- CreateTable
CREATE TABLE "embeds" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "guild" TEXT,
    "channel" TEXT,
    "discordid" TEXT,
    "title" TEXT,
    "description" TEXT,
    "color" TEXT,
    "image" TEXT,
    "sent" tinyint(1),
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "fishes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user" TEXT,
    "amount" double precision,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "info_messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "guild" TEXT,
    "channel" TEXT,
    "discordid" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "infos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "status" tinyint(1) DEFAULT 0,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT
);

-- CreateTable
CREATE TABLE "levelsFromLegacies" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "filename" TEXT,
    "position" INTEGER,
    "discordid" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "levelsToLegacies" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "filename" TEXT,
    "discordid" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "levelsToMoves" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "filename" TEXT,
    "position" INTEGER,
    "discordid" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "levelsToPlaces" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "filename" TEXT,
    "position" INTEGER,
    "githubCode" TEXT,
    "discordid" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "messageLocks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "discordid" TEXT,
    "locked" tinyint(1),
    "userdiscordid" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "guild" TEXT,
    "channel" TEXT,
    "discordid" TEXT,
    "content" TEXT,
    "sent" tinyint(1),
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "noPingLists" (
    "userId" TEXT PRIMARY KEY,
    "notes" TEXT,
    "banned" tinyint(1) DEFAULT 0,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "pendingRecords" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT,
    "submitter" TEXT,
    "levelname" TEXT,
    "device" TEXT,
    "completionlink" TEXT,
    "raw" TEXT,
    "ldm" INTEGER,
    "additionalnotes" TEXT,
    "discordid" TEXT,
    "embedDiscordid" TEXT,
    "priority" tinyint(1),
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "assigned" TEXT,
    "modMenu" TEXT
);

-- CreateTable
CREATE TABLE "recordsToCommits" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "filename" TEXT,
    "githubCode" TEXT,
    "discordid" TEXT,
    "user" BIGINT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "sentUcReminders" (
    "id" TEXT PRIMARY KEY,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "user" TEXT,
    "shiftPings" tinyint(1) DEFAULT 1
);

-- CreateTable
CREATE TABLE "shiftReminders" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT,
    "start_at" DATETIME,
    "end_at" DATETIME,
    "target_count" INTEGER,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "moderator" TEXT,
    "day" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "staff_points" (
    "user" TEXT PRIMARY KEY,
    "points" number DEFAULT '25',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "staffs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "moderator" TEXT,
    "nbRecords" INTEGER,
    "nbAccepted" INTEGER,
    "nbDenied" INTEGER,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ucThreads" (
    "submission_id" TEXT PRIMARY KEY,
    "message_id" TEXT,
    "thread_id" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "weekly_missed_shifts" (
    "user" TEXT PRIMARY KEY,
    "missed_all" tinyint(1),
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_deniedRecords_1" ON "deniedRecords"("discordid");
Pragma writable_schema=0;

-- CreateIndex
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_pendingRecords_1" ON "pendingRecords"("discordid");
Pragma writable_schema=0;


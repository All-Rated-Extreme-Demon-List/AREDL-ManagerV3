import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { BotConfig } from "./types/config";

const candidatePaths = [
    resolve(process.cwd(), "config.json"),
    resolve(process.cwd(), "config.example.json"),
].filter((value): value is string => Boolean(value));

function loadConfig(): BotConfig {
    for (const filePath of candidatePaths) {
        if (!existsSync(filePath)) {
            continue;
        }

        try {
            const raw = readFileSync(filePath, "utf8");
            return JSON.parse(raw) as BotConfig;
        } catch (error) {
            throw new Error(
                `Failed to load config from ${filePath}: ${String(error)}`
            );
        }
    }

    throw new Error(
        `No config file found. Checked: ${candidatePaths.join(", ")}`
    );
}

const config = loadConfig();

export const {
    websocketURL,
    baseURL,
    enableSeparateStaffServer,
    enableWelcomeMessage,
    clientId,
    guildId,
    staffGuildId,
    classicArchiveRecordsID,
    platArchiveRecordsID,
    classicRecordsID,
    platRecordsID,
    ucRecordsID,
    guildMemberAddID,
    completedShiftsID,
    missedShiftsID,
    shiftsStartedID,
    enableShiftReminders,
    sendShiftRemindersSchedule,
    shiftReminderExpireThreshold,
    ucReminderSchedule,
    ucReminderChannel,
    ucReminderThreshold,
    ucRemindersEnabled,
    pointsRoleIDs,
    packRoleIDs,
    topLevelRoleIDs,
    extremeGrinderRoleID,
    opinionPermsRoleID,
    creatorRoleID,
    verifierRoleID,
    noPingListRoleID,
    infoMessageUpdateSchedule,
    timeoutLogsChannelID,
    pointsOnShiftComplete,
    maxPointsOnShiftMiss,
    enableStaffPoints,
    enableWeeklyStaffPoints,
    pointsWeeklyCompleted,
    pointsBiweeklyMissed,
    sendWeeklyUpdates,
    weeklyUpdatesChannelId,
    filterByGuildMembers,
    defaultPoints,
    maxPoints,
} = config;

export default config;

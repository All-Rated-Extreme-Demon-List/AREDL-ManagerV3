-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_messages" (
    "name" TEXT NOT NULL,
    "guild" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "discordid" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT,
    "allowMentions" BOOLEAN NOT NULL DEFAULT true,
    "sent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_messages" ("channel", "content", "createdAt", "discordid", "guild", "name", "sent", "updatedAt") SELECT "channel", "content", "createdAt", "discordid", "guild", "name", "sent", "updatedAt" FROM "messages";
DROP TABLE "messages";
ALTER TABLE "new_messages" RENAME TO "messages";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

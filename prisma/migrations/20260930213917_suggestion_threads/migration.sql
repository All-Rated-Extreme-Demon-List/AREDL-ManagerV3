-- CreateTable
CREATE TABLE "suggestionThreads" (
    "threadId" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "tieBreakerId" TEXT
);

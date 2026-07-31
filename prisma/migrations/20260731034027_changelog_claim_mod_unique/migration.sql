/*
  Warnings:

  - A unique constraint covering the columns `[mod]` on the table `changelogClaims` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "changelogClaims_mod_key" ON "changelogClaims"("mod");

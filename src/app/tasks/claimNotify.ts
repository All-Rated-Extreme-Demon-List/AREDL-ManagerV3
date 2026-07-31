import { task, createTask } from "@commandkit/tasks";
import {
    claimUntilNotificationWaitMinutes,
    claimNotificationsExpirationMinutes,
    staffGuildId,
    staffChangelogChannelId,
} from "@/config.ts";
import { Logger } from "commandkit";
import { db } from "@/db/prisma.ts";

export default task({
    name: "claim-notify",
    async prepare() {
        return !!claimUntilNotificationWaitMinutes;
    },
    async execute({ data: claim }) {
        const { default: client } = await import("@/app.ts");

        const dbClaim = await db.changelogClaims.findUnique({
            where: { id: claim.id },
        });
        if (!dbClaim) {
            Logger.error(
                `Could not find claim with ID ${claim.id} to notify about`
            );
            return;
        }

        if (claim.notified || !claimUntilNotificationWaitMinutes) {
            Logger.warn(`Claim Reminder - User ${claim.mod} did not respond to reminder for claim on ${claim.level}, deleting...`)
            const hq = client.guilds.cache.get(staffGuildId);
            if (!hq) {
                Logger.error(
                    `Could not find AREDL HQ server to notify about claim ${claim.id}`
                );
                return;
            }

            const channel = await hq.channels.cache.get(
                staffChangelogChannelId
            );
            if (!channel || !channel.isSendable()) {
                Logger.error(
                    `Could not find changelog channel to notify about claim ${claim.id}`
                );
                return;
            }

            await channel.send(
                `:warning: A changelog claim by for level \`${claim.level}\` has expired and is now up for grabs!`
            );

            await db.changelogClaims.delete({
                where: { id: claim.id },
            });
        } else {
            Logger.log(`Claim Reminder - Sending claim reminder to user ${claim.mod} for claim on ${claim.level}...`)
            const mod = client.users.cache.get(claim.mod);
            if (!mod) {
                Logger.error(
                    `Could not find mod with ID ${claim.mod} to notify about claim ${claim.id}`
                );
                return;
            }

            await mod.send(
                ":warning: You have a changelog claim that will expire soon! Please check #changelog in AREDL HQ."
            );

            const updated = await db.changelogClaims.update({
                where: { id: claim.id },
                data: { notified: true },
            });

            await createTask({
                name: "claim-notify",
                data: updated,
                schedule: new Date(
                    Date.now() + claimNotificationsExpirationMinutes * 60 * 1000
                ),
            });
        }
    },
});

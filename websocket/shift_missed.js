const logger = require('log4js').getLogger();
const {
    guildId,
    staffGuildId,
    missedShiftsID,
    enableSeparateStaffServer,
    maxPointsOnShiftMiss
} = require('../config.json');
const { api } = require('../api');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    notification_type: 'SHIFTS_MISSED',
    async handle(client, data) {
        const { db } = require('../index.js');
        logger.log('Received shift missed notification:', data);

        const guild = await client.guilds.fetch(guildId);
        const staffGuild = enableSeparateStaffServer
            ? await client.guilds.fetch(staffGuildId)
            : guild;
        const foundReviewers = [];
        const embeds = [];

        // AREDL

        for (const shift of data.aredl) {
            let reviewer = foundReviewers.find(
                (rev) => rev.id == shift.user_id,
            );
            if (!reviewer) {
                const reviewerResponse = await api.send(
                    `/users/${shift.user_id}`,
                    'GET',
                );
                if (reviewerResponse.error) {
                    logger.error(
                        `Error fetching reviewer data: ${reviewerResponse.data.message}`,
                    );
                    return;
                }
                reviewer = reviewerResponse.data;
                foundReviewers.push(reviewer);
            }
            // unix epochs
            let startDate = Math.floor(new Date(shift.start_at) / 1000);
            const shiftEmbed = new EmbedBuilder()
                .setColor(0xcc0000)
                .setTitle(`:x: (AREDL) Shift missed...`)
                .setDescription(
                    `${reviewer.discord_id ? `<@${reviewer.discord_id}>` : reviewer.global_name}`,
                )
                .addFields([
                    {
                        name: 'Count',
                        value: `${shift.completed_count}/${shift.target_count}`,
                        inline: true,
                    },
                    { name: 'Time', value: `<t:${startDate}>`, inline: true },
                ])
                .setTimestamp();

            embeds.push(shiftEmbed);

            if (reviewer.discord_id) {
                const [points, _] = await db.staff_points.findOrCreate({
                    where: { user: reviewer.id },
                })
                const recordsDone = shift.completed_count / shift.target_count;

                if (recordsDone >= (2/3)) {
                    points.points = Math.max(points.points - (maxPointsOnShiftMiss * 2/3), 0);
                } else if (recordsDone >= (1/3)) {
                    points.points = Math.max(points.points - (maxPointsOnShiftMiss * 1/3), 0);
                } else {
                    points.points = Math.max(points.points - maxPointsOnShiftMiss, 0);
                }
                points.save();
            } else {
                logger.warn(`Shift Missed - Reviewer ${data.user_id} has no Discord ID, skipping points decrement.`);
            }
        }

        if (embeds.length > 0) {
            for (let i = 0; i < embeds.length; i += 10) {
                const embedBatch = embeds.slice(i, i + 10);
                staffGuild.channels.cache
                    .get(missedShiftsID)
                    .send({ embeds: embedBatch });
            }
        }
    },
};

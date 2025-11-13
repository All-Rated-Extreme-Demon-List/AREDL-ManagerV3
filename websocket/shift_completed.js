const logger = require('log4js').getLogger();
const {
    guildId,
    staffGuildId,
    completedShiftsID,
    enableSeparateStaffServer,
    pointsOnShiftComplete,
} = require('../config.json');
const { api } = require('../api');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    notification_type: 'SHIFT_COMPLETED',
    async handle(client, data) {
        const { db } = require('../index.js');
        logger.log('Received shift completed notification:', data);

        const reviewerResponse = await api.send(
            `/users/${data.user_id}`,
            'GET',
        );
        if (reviewerResponse.error) {
            logger.error(
                `Error fetching reviewer data: ${reviewerResponse.data.message}`,
            );
            return;
        }

        // unix epochs
        let startDate = Math.floor(new Date(data.start_at) / 1000);
        let endDate = Math.floor(new Date(data.end_at) / 1000);

        const archiveEmbed = new EmbedBuilder()
            .setColor(0x8fce00)
            .setTitle(`:white_check_mark: Shift complete!`)
            .setDescription(
                `${reviewerResponse.data.discord_id ? `<@${reviewerResponse.data.discord_id}>` : reviewerResponse.data.global_name}`,
            )
            .addFields([
                {
                    name: 'Count',
                    value: `${data.completed_count}/${data.target_count}`,
                    inline: true,
                },
                {
                    name: 'Time',
                    value: `<t:${startDate}> - <t:${endDate}>`,
                    inline: true,
                },
            ])
            .setTimestamp();

        const guild = await client.guilds.cache.get(guildId);
        const staffGuild = enableSeparateStaffServer
            ? await client.guilds.cache.get(staffGuildId)
            : guild;

        staffGuild.channels.cache
            .get(completedShiftsID)
            .send({ embeds: [archiveEmbed] });

        if (reviewerResponse.data.discord_id) {
            const [points, _] = await db.staff_points.findOrCreate({
                where: { user: data.user_id },
            });
            points.points = Math.min(points.points + pointsOnShiftComplete, 30);
            points.save();
        } else {
            logger.warn(`Shift completed - no Discord ID found for ${reviewerResponse.data.global_name}`);
        }
        
        return;
    },
};

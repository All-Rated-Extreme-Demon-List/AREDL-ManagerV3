const logger = require('log4js').getLogger();
const {
    guildId,
    staffGuildId,
    platArchiveRecordsID,
    platRecordsID,
    classicArchiveRecordsID,
    classicRecordsID,
    enableSeparateStaffServer,
} = require('../config.json');
const { api } = require('../api');
const { EmbedBuilder } = require('discord.js');
const { getCompletionTime } = require('../others/completionTime');

module.exports = {
    notification_type: 'SUBMISSION_DENIED',
    async handle(client, data) {
        logger.log('Received submission denied notification:', data);

        const isPlat =
            'completion_time' in data && data.completion_time !== null;

        const [submitterResponse, reviewerResponse] = await Promise.all([
            api.send(`/users/${data.submitted_by.id}`, 'GET'),
            api.send(`/users/${data.reviewer.id}`, 'GET'),
        ]);

        if (submitterResponse.error) {
            logger.error(
                `Error fetching user data: ${submitterResponse.data.message}`,
            );
            return;
        }
        if (reviewerResponse.error) {
            logger.error(
                `Error fetching reviewer data: ${reviewerResponse.data.message}`,
            );
            return;
        }

        const archiveEmbed = new EmbedBuilder()
            .setColor(0xcc0000)
            .setTitle(`:x: [#${data.level.position}] ${data.level.name}`)
            .addFields([
                {
                    name: 'Record submitted by',
                    value: `<@${submitterResponse.data.discord_id}>`,
                },
                {
                    name: 'Record rejected by',
                    value: `<@${reviewerResponse.data.discord_id}>`,
                },
                {
                    name: 'Device',
                    value: data.mobile ? 'Mobile' : 'PC',
                    inline: true,
                },
                {
                    name: 'LDM',
                    value:
                        !data.ldm_id || data.ldm_id === 0
                            ? 'None'
                            : String(data.ldm_id),
                    inline: true,
                },
                ...(isPlat
                    ? [
                          {
                              name: 'Completion time',
                              value: getCompletionTime(data.completion_time),
                          },
                      ]
                    : []),
                { name: 'Completion link', value: data.video_url },
                { name: 'Raw link', value: data.raw_url || 'None' },
                { name: 'Mod menu', value: data.mod_menu },
                {
                    name: 'User notes',
                    value:
                        data.user_notes && data.user_notes !== ''
                            ? data.user_notes
                            : 'None',
                },
                {
                    name: 'Reviewer notes',
                    value:
                        data.reviewer_notes && data.reviewer_notes !== ''
                            ? data.reviewer_notes
                            : 'None',
                },
                {
                    name: 'Link',
                    value: `[Open in Staff Portal](https://staff.aredl.net/dashboard/submissions/${data.id}?list=${isPlat ? 'platformer' : 'classic'})`,
                },
            ])
            .setTimestamp();

        // Create embed to send in public channel
        const publicEmbed = new EmbedBuilder()
            .setColor(0xcc0000)
            .setTitle(`:x: [#${data.level.position}] ${data.level.name}`)
            .setDescription(
                'Denied\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800',
            )
            .addFields([
                {
                    name: 'Record holder',
                    value: `${submitterResponse.data.global_name}`,
                    inline: true,
                },
                {
                    name: 'Device',
                    value: `${data.mobile ? 'Mobile' : 'PC'}`,
                    inline: true,
                },
                ...(isPlat
                    ? [
                          {
                              name: 'Completion time',
                              value: getCompletionTime(data.completion_time),
                          },
                      ]
                    : []),
                ...(data?.reviewer_notes && data.reviewer_notes !== ''
                    ? [{ name: 'Notes', value: data.reviewer_notes }]
                    : []),
            ]);

        // Send all messages simultaneously
        const guild = await client.guilds.fetch(guildId);
        const staffGuild = enableSeparateStaffServer
            ? await client.guilds.fetch(staffGuildId)
            : guild;

        staffGuild.channels.cache
            .get(isPlat ? platArchiveRecordsID : classicArchiveRecordsID)
            .send({ embeds: [archiveEmbed] });
        guild.channels.cache
            .get(isPlat ? platRecordsID : classicRecordsID)
            .send({
                content: `<@${submitterResponse.data.discord_id}>`,
                embeds: [publicEmbed],
            });
        guild.channels.cache
            .get(isPlat ? platRecordsID : classicRecordsID)
            .send({ content: `${data.video_url}` });
    },
};

const logger = require('log4js').getLogger();
const {
    guildId,
    staffGuildId,
    platArchiveRecordsID,
    classicArchiveRecordsID,
    platRecordsID,
    classicRecordsID,
    ucRecordsID,
    enableSeparateStaffServer,
} = require('../config.json');
const { api } = require('../api');
const { EmbedBuilder } = require('discord.js');
const { getCompletionTime } = require('../others/completionTime');

module.exports = {
    notification_type: 'SUBMISSION_ACCEPTED',
    async handle(client, data) {
        logger.log('Received submission accepted notification:', data);

        const { db } = require('../index.js');

        const isPlat =
            'completion_time' in data && data.completion_time !== null;

        const [levelResponse, submitterResponse, reviewerResponse] =
            await Promise.all([
                api.send(
                    `${isPlat ? '/arepl' : '/aredl'}/levels/${data.level_id}`,
                    'GET',
                ),
                api.send(`/users/${data.submitted_by}`, 'GET'),
                api.send(`/users/${data.reviewer_id}`, 'GET'),
            ]);

        if (levelResponse.error) {
            logger.error(
                `Error fetching level data: ${levelResponse.data.message}`,
            );
            return;
        }
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
            .setColor(0x8fce00)
            .setTitle(
                `:white_check_mark: [#${levelResponse.data.position}] ${levelResponse.data.name}`,
            )
            .addFields([
                {
                    name: 'Record submitted by',
                    value: `<@${submitterResponse.data.discord_id}>`,
                },
                {
                    name: 'Record accepted by',
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
                ...(data.completion_time
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
                    name: 'Private Reviewer Notes',
                    value:
                        data.private_reviewer_notes &&
                        data.private_reviewer_notes !== ''
                            ? data.private_reviewer_notes
                            : 'None',
                },
                {
                    name: 'Link',
                    value: `[Open submission](https://aredl.net/staff/submissions/${data.id}?list=${isPlat ? 'platformer' : 'classic'})`,
                },
            ])
            .setTimestamp();

        // Create embed to send in public channel
        const publicEmbed = new EmbedBuilder()
            .setColor(0x8fce00)
            .setTitle(
                `:white_check_mark: [#${levelResponse.data.position}] ${levelResponse.data.name}`,
            )
            .setDescription(
                'Accepted\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800\u2800',
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
                ...(data?.completion_time
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

        // Update UC thread if exists

        const ucThread = await db.ucThreads.findByPk(String(data.id));
        if (!ucThread) return;

        try {
            const ucChannel = await staffGuild.channels.fetch(ucRecordsID);
            const firstMessage = await ucChannel.messages.fetch(
                ucThread.message_id,
            );
            await firstMessage.reactions.removeAll();
            await firstMessage.react('✅');

            const thread = await staffGuild.channels.fetch(ucThread.thread_id);
            const threadName = `[Accepted] #${levelResponse.data.position} ${levelResponse.data.name} - ${submitterResponse.data.global_name}`;
            await thread.setName(
                threadName.length > 100
                    ? `${threadName.slice(0, 97)}...`
                    : threadName,
            );

            await thread.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x8fce00)
                        .setTitle(':white_check_mark: Accepted')
                        .addFields([
                            {
                                name: 'Accepted by',
                                value: `<@${reviewerResponse.data.discord_id}>`,
                            },
                            {
                                name: 'Reviewer notes',
                                value:
                                    data.reviewer_notes &&
                                    data.reviewer_notes !== ''
                                        ? data.reviewer_notes
                                        : 'None',
                                inline: true,
                            },
                            {
                                name: 'Private reviewer notes',
                                value:
                                    data.private_reviewer_notes &&
                                    data.private_reviewer_notes !== ''
                                        ? data.private_reviewer_notes
                                        : 'None',
                                inline: true,
                            },
                        ])
                        .setTimestamp(),
                ],
            });
        } catch (err) {
            logger.error('Failed to update UC thread after accept:', err);
        }
    },
};

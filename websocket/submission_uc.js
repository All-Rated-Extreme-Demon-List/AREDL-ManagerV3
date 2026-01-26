const logger = require('log4js').getLogger();
const {
    guildId,
    staffGuildId,
    platArchiveRecordsID,
    classicArchiveRecordsID,
    ucRecordsID,
    enableSeparateStaffServer,
} = require('../config.json');
const { api } = require('../api');
const { EmbedBuilder } = require('discord.js');
const { getCompletionTime } = require('../others/completionTime');

module.exports = {
    notification_type: 'SUBMISSION_UNDER_CONSIDERATION',
    async handle(client, data) {
        logger.log('Received submission uc notification:', data);

        const { db } = require('../index.js');

        const isPlat =
            'completion_time' in data && data.completion_time !== null;

        const [levelResponse, submitterResponse, reviewerResponse] =
            await Promise.all([
                api.send(
                    `${isPlat ? '/arepl' : '/aredl'}/levels/${data.level_id}`,
                    'GET'
                ),
                api.send(`/users/${data.submitted_by}`, 'GET'),
                data.reviewer_id
                    ? api.send(`/users/${data.reviewer_id}`, 'GET')
                    : Promise.resolve({ error: false, data: null }),
            ]);

        if (levelResponse.error) {
            logger.error(
                `Error fetching level data: ${levelResponse.data.message}`
            );
            return;
        }

        if (submitterResponse.error) {
            logger.error(
                `Error fetching user data: ${submitterResponse.data.message}`
            );
            return;
        }
        if (reviewerResponse?.error) {
            logger.error(
                `Error fetching reviewer data: ${reviewerResponse.data.message}`
            );
            return;
        }

        const level = levelResponse.data;
        const submitter = submitterResponse.data;
        const reviewer = reviewerResponse?.data;

        const archiveEmbed = new EmbedBuilder()
            .setColor(0xffff00)
            .setTitle(`:hourglass: [#${level.position}] ${level.name}`)
            .addFields([
                {
                    name: 'Record submitted by',
                    value: submitter?.discord_id
                        ? `<@${submitter.discord_id}>`
                        : (submitter.global_name ?? 'Unknown'),
                },
                {
                    name: 'Record put under consideration by',
                    value: reviewer?.discord_id
                        ? `<@${reviewer.discord_id}>`
                        : (reviewer?.global_name ?? 'Unknown'),
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
                    name: 'Private reviewer notes',
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

        const guild = await client.guilds.fetch(guildId);
        const staffGuild = enableSeparateStaffServer
            ? await client.guilds.fetch(staffGuildId)
            : guild;

        staffGuild.channels.cache
            .get(isPlat ? platArchiveRecordsID : classicArchiveRecordsID)
            .send({ embeds: [archiveEmbed] });

        const submissionId = String(data.id);
        const existing = await db.ucThreads.findByPk(submissionId);
        if (existing) return;

        const ucChannel = await staffGuild.channels.fetch(ucRecordsID);

        const sentUCMessage = await ucChannel.send({
            content: `<@${reviewer?.discord_id}>`,
            embeds: [
                new EmbedBuilder()
                    .setColor(0xffff00)
                    .setTitle(`:hourglass: [#${level.position}] ${level.name}`)
                    .addFields([
                        {
                            name: 'Submitted by',
                            value: `<@${submitter?.discord_id}>`,
                        },
                        {
                            name: 'Put under consideration by',
                            value: `<@${reviewer?.discord_id}>`,
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
                        {
                            name: 'Link',
                            value: `[Open submission](https://aredl.net/staff/submissions/${submissionId}?list=${isPlat ? 'platformer' : 'classic'})`,
                        },
                    ])
                    .setTimestamp(),
            ],
        });

        const threadName = `[UC] #${level.position} ${level.name} - ${submitter?.global_name ?? 'Unknown'}`;

        const thread = await sentUCMessage.startThread({
            name:
                threadName.length > 100
                    ? `${threadName.slice(0, 97)}...`
                    : threadName,
            autoArchiveDuration: 10080,
        });

        await db.ucThreads.create({
            submission_id: submissionId,
            message_id: sentUCMessage.id,
            thread_id: thread.id,
        });
    },
};

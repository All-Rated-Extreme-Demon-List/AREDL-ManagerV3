const {
    enableSeparateStaffServer,
    ucReminderSchedule,
    ucRemindersEnabled,
    ucReminderThreshold,
    ucReminderChannel,
    apiToken,
    staffGuildId,
    guildId,
} = require('../config.json');
const logger = require('log4js').getLogger();
const { api } = require('../api.js');

module.exports = {
    name: 'sendUcReminders',
    cron: ucReminderSchedule,
    enabled: ucRemindersEnabled,
    async execute() {
        const { client, db } = require('../index.js');

        const guild = await client.guilds.fetch(guildId);
        const staffGuild = enableSeparateStaffServer
            ? await client.guilds.fetch(staffGuildId)
            : guild;

        const channel = await staffGuild.channels.fetch(ucReminderChannel);
        if (!channel.isSendable()) {
            logger.error(
                `Scheduled - Channel ${ucReminderChannel} is not sendable`,
            );
            return;
        }

        const submissions = [];
        const classicSubmissionsRes = await api.send(
            '/aredl/submissions',
            'GET',
            { per_page: 999, status_filter: 'UnderConsideration' },
            undefined,
            apiToken,
        );
        if (classicSubmissionsRes.error) {
            logger.error(
                `Scheduled - Error getting classic submissions: status ${classicSubmissionsRes.status}\n${classicSubmissionsRes.data.message}`,
            );
        } else {
            const classicSubmissions = classicSubmissionsRes.data.data;
            submissions.push(...classicSubmissions);
        }
        const platSubmissionsRes = await api.send(
            '/arepl/submissions',
            'GET',
            { per_page: 999, status_filter: 'UnderConsideration' },
            undefined,
            apiToken,
        );
        if (platSubmissionsRes.error) {
            logger.error(
                `Scheduled - Error getting platformer submissions: status ${platSubmissionsRes.status}\n${platSubmissionsRes.data.message}`,
            );
        } else {
            const platSubmissions = platSubmissionsRes.data.data;
            submissions.push(...platSubmissions);
        }

        await submissions.sort((a, b) => b.updated_at - a.updated_at);

        alreadyReminded = await db.sentUcReminders.findAll();

        alreadyreminded = alreadyReminded.filter((reminded) => {
            const submissionExists = submissions.find(
                (submission) => submission.id === reminded.id,
            );
            if (!submissionExists) {
                reminded.destroy();
                return false;
            }
            return true;
        });

        const messageLines = [];

        for (const submission of submissions) {
            const alreadyReminded = await db.sentUcReminders.findAll();
            console.log(alreadyReminded.length);
            if (
                alreadyReminded.find(
                    (reminded) => reminded.id === submission.id,
                )
            ) {
                console.log('This reminder was already sent!');
                continue;
            }
            const updatedAt = new Date(submission.updated_at);
            // ucReminderThreshold in days
            const threshold = new Date(
                Date.now() - ucReminderThreshold * 24 * 60 * 60 * 1000,
            );
            if (updatedAt > threshold) {
                console.log('This submission is not old enough!');
                continue;
            }

            const now = new Date();
            const diff = Math.round((now - updatedAt) / 1000 / 3600 / 24);

            messageLines.push(
                `[This submission](${`<https://staff.aredl.net/dashboard/submissions/${submission.id}>`}) has been Under Consideration for ${diff} days (since ${updatedAt.toLocaleString(
                    'en-US',
                    {
                        timeZone: 'UTC',
                        month: 'numeric',
                        day: 'numeric',
                    },
                )}).`,
            );

            await db.sentUcReminders.create({ id: submission.id });
        }

        if (messageLines.length > 0) {
            await channel.send('# -----------------------');
            const messages = [];
            let currentMessage = '';
            messageLines.forEach((line, index) => {
                const newMessage = `${currentMessage}> (${index + 1}/${messageLines.length}) ${line}\n`;
                if (newMessage.length > 1500) {
                    messages.push(currentMessage);
                    currentMessage = `> (${index + 1}/${messageLines.length}) ${line}\n`;
                } else {
                    currentMessage = newMessage;
                }
            });
            if (currentMessage) {
                messages.push(currentMessage);
            }
            for (const message of messages) {
                const sent = await channel.send({ content: message });
                sent.suppressEmbeds(true);
            }
        }
    },
};

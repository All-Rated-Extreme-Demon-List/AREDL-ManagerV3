const { infoMessageUpdateSchedule, apiToken } = require('../config.json');
const logger = require('log4js').getLogger();
const { api } = require('../api.js');
const {
    EmbedBuilder,
    AttachmentBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    MediaGalleryBuilder,
    MessageFlags,
} = require('discord.js');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

module.exports = {
    name: 'infoMessageUpdate',
    cron: infoMessageUpdateSchedule,
    enabled: true,
    async execute() {
        const { client, db } = require('../index.js');
        logger.log('Scheduled - Sending info message updates');

        let [
            daily_stats_aredl,
            daily_stats_arepl,
            total_records_aredl,
            total_records_arepl,
            queue_aredl,
            queue_arepl,
        ] = await Promise.all([
            api.send(
                '/aredl/submissions/statistics',
                'GET',
                { per_page: 31, page: 1 },
                undefined,
                apiToken,
            ),
            api.send(
                '/arepl/submissions/statistics',
                'GET',
                { per_page: 31, page: 1 },
                undefined,
                apiToken,
            ),
            api.send(
                '/aredl/records/statistics',
                'GET',
                undefined,
                undefined,
                apiToken,
            ),
            api.send(
                '/arepl/records/statistics',
                'GET',
                undefined,
                undefined,
                apiToken,
            ),
            api.send(
                '/aredl/submissions/queue',
                'GET',
                undefined,
                undefined,
                apiToken,
            ),
            api.send(
                '/arepl/submissions/queue',
                'GET',
                undefined,
                undefined,
                apiToken,
            ),
        ]);

        const aredl_daily_stats = Array.isArray(daily_stats_aredl.data.data)
            ? daily_stats_aredl.data.data
            : [];
        const arepl_daily_stats = Array.isArray(daily_stats_arepl.data.data)
            ? daily_stats_arepl.data.data
            : [];
        const aredl_total_records = Array.isArray(total_records_aredl.data)
            ? total_records_aredl.data[0].records
            : [];
        const arepl_total_records = Array.isArray(total_records_arepl.data)
            ? total_records_arepl.data[0].records
            : [];
        const aredl_queue = queue_aredl.data;
        const arepl_queue = queue_arepl.data;
        if (!aredl_daily_stats.length && !arepl_daily_stats.length) {
            logger.warn(
                'Scheduled - No stats returned for either list; nothing to update.',
            );
            return;
        }

        const infoEntry = await db.info_messages.findOne({
            where: { name: 'list_stats' },
        });

        if (!infoEntry) {
            logger.info(
                "Scheduled - No DB entry for 'list_stats' (nothing to update yet).",
            );
            return;
        }

        let channel, message;
        try {
            channel = await client.channels.fetch(infoEntry.channel);
            if (!channel || !channel.isTextBased?.())
                throw new Error('Channel not found or not text-based');
            message = await channel.messages.fetch(infoEntry.discordid);
        } catch (err) {
            const code = err?.code || err?.rawError?.code;
            if (
                code === 10008 /* Unknown Message */ ||
                code === 10003 /* Unknown Channel */
            ) {
                logger.warn(
                    "Scheduled - Info message no longer exists; removing DB entry 'list_stats'.",
                );
            } else {
                logger.warn(
                    `Scheduled - Could not fetch message to update (will remove DB entry). Error: ${err?.message || err}`,
                );
            }
            await db.info_messages.destroy({ where: { id: infoEntry.id } });
            return;
        }

        const width = 1600;
        const height = 600;
        const renderer = new ChartJSNodeCanvas({
            width,
            height,
            backgroundColour: 'white',
        });

        let aredlStats = {
            totalSubmitted: 0,
            totalAccepted: 0,
            totalDenied: 0,
            totalUnderConsideration: 0,
            avgSubmittedPerDay: 0,
            avgCheckedPerDay: 0,
        };
        let aredlChart = null;

        if (aredl_daily_stats.length) {
            const aredlSorted = [...aredl_daily_stats].sort(
                (a, b) => new Date(a.date) - new Date(b.date),
            );
            const aredlLast30 = aredlSorted.slice(-30);

            const aredlLabels = aredlLast30.map((d) => d.date);
            const aredlAccepted = aredlLast30.map((d) =>
                Number(d.accepted || 0),
            );
            const aredlDenied = aredlLast30.map((d) => Number(d.denied || 0));
            const aredlSubmitted = aredlLast30.map((d) =>
                Number(d.submitted || 0),
            );
            const aredlUnderConsideration = aredlLast30.map((d) =>
                Number(d.under_consideration || 0),
            );

            aredlStats.totalAccepted = aredlAccepted.reduce((a, b) => a + b, 0);
            aredlStats.totalDenied = aredlDenied.reduce((a, b) => a + b, 0);
            aredlStats.totalSubmitted = aredlSubmitted.reduce(
                (a, b) => a + b,
                0,
            );
            aredlStats.totalUnderConsideration = aredlUnderConsideration.reduce(
                (a, b) => a + b,
                0,
            );
            const aredlTotalChecked =
                aredlStats.totalAccepted +
                aredlStats.totalDenied +
                aredlStats.totalUnderConsideration;

            aredlStats.avgSubmittedPerDay =
                Math.round((aredlStats.totalSubmitted / 30) * 10) / 10;
            aredlStats.avgCheckedPerDay =
                Math.round((aredlTotalChecked / 30) * 10) / 10;

            aredlChart = await renderer.renderToBuffer({
                type: 'bar',
                data: {
                    labels: aredlLabels,
                    datasets: [
                        {
                            label: 'Submitted',
                            data: aredlSubmitted,
                            backgroundColor: 'rgb(59,130,246)',
                            stack: 'new',
                        },
                        {
                            label: 'Under Consideration',
                            data: aredlUnderConsideration,
                            backgroundColor: 'rgb(255,205,86)',
                            stack: 'checked',
                        },
                        {
                            label: 'Denied',
                            data: aredlDenied,
                            backgroundColor: 'rgb(239,68,68)',
                            stack: 'checked',
                        },
                        {
                            label: 'Accepted',
                            data: aredlAccepted,
                            backgroundColor: 'rgb(34,197,94)',
                            stack: 'checked',
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' },
                        title: {
                            display: true,
                            text: 'Classic — Submission Statistics (last 30 days)',
                        },
                        tooltip: { mode: 'index', intersect: false },
                    },
                    scales: {
                        x: { stacked: true },
                        y: { stacked: true, beginAtZero: true },
                    },
                },
            });
        }

        let areplStats = {
            totalSubmitted: 0,
            totalAccepted: 0,
            totalDenied: 0,
            totalUnderConsideration: 0,
            avgSubmittedPerDay: 0,
            avgCheckedPerDay: 0,
        };
        let areplChart = null;

        if (arepl_daily_stats.length) {
            const areplSorted = [...arepl_daily_stats].sort(
                (a, b) => new Date(a.date) - new Date(b.date),
            );
            const areplLast30 = areplSorted.slice(-30);

            const areplLabels = areplLast30.map((d) => d.date);
            const areplAccepted = areplLast30.map((d) =>
                Number(d.accepted || 0),
            );
            const areplDenied = areplLast30.map((d) => Number(d.denied || 0));
            const areplSubmitted = areplLast30.map((d) =>
                Number(d.submitted || 0),
            );
            const areplUnderConsideration = areplLast30.map((d) =>
                Number(d.under_consideration || 0),
            );

            areplStats.totalAccepted = areplAccepted.reduce((a, b) => a + b, 0);
            areplStats.totalDenied = areplDenied.reduce((a, b) => a + b, 0);
            areplStats.totalSubmitted = areplSubmitted.reduce(
                (a, b) => a + b,
                0,
            );
            areplStats.totalUnderConsideration = areplUnderConsideration.reduce(
                (a, b) => a + b,
                0,
            );
            const areplTotalChecked =
                areplStats.totalAccepted +
                areplStats.totalDenied +
                areplStats.totalUnderConsideration;

            areplStats.avgSubmittedPerDay =
                Math.round((areplStats.totalSubmitted / 30) * 10) / 10;
            areplStats.avgCheckedPerDay =
                Math.round((areplTotalChecked / 30) * 10) / 10;

            areplChart = await renderer.renderToBuffer({
                type: 'bar',
                data: {
                    labels: areplLabels,
                    datasets: [
                        {
                            label: 'Submitted',
                            data: areplSubmitted,
                            backgroundColor: 'rgb(59,130,246)',
                            stack: 'new',
                        },
                        {
                            label: 'Under Consideration',
                            data: areplUnderConsideration,
                            backgroundColor: 'rgb(255,205,86)',
                            stack: 'checked',
                        },
                        {
                            label: 'Denied',
                            data: areplDenied,
                            backgroundColor: 'rgb(239,68,68)',
                            stack: 'checked',
                        },
                        {
                            label: 'Accepted',
                            data: areplAccepted,
                            backgroundColor: 'rgb(34,197,94)',
                            stack: 'checked',
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' },
                        title: {
                            display: true,
                            text: 'Platformer — Submission Statistics (last 30 days)',
                        },
                        tooltip: { mode: 'index', intersect: false },
                    },
                    scales: {
                        x: { stacked: true },
                        y: { stacked: true, beginAtZero: true },
                    },
                },
            });
        }

        const files = [];
        if (aredlChart) {
            files.push(
                new AttachmentBuilder(aredlChart, { name: 'aredl-stats.png' }),
            );
        }
        if (areplChart) {
            files.push(
                new AttachmentBuilder(areplChart, { name: 'arepl-stats.png' }),
            );
        }

        const oldestAredlSubmissionDate = aredl_queue.oldest_submission
            ? `<t:${Math.floor(new Date(aredl_queue.oldest_submission).getTime() / 1000)}:F>`
            : 'N/A';

        const aredlTextDisplays = [
            new TextDisplayBuilder().setContent('## Classic List Statistics'),
            new TextDisplayBuilder().setContent(
                '**Total records count:** ' +
                    aredl_total_records +
                    '\n### Current Queue\n' +
                    `**:blue_square: Pending submissions:** ${aredl_queue.submissions_in_queue}\t` +
                    `**:hourglass: Under Consideration submissions:** ${aredl_queue.uc_submissions}\n\n` +
                    `**:clock1: Oldest submission date:** ${oldestAredlSubmissionDate}`,
            ),
            new TextDisplayBuilder().setContent(
                '### Last 31 Days\n' +
                    `**:blue_square: New submissions:** ${aredlStats.totalSubmitted}\n\n` +
                    `**:white_check_mark: Accepted:** ${aredlStats.totalAccepted}\t` +
                    `**:x: Denied:** ${aredlStats.totalDenied}\t` +
                    `**:hourglass: Under Consideration:** ${aredlStats.totalUnderConsideration}`,
            ),
            new TextDisplayBuilder().setContent(
                `**Average new submissions per day:** ${aredlStats.avgSubmittedPerDay}\n` +
                    `**Average checked submissions per day:** ${aredlStats.avgCheckedPerDay}`,
            ),
        ];

        const oldestAreplSubmissionDate = arepl_queue.oldest_submission
            ? `<t:${Math.floor(new Date(arepl_queue.oldest_submission).getTime() / 1000)}:F>`
            : 'N/A';

        const areplTextDisplays = [
            new TextDisplayBuilder().setContent(
                '## Platformer List Statistics\n',
            ),
            new TextDisplayBuilder().setContent(
                '**Total records count:** ' +
                    arepl_total_records +
                    '\n### Current Queue\n' +
                    `**:blue_square: Pending submissions:** ${arepl_queue.submissions_in_queue}\t` +
                    `**:hourglass: Under Consideration submissions:** ${arepl_queue.uc_submissions}\n\n` +
                    `**:clock1: Oldest submission date:** ${oldestAreplSubmissionDate}`,
            ),
            new TextDisplayBuilder().setContent(
                '### Last 31 Days\n' +
                    `**:blue_square: New submissions:** ${areplStats.totalSubmitted}\n\n` +
                    `**:white_check_mark: Accepted:** ${areplStats.totalAccepted}\t` +
                    `**:x: Denied:** ${areplStats.totalDenied}\t` +
                    `**:hourglass: Under Consideration:** ${areplStats.totalUnderConsideration}`,
            ),
            new TextDisplayBuilder().setContent(
                `**Average new submissions per day:** ${areplStats.avgSubmittedPerDay}\n` +
                    `**Average checked submissions per day:** ${areplStats.avgCheckedPerDay}`,
            ),
        ];

        const aredlMediaGallery = new MediaGalleryBuilder();
        const areplMediaGallery = new MediaGalleryBuilder();

        aredlMediaGallery.addItems((mediaGalleryItem) =>
            mediaGalleryItem
                .setDescription('Classic submissions (last 31 days)')
                .setURL('attachment://aredl-stats.png'),
        );

        areplMediaGallery.addItems((mediaGalleryItem) =>
            mediaGalleryItem
                .setDescription('Platformer submissions (last 31 days)')
                .setURL('attachment://arepl-stats.png'),
        );

        const mainAredlContainer = new ContainerBuilder().setAccentColor(
            0xff6f00,
        );

        for (const textDisplay of aredlTextDisplays) {
            mainAredlContainer
                .addTextDisplayComponents([textDisplay])
                .addSeparatorComponents((separator) => separator);
        }

        mainAredlContainer.addMediaGalleryComponents(aredlMediaGallery);

        const mainAreplContainer = new ContainerBuilder().setAccentColor(223);

        for (const textDisplay of areplTextDisplays) {
            mainAreplContainer
                .addTextDisplayComponents([textDisplay])
                .addSeparatorComponents((separator) => separator);
        }

        mainAreplContainer.addMediaGalleryComponents(areplMediaGallery);

        await message.edit({
            content: '',
            flags: MessageFlags.IsComponentsV2,
            components: [mainAredlContainer, mainAreplContainer],
            files: files,
        });

        logger.info(
            'Scheduled - Updated combined statistics panel successfully.',
        );
    },
};

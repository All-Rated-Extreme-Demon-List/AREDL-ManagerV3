const { infoMessageUpdateSchedule, apiToken } = require('../config.json');
const logger = require('log4js').getLogger();
const { api } = require('../api.js');
const {
    AttachmentBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
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

        // helpers

        const width = 1600;
        const height = 600;
        const renderer = new ChartJSNodeCanvas({
            width,
            height,
            backgroundColour: 'white',
        });

        const safeNumber = (v, d = 0) =>
            Number.isFinite(Number(v)) ? Number(v) : d;

        const safeGetTotalRecords = (payload) => {
            try {
                if (
                    Array.isArray(payload?.data) &&
                    payload.data[0]?.records != null
                ) {
                    return safeNumber(payload.data[0].records, 0);
                }
            } catch (_) {}
            return 0;
        };

        const sortAndLimitDays = (arr, n = 30) =>
            [...arr]
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .slice(-n);

        const computeStaffStats = (days) => {
            const submitted = days.map((d) => safeNumber(d.submitted));
            const accepted = days.map((d) => safeNumber(d.accepted));
            const denied = days.map((d) => safeNumber(d.denied));
            const uc = days.map((d) => safeNumber(d.under_consideration));
            const totalSubmitted = submitted.reduce((a, b) => a + b, 0);
            const totalAccepted = accepted.reduce((a, b) => a + b, 0);
            const totalDenied = denied.reduce((a, b) => a + b, 0);
            const totalUC = uc.reduce((a, b) => a + b, 0);
            const totalChecked = totalAccepted + totalDenied + totalUC;

            return {
                labels: days.map((d) => d.date),
                series: { submitted, accepted, denied, uc },
                totals: {
                    totalSubmitted,
                    totalAccepted,
                    totalDenied,
                    totalUnderConsideration: totalUC,
                    avgSubmittedPerDay:
                        Math.round((totalSubmitted / 30) * 10) / 10,
                    avgCheckedPerDay: Math.round((totalChecked / 30) * 10) / 10,
                },
            };
        };

        const computePublicStats = (days) => {
            const submitted = days.map((d) => safeNumber(d.submitted));
            const reviewed = days.map(
                (d) =>
                    safeNumber(d.accepted) +
                    safeNumber(d.denied) +
                    safeNumber(d.under_consideration),
            );
            const totalSubmitted = submitted.reduce((a, b) => a + b, 0);
            const totalReviewed = reviewed.reduce((a, b) => a + b, 0);
            return {
                labels: days.map((d) => d.date),
                series: { submitted, reviewed },
                totals: {
                    totalSubmitted,
                    totalReviewed,
                    avgSubmittedPerDay:
                        Math.round((totalSubmitted / 30) * 10) / 10,
                    avgReviewedPerDay:
                        Math.round((totalReviewed / 30) * 10) / 10,
                },
            };
        };

        const renderStaffChart = async (title, labels, series) => {
            return renderer.renderToBuffer({
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Submitted',
                            data: series.submitted,
                            backgroundColor: 'rgb(59,130,246)',
                            stack: 'new',
                        },
                        {
                            label: 'Under Consideration',
                            data: series.uc,
                            backgroundColor: 'rgb(255,205,86)',
                            stack: 'checked',
                        },
                        {
                            label: 'Denied',
                            data: series.denied,
                            backgroundColor: 'rgb(239,68,68)',
                            stack: 'checked',
                        },
                        {
                            label: 'Accepted',
                            data: series.accepted,
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
                        title: { display: true, text: title },
                        tooltip: { mode: 'index', intersect: false },
                    },
                    scales: {
                        x: { stacked: true },
                        y: { stacked: true, beginAtZero: true },
                    },
                },
            });
        };

        const renderPublicChart = async (title, labels, series) => {
            return renderer.renderToBuffer({
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Submitted',
                            data: series.submitted,
                            backgroundColor: 'rgb(59,130,246)',
                        },
                        {
                            label: 'Reviewed',
                            data: series.reviewed,
                            backgroundColor: 'rgb(34,197,94)',
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' },
                        title: { display: true, text: title },
                        tooltip: { mode: 'index', intersect: false },
                    },
                    scales: {
                        x: { stacked: false },
                        y: { stacked: false, beginAtZero: true },
                    },
                },
            });
        };

        const buildStaffContainer = (
            accentColor,
            name,
            totals,
            queue,
            totalRecords,
            chartName,
        ) => {
            const oldestDate = queue?.oldest_submission
                ? `<t:${Math.floor(new Date(queue.oldest_submission).getTime() / 1000)}:F>`
                : 'N/A';

            const blocks = [
                new TextDisplayBuilder().setContent(
                    `## ${name} List Statistics`,
                ),
                new TextDisplayBuilder().setContent(
                    '**Total records count:** ' +
                        totalRecords +
                        '\n### Current Queue\n' +
                        `**:blue_square: Pending submissions:** ${queue?.submissions_in_queue ?? 0}\t` +
                        `**:hourglass: Under Consideration submissions:** ${queue?.uc_submissions ?? 0}\n\n` +
                        `**:clock1: Oldest submission date:** ${oldestDate}`,
                ),
                new TextDisplayBuilder().setContent(
                    '### Last 31 Days\n' +
                        `**:blue_square: New submissions:** ${totals.totalSubmitted}\n\n` +
                        `**:white_check_mark: Accepted:** ${totals.totalAccepted}\t` +
                        `**:x: Denied:** ${totals.totalDenied}\t` +
                        `**:hourglass: Under Consideration:** ${totals.totalUnderConsideration}`,
                ),
                new TextDisplayBuilder().setContent(
                    `**Average new submissions per day:** ${totals.avgSubmittedPerDay}\n` +
                        `**Average checked submissions per day:** ${totals.avgCheckedPerDay}`,
                ),
            ];

            const gallery = new MediaGalleryBuilder().addItems((item) =>
                item
                    .setDescription(`${name} submissions (last 31 days)`)
                    .setURL(`attachment://${chartName}`),
            );

            const container = new ContainerBuilder().setAccentColor(
                accentColor,
            );
            for (const b of blocks) {
                container
                    .addTextDisplayComponents([b])
                    .addSeparatorComponents((s) => s);
            }
            container.addMediaGalleryComponents(gallery);
            return container;
        };

        const buildPublicContainer = (
            accentColor,
            name,
            totals,
            queue,
            totalRecords,
            chartName,
        ) => {
            const blocks = [
                new TextDisplayBuilder().setContent(
                    `## ${name} List Statistics`,
                ),
                new TextDisplayBuilder().setContent(
                    '**Total records count:** ' +
                        totalRecords +
                        '\n### Current Queue\n' +
                        `**:blue_square: Pending submissions:** ${queue?.submissions_in_queue ?? 0}\t` +
                        `**:hourglass: Under Consideration submissions:** ${queue?.uc_submissions ?? 0}\n\n`,
                ),
                new TextDisplayBuilder().setContent(
                    '### Last 31 Days\n' +
                        `**:blue_square: New submissions:** ${totals.totalSubmitted}\n\n` +
                        `**:white_check_mark: Reviewed:** ${totals.totalReviewed}`,
                ),
                new TextDisplayBuilder().setContent(
                    `**Average new submissions per day:** ${totals.avgSubmittedPerDay}\n` +
                        `**Average reviewed submissions per day:** ${totals.avgReviewedPerDay}`,
                ),
            ];

            const gallery = new MediaGalleryBuilder().addItems((item) =>
                item
                    .setDescription(`${name} submissions (last 31 days)`)
                    .setURL(`attachment://${chartName}`),
            );

            const container = new ContainerBuilder().setAccentColor(
                accentColor,
            );
            for (const b of blocks) {
                container
                    .addTextDisplayComponents([b])
                    .addSeparatorComponents((s) => s);
            }
            container.addMediaGalleryComponents(gallery);
            return container;
        };

        const fetchMessage = async (entry) => {
            try {
                const channel = await client.channels.fetch(entry.channel);
                if (!channel || !channel.isTextBased?.())
                    throw new Error('Channel not found or not text-based');
                const message = await channel.messages.fetch(entry.discordid);
                return message;
            } catch (err) {
                const code = err?.code || err?.rawError?.code;
                if (code === 10008 || code === 10003) {
                    logger.warn('Scheduled - Info message no longer exists.');
                } else {
                    logger.warn(
                        `Scheduled - Could not fetch message to update. Error: ${err?.message || err}`,
                    );
                }
                await db.info_messages.destroy({ where: { id: entry.id } });
                return null;
            }
        };

        const updateIfExists = async (dbName, components, files) => {
            const entry = await db.info_messages.findOne({
                where: { name: dbName },
            });
            if (!entry) {
                logger.info(
                    `Scheduled - No DB entry for '${dbName}' (nothing to update yet).`,
                );
                return;
            }
            const message = await fetchMessage(entry);
            if (!message) return;

            await message.edit({
                content: '',
                flags: MessageFlags.IsComponentsV2,
                components,
                files,
            });
            logger.info(
                `Scheduled - Updated statistics panel successfully (${dbName}).`,
            );
        };

        // fetch data
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

        const aredl_daily = Array.isArray(daily_stats_aredl?.data?.data)
            ? daily_stats_aredl.data.data
            : [];
        const arepl_daily = Array.isArray(daily_stats_arepl?.data?.data)
            ? daily_stats_arepl.data.data
            : [];
        const aredl_total_records = safeGetTotalRecords(total_records_aredl);
        const arepl_total_records = safeGetTotalRecords(total_records_arepl);
        const aredl_queue = queue_aredl?.data ?? {};
        const arepl_queue = queue_arepl?.data ?? {};

        if (!aredl_daily.length && !arepl_daily.length) {
            logger.warn(
                'Scheduled - No stats returned for either list; nothing to update.',
            );
            return;
        }

        // prepare staff

        const aredlLast30 = aredl_daily.length
            ? sortAndLimitDays(aredl_daily, 30)
            : [];
        const areplLast30 = arepl_daily.length
            ? sortAndLimitDays(arepl_daily, 30)
            : [];

        let staffFiles = [];
        let staffComponents = [];

        if (aredlLast30.length || areplLast30.length) {
            const aredlStaff = aredlLast30.length
                ? computeStaffStats(aredlLast30)
                : null;
            const areplStaff = areplLast30.length
                ? computeStaffStats(areplLast30)
                : null;

            let mainAredlContainer = null;
            let mainAreplContainer = null;

            if (aredlStaff) {
                const chart = await renderStaffChart(
                    'Classic — Submission Statistics (last 30 days)',
                    aredlStaff.labels,
                    aredlStaff.series,
                );
                const fileName = 'aredl-stats.png';
                staffFiles.push(
                    new AttachmentBuilder(chart, { name: fileName }),
                );
                mainAredlContainer = buildStaffContainer(
                    0xff6f00,
                    'Classic',
                    aredlStaff.totals,
                    aredl_queue,
                    aredl_total_records,
                    fileName,
                );
            }

            if (areplStaff) {
                const chart = await renderStaffChart(
                    'Platformer — Submission Statistics (last 30 days)',
                    areplStaff.labels,
                    areplStaff.series,
                );
                const fileName = 'arepl-stats.png';
                staffFiles.push(
                    new AttachmentBuilder(chart, { name: fileName }),
                );
                mainAreplContainer = buildStaffContainer(
                    223,
                    'Platformer',
                    areplStaff.totals,
                    arepl_queue,
                    arepl_total_records,
                    fileName,
                );
            }

            staffComponents = [mainAredlContainer, mainAreplContainer].filter(
                Boolean,
            );
        }

        // prepare public

        let publicFiles = [];
        let publicComponents = [];

        if (aredlLast30.length || areplLast30.length) {
            const aredlPublic = aredlLast30.length
                ? computePublicStats(aredlLast30)
                : null;
            const areplPublic = areplLast30.length
                ? computePublicStats(areplLast30)
                : null;

            let mainAredlContainerPub = null;
            let mainAreplContainerPub = null;

            if (aredlPublic) {
                const chart = await renderPublicChart(
                    'Classic — Submissions vs Reviewed (last 30 days)',
                    aredlPublic.labels,
                    aredlPublic.series,
                );
                const fileName = 'aredl-stats-public.png';
                publicFiles.push(
                    new AttachmentBuilder(chart, { name: fileName }),
                );
                mainAredlContainerPub = buildPublicContainer(
                    0xff6f00,
                    'Classic',
                    aredlPublic.totals,
                    aredl_queue,
                    aredl_total_records,
                    fileName,
                );
            }

            if (areplPublic) {
                const chart = await renderPublicChart(
                    'Platformer — Submissions vs Reviewed (last 30 days)',
                    areplPublic.labels,
                    areplPublic.series,
                );
                const fileName = 'arepl-stats-public.png';
                publicFiles.push(
                    new AttachmentBuilder(chart, { name: fileName }),
                );
                mainAreplContainerPub = buildPublicContainer(
                    223,
                    'Platformer',
                    areplPublic.totals,
                    arepl_queue,
                    arepl_total_records,
                    fileName,
                );
            }

            publicComponents = [
                mainAredlContainerPub,
                mainAreplContainerPub,
            ].filter(Boolean);
        }

        // update messages

        await updateIfExists('list_stats', staffComponents, staffFiles);
        await updateIfExists(
            'list_stats_public',
            publicComponents,
            publicFiles,
        );

        logger.info('Scheduled - Completed statistics updates.');
    },
};

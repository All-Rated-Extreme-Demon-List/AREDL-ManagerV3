const {
    SlashCommandBuilder,
    ButtonBuilder,
    ThumbnailBuilder,
    ButtonStyle,
    ContainerBuilder,
    MessageFlags,
    SectionBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    ActionRowBuilder,
} = require('discord.js');
const logger = require('log4js').getLogger();
const { api } = require('../../api.js');
const iso = require('iso-3166-1');

const usersPerPage = 11;

function getColor(posStr) {
    let pos = parseInt(posStr);
    switch (
        true // why
    ) {
        case pos <= 50:
            return 0xff0000; // Red
        case pos <= 150:
            return 0xff8000; // Red-Orange
        case pos <= 300:
            return 0xffea00; // Orange
        case pos <= 500:
            return 0xbfff40; // Yellow-Green
        case pos <= 750:
            return 0x00ff00; // Green
        case pos <= 1000:
            return 0x00ffff; // Cyan
        case pos <= 1250:
            return 0x0080ff; // Light Blue
        case pos <= 1500:
            return 0x0000ff; // Blue
        default:
            return 0xff6f00;
    }
}

module.exports = {
    cooldown: 5,
    enabled: true,
    data: new SlashCommandBuilder()
        .setName('aredl')
        .setDescription('AREDL commands')
        .addSubcommand((subcommand) =>
            subcommand
                .setName('level')
                .setDescription('Lookup a level on the list')
                .addStringOption((option) =>
                    option
                        .setName('level')
                        .setDescription('The name of the level')
                        .setAutocomplete(true)
                        .setRequired(true),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('leaderboard')
                .setDescription('View the AREDL leaderboard')
                .addIntegerOption((option) =>
                    option
                        .setName('page')
                        .setDescription('The page of the leaderboard to view'),
                )
                .addStringOption((option) =>
                    option
                        .setName('name')
                        .setDescription('Filter the leaderboard by username'),
                )
                .addStringOption((option) =>
                    option
                        .setName('country')
                        .setDescription('Filter the leaderboard by country')
                        .setAutocomplete(true),
                )
                .addStringOption((option) =>
                    option
                        .setName('sort')
                        .setDescription('Sort the leaderboard')
                        .addChoices(
                            {
                                name: 'Points excluding packs',
                                value: 'RawPoints',
                            },
                            {
                                name: 'Number of extremes',
                                value: 'ExtremeCount',
                            },
                        ),
                ),
        ),
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);
        if (focused.name === 'level') {
            let res = await api.send('/aredl/levels', 'GET', {
                name_contains: focused.value.toLowerCase(),
            });
            if (res.error) {
                return;
            }
            const levels = res.data;
            return await interaction.respond(
                await levels
                    .filter((level) =>
                        level.name
                            .toLowerCase()
                            .includes(focused.value.toLowerCase()),
                    )
                    .slice(0, 25)
                    .map((level) => ({
                        name: `#${level.position} - ${level.name}`,
                        value: level.id,
                    })),
            );
        } else if (focused.name === 'country') {
            let countries = await iso.all();

            return await interaction.respond(
                await countries
                    .filter((country) =>
                        country.country
                            .toLowerCase()
                            .includes(focused.value.toLowerCase()),
                    )
                    .slice(0, 25)
                    .map((country) => ({
                        name: country.country,
                        value: String(country.numeric),
                    })),
            );
        }
    },
    async execute(interaction) {
        await interaction.deferReply();

        let subcommand = interaction.options.getSubcommand();
        if (subcommand === 'level') {
            let levelID = await interaction.options.getString('level');
            let levelRes = await api.send(`/aredl/levels/${levelID}`, 'GET');
            if (levelRes.error) {
                logger.error(
                    `Error finding level ${levelID}: ${levelRes.data.message}`,
                );
                return await interaction.editReply(
                    ':x: Error finding that level! Be sure to pick from the suggested options.',
                );
            }

            let level = levelRes.data;

            let levelCreatorsRes = await api.send(
                `/aredl/levels/${levelID}/creators`,
                'GET',
            );
            let levelCreators;
            if (levelCreatorsRes.error) {
                logger.error(
                    `Error finding level creators from ${levelID}: ${levelCreatorsRes.data.message}`,
                );
                return await interaction.editReply(
                    ":x: Error finding that level's creators! Be sure to pick from the suggested options.",
                );
            } else levelCreators = levelCreatorsRes.data;

            let color = getColor(level.position);

            const container = new ContainerBuilder().setAccentColor(color);

            const text1 = new TextDisplayBuilder().setContent(
                `## ${level.name} (#${level.position})`,
            );
            container.addTextDisplayComponents(text1);

            container.addSeparatorComponents((separator) =>
                separator.setSpacing(SeparatorSpacingSize.Small),
            );

            const text2 = new TextDisplayBuilder().setContent(
                level.description && level.description !== ''
                    ? `${`-# ${level.description}`}`
                    : '_No description._',
            );

            let section = new SectionBuilder().addTextDisplayComponents(text2);

            let exp =
                /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;

            if (level.verifications.length > 0) {
                let verification = level.verifications[0];
                let video = verification.video_url;
                let match = video.match(exp);
                if (match[1]) {
                    let vidId = match[1];
                    let thumbnailURL = `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`;
                    let button = new ButtonBuilder()
                        .setStyle(ButtonStyle.Link)
                        .setLabel('Watch')
                        .setURL(video);

                    let thumbnail = new ThumbnailBuilder()
                        .setURL(thumbnailURL)
                        .setDescription(
                            `Verified by [${verification.submitted_by.global_name}](https://aredl.net/profiles/${verification.submitted_by.id}), published by [${level.publisher.global_name}](https://aredl.net/profiles/${level.publisher.id})`,
                        );

                    section.setThumbnailAccessory(thumbnail);

                    let verInfoText = new TextDisplayBuilder().setContent(
                        `Verified by [${
                            verification.submitted_by.global_name
                        }](https://aredl.net/profiles/${
                            verification.submitted_by.id
                        }), published by [${
                            level.publisher.global_name
                        }](https://aredl.net/profiles/${level.publisher.id})${
                            levelCreators.length > 0
                                ? `, created by ${levelCreators
                                      .map(
                                          (cr) =>
                                              `[${cr.global_name}](https://aredl.net/profiles/${cr.id})`,
                                      )
                                      .join(', ')}`
                                : ``
                        }`,
                    );
                    let verificationInfo = new SectionBuilder()
                        .addTextDisplayComponents(verInfoText)
                        .setButtonAccessory(button);
                    container.addSectionComponents(section, verificationInfo);
                } else {
                    container.addSectionComponents(section);
                }
            }

            container.addSeparatorComponents((separator) =>
                separator.setSpacing(SeparatorSpacingSize.Small),
            );

            let infoLines = [];

            infoLines.push(
                `### **ID:** [${level.level_id}](https://gdbrowser.com/${level.level_id})`,
            );
            infoLines.push(`**Points:** ${level.points / 10}`);

            if (level.edel_enjoyment) {
                infoLines.push(
                    `**EDEL Enjoyment:** ${level.edel_enjoyment.toFixed(2)}${level.is_edel_pending ? ` :warning:` : ''}`,
                );
            }

            if (level.nlw_tier) {
                infoLines.push(`**NLW Tier:** ${level.nlw_tier}`);
            }

            if (level.gddl_tier) {
                infoLines.push(`**GDDL Tier:** ${level.gddl_tier.toFixed(2)}`);
            }

            let info = new TextDisplayBuilder().setContent(
                infoLines.join('\n### '),
            );
            container.addTextDisplayComponents(info);

            if (level.tags.length > 0) {
                container.addSeparatorComponents((separator) =>
                    separator.setSpacing(SeparatorSpacingSize.Small),
                );
                let tags = new TextDisplayBuilder().setContent(
                    'Tags: ' +
                        level.tags
                            .map(
                                (tag) =>
                                    `[${tag}](https://aredl.net/list?tag_${tag.replace(
                                        ' ',
                                        '+',
                                    )}=true)`,
                            )
                            .join(', '),
                );
                container.addTextDisplayComponents(tags);
            }

            let go = new ButtonBuilder()
                .setLabel('Open In AREDL')
                .setURL(`https://aredl.net/list/${level.id}`)
                .setStyle(ButtonStyle.Link);

            let row = new ActionRowBuilder().setComponents(go);

            await interaction.editReply({
                components: [container, row],
                flags: MessageFlags.IsComponentsV2,
            });
        } else if (subcommand === 'leaderboard') {
            let nameFilter = interaction.options.getString('name');
            let countryCodeFilter = interaction.options.getString('country');
            let sort = interaction.options.getString('sort');
            let page = interaction.options.getInteger('page');
            let country = iso.whereNumeric(countryCodeFilter);
            let query = {
                per_page: usersPerPage,
            };
            if (nameFilter) query.name_filter = `%${nameFilter}%`;
            if (country) query.country_filter = country.numeric;
            if (page) query.page = page;
            if (sort) query.order = sort;
            let lbRes = await api.send('/aredl/leaderboard', 'GET', query);
            if (lbRes.error) {
                logger.log(
                    `failed to fetch leaderboard: ${lbRes.data.message}`,
                );
                const container = new ContainerBuilder()
                    .setAccentColor(0xff0000)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            '## :x: Failed to fetch leaderboard!',
                        ),
                        new TextDisplayBuilder().setContent(lbRes.data.message),
                    );

                return await interaction.editReply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [container],
                });
            }

            let lastRefreshed = new Date(lbRes.data.last_refreshed);
            let leaderboard = lbRes.data.data;

            let container = new ContainerBuilder()
                .setAccentColor(0xff6f00)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        '## AREDL Leaderboard ' +
                            (nameFilter ? `(${nameFilter}) ` : '') +
                            (country ? `(${country.country}) ` : ``),
                    ),
                )
                .addSeparatorComponents((separator) =>
                    separator.setSpacing('Small'),
                );

            for (const entry of leaderboard) {
                let showDiscordUser =
                    entry.user.discord_id &&
                    interaction.guild.members.cache.some(
                        (member) => member.id === entry.user.discord_id,
                    );

                let section = new SectionBuilder();
                let text = new TextDisplayBuilder().setContent(
                    `- \#${entry.rank} ${
                        entry.clan
                            ? `[[${entry.clan.tag}]](https://aredl.net/clans/${entry.clan.id}) `
                            : ''
                    }${
                        showDiscordUser
                            ? `<@${entry.user.discord_id}>`
                            : entry.user.global_name
                    } - ${(entry.total_points / 10).toFixed(1)}pts`,
                );
                let btn = new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setLabel('Go')
                    .setURL(`https://aredl.net/profiles/${entry.user.id}`);

                container.addSectionComponents(
                    section
                        .addTextDisplayComponents(text)
                        .setButtonAccessory(btn),
                );
            }

            container
                .addSeparatorComponents((separator) =>
                    separator.setSpacing('Small'),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `Last updated at ${lastRefreshed.toLocaleTimeString(
                            undefined,
                            {
                                hour: 'numeric',
                                minute: '2-digit',
                                // exclude seconds
                            },
                        )} | ${lbRes.data.page} of ${lbRes.data.page * usersPerPage} of ~${lbRes.data.pages * usersPerPage + 1}`,
                    ),
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setLabel('Open In AREDL')
                            .setURL(`https://aredl.net/leaderboard`),
                    ),
                );

            return await interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                components: [container],
            });
        }
    },
};

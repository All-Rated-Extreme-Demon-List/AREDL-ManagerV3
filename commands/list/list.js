const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    SeparatorSpacingSize,
    AttachmentBuilder,
    FileBuilder,
    ChatInputCommandInteraction,
} = require('discord.js');
const { api } = require('../../api.js');
const {
    opinionPermsRoleID,
    extremeGrinderRoleID,
    guildId,
    noPingListRoleID,
} = require('../../config.json');

const processLevelName = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
};

module.exports = {
    cooldown: 5,
    enabled: true,
    data: new SlashCommandBuilder()
        .setName('list')
        .setDescription('Staff list management')
        .addSubcommand((subcommand) =>
            subcommand
                .setName('mutualvictors')
                .setDescription(
                    'Finds all victors that have beaten both levels'
                )
                .addStringOption((option) =>
                    option
                        .setName('level1')
                        .setDescription('The name of the first level')
                        .setAutocomplete(true)
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('level2')
                        .setDescription('The name of the second level')
                        .setAutocomplete(true)
                        .setRequired(true)
                )
                .addIntegerOption((option) =>
                    option
                        .setName('high-extremes')
                        .setDescription(
                            'Whether to only show players with 50+ extremes'
                        )
                        .addChoices({ name: 'Yes', value: 1 })
                )
                .addIntegerOption((option) =>
                    option
                        .setName('showinchannel')
                        .setDescription(
                            'Whether to send the message in this channel instead of only showing it to you'
                        )
                        .addChoices({ name: 'Yes', value: 1 })
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('victors')
                .setDescription('Display all victors of a level')
                .addStringOption((option) =>
                    option
                        .setName('level')
                        .setDescription('The name of the level')
                        .setAutocomplete(true)
                        .setRequired(true)
                )
                .addIntegerOption((option) =>
                    option
                        .setName('high-extremes')
                        .setDescription(
                            'Whether to only show players with 50+ extremes'
                        )
                        .addChoices({ name: 'Yes', value: 1 })
                )
                .addIntegerOption((option) =>
                    option
                        .setName('showinchannel')
                        .setDescription(
                            'Whether to send the message in this channel instead of only showing it to you'
                        )
                        .addChoices({ name: 'Yes', value: 1 })
                )
        ),
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const res = await api.send('/aredl/levels', 'GET', {
            name_contains: focused.toLowerCase(),
        });
        if (res.error) {
            return;
        }
        const levels = res.data;
        return await interaction.respond(
            await levels
                .filter((level) =>
                    level.name.toLowerCase().includes(focused.toLowerCase())
                )
                .slice(0, 25)
                .map((level) => ({
                    name: `#${level.position} - ${level.name}`,
                    value: level.id,
                }))
        );
    },
    /**
     * @param {ChatInputCommandInteraction} interaction
     */
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const { db } = require('../../index.js');
        if (subcommand === 'mutualvictors') {
            const ID1 = interaction.options.getString('level1');
            const ID2 = interaction.options.getString('level2');
            const highExtremes =
                interaction.options.getInteger('high-extremes') === 1;
            const ephemeral =
                interaction.options.getInteger('showinchannel') !== 1;

            if (ID1 === ID2) {
                const container = new ContainerBuilder()
                    .setAccentColor(0xff0000)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`## :x: Nope!`),
                        new TextDisplayBuilder().setContent(
                            "You must select two different levels. That's the whole point of the command..."
                        )
                    );
                return await interaction.reply({
                    flags: MessageFlags.IsComponentsV2,
                    components: [container],
                });
            }

            // Get level data (including level name)
            const [lvl1res, lvl2res] = await Promise.all([
                api.send(`/aredl/levels/${ID1}`),
                api.send(`/aredl/levels/${ID2}`),
            ]);

            if (lvl1res.error || lvl2res.error) {
                const container = new ContainerBuilder()
                    .setAccentColor(0xff0000)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`## :x: Error!`),
                        new TextDisplayBuilder().setContent(
                            `Error fetching ${
                                lvl1res.error && lvl2res.error
                                    ? 'both levels'
                                    : lvl1res.error
                                      ? 'level 1'
                                      : lvl2res.error
                                        ? 'level 2'
                                        : 'one of the levels'
                            }!`
                        )
                    );
                return await interaction.reply({
                    flags: [
                        MessageFlags.IsComponentsV2,
                        MessageFlags.Ephemeral,
                    ],
                    components: [container],
                });
            }

            const [level1, level2] = [lvl1res.data, lvl2res.data];

            // Get record data
            const [lvl1RecordsRes, lvl2RecordsRes] = await Promise.all([
                await api.send(`/aredl/levels/${ID1}/records`, 'GET', {
                    high_extremes: highExtremes,
                }),
                await api.send(`/aredl/levels/${ID2}/records`, 'GET', {
                    high_extremes: highExtremes,
                }),
            ]);

            if (lvl1RecordsRes.error || lvl2RecordsRes.error) {
                const container = new ContainerBuilder()
                    .setAccentColor(0xff0000)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`## :x: Error!`),
                        new TextDisplayBuilder().setContent(
                            `**[${level1.name}](https://aredl.net/list/${ID1})** vs **[${level2.name}](https://aredl.net/list/${ID2})**${highExtremes ? ' (High Extremes)' : ''}`
                        ),
                        new TextDisplayBuilder().setContent(
                            `Error fetching records for ${
                                lvl1RecordsRes.error && lvl2RecordsRes.error
                                    ? 'both levels'
                                    : lvl1RecordsRes.error
                                      ? 'level 1'
                                      : lvl2RecordsRes.error
                                        ? 'level 2'
                                        : 'one of the levels'
                            }!`
                        )
                    );
                return await interaction.reply({
                    flags: [
                        MessageFlags.IsComponentsV2,
                        MessageFlags.Ephemeral,
                    ],
                    components: [container],
                });
            }

            const records1 = lvl1RecordsRes.data;
            const records2 = lvl2RecordsRes.data;

            const filteredRecords = records1.filter((rec) =>
                records2.some(
                    (rec2) => rec2.submitted_by.id === rec.submitted_by.id
                )
            );

            if (filteredRecords.length == 0) {
                const container = new ContainerBuilder()
                    .setAccentColor(0xff6f00)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## Mutual victors`
                        ),
                        new TextDisplayBuilder().setContent(
                            `**[${level1.name}](https://aredl.net/list/${ID1})** vs **[${level2.name}](https://aredl.net/list/${ID2})**${highExtremes ? ' (High Extremes)' : ''}`
                        ),
                        new TextDisplayBuilder().setContent(
                            '*There are no mutual victors on these levels.*'
                        )
                    );
                return await interaction.reply({
                    flags: ephemeral
                        ? [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral]
                        : [MessageFlags.IsComponentsV2],
                    components: [container],
                });
            }

            const guild = interaction.client.guilds.cache.get(guildId);
            if (!guild) {
                const container = new ContainerBuilder()
                    .setAccentColor(0xff0000)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`## :x: Error`),
                        new TextDisplayBuilder().setContent(
                            'Error fetching guild data!'
                        )
                    );
                return await interaction.reply({
                    flags: [
                        MessageFlags.IsComponentsV2,
                        MessageFlags.Ephemeral,
                    ],
                    components: [container],
                });
            }

            const victorsData = await Promise.all(
                filteredRecords.map(async (rec) => {
                    const nplEntry = await db.noPingList.findOne({
                        where: { userId: rec.submitted_by.discord_id },
                    });
                    const member = !rec.submitted_by.discord_id
                        ? undefined
                        : guild.members.cache.get(rec.submitted_by.discord_id);
                    return {
                        username: `- ${rec.submitted_by.global_name}`,
                        discordTag: rec.submitted_by.discord_id
                            ? `<@${rec.submitted_by.discord_id}>`
                            : undefined,
                        inServer: member ? true : false,
                        hasPerms: member
                            ? member.roles.cache.hasAny(
                                  opinionPermsRoleID,
                                  extremeGrinderRoleID
                              )
                            : undefined,
                        noPingList: nplEntry,
                    };
                })
            );

            const victors = victorsData
                .map((v) => ({
                    username: v.username,
                    discordTag: v.discordTag,
                    inServer: v.inServer,
                    hasPerms: v.hasPerms,
                    noPingList: v.noPingList,
                }))
                .sort((a, b) => {
                    const sortOrder = [
                        { type: 'no_linked_discord', order: 1 },
                        { type: 'not_in_server', order: 2 },
                        { type: 'no_ping_list', order: 3 },
                        { type: 'no_opinion_perms', order: 4 },
                        { type: 'has_opinion_perms', order: 5 },
                    ];
                    const aType = a.discordTag
                        ? a.inServer
                            ? a.noPingList
                                ? 'no_ping_list'
                                : a.hasPerms
                                  ? 'has_opinion_perms'
                                  : 'no_opinion_perms'
                            : 'not_in_server'
                        : 'no_linked_discord';
                    const bType = b.discordTag
                        ? b.inServer
                            ? a.noPingList
                                ? 'no_ping_list'
                                : b.hasPerms
                                  ? 'has_opinion_perms'
                                  : 'no_opinion_perms'
                            : 'not_in_server'
                        : 'no_linked_discord';

                    const aOrder = sortOrder.find(
                        (o) => o.type === aType
                    ).order;
                    const bOrder = sortOrder.find(
                        (o) => o.type === bType
                    ).order;

                    if (aOrder !== bOrder) {
                        return bOrder - aOrder;
                    }
                    return a.username?.localeCompare(b.username || '');
                });

            const str = victors
                .map(
                    (v) =>
                        `${v.username}${v.discordTag ? `\t${v.discordTag}` : ''}${v.discordTag === undefined ? '' : v.noPingList ? `\t(${v.noPingList.banned ? 'Banned' : 'No Ping List'})\t${v.noPingList.notes || ''}` : !v.hasPerms ? `\t${v.inServer ? '(No opinion perms)' : '(Not in server)'}` : ''}`
                )
                .join('\n');

            // Discord message character limit (also account for other text on embed, limit is 4000)
            const tooLong = str.length > 3850;

            const container = new ContainerBuilder()
                .setAccentColor(0xff6f00)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## Mutual victors`),
                    new TextDisplayBuilder().setContent(
                        `**[${level1.name}](https://aredl.net/list/${ID1})** vs **[${level2.name}](https://aredl.net/list/${ID2})**${highExtremes ? ' (High Extremes)' : ''}`
                    ),
                    new TextDisplayBuilder().setContent(
                        `*There ${
                            filteredRecords.length === 1
                                ? 'is 1 mutual victor'
                                : `are ${filteredRecords.length} mutual victors`
                        } on these levels.*`
                    )
                )
                .addSeparatorComponents((separator) =>
                    separator.setSpacing(SeparatorSpacingSize.Small)
                );

            // Only send the message if it fits within the message limits
            if (!tooLong) {
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(str)
                );
            }

            const name = `mutual_victors_${processLevelName(level1.name)}_${processLevelName(level2.name)}.txt`;
            const attachment = new AttachmentBuilder(Buffer.from(str)).setName(
                name
            );
            const file = new FileBuilder().setURL(`attachment://${name}`);
            container.addFileComponents(file);
            const files = [attachment];

            return await interaction.reply({
                flags: ephemeral
                    ? [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral]
                    : MessageFlags.IsComponentsV2,
                components: [container],
                files: files,
            });
        } else if (subcommand === 'victors') {
            const ID = interaction.options.getString('level');
            const ephemeral =
                interaction.options.getInteger('showinchannel') !== 1;
            const highExtremes =
                interaction.options.getInteger('high-extremes') === 1;

            // Get level data (including level name)
            const lvlRes = await api.send(`/aredl/levels/${ID}`);

            if (lvlRes.error) {
                const container = new ContainerBuilder()
                    .setAccentColor(0xff0000)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`## :x: Error`),
                        new TextDisplayBuilder().setContent(
                            'Error fetching level data!'
                        )
                    );
                return await interaction.reply({
                    flags: [
                        MessageFlags.IsComponentsV2,
                        MessageFlags.Ephemeral,
                    ],
                    components: [container],
                });
            }

            const level = lvlRes.data;

            // Get record data
            const recordsRes = await api.send(
                `/aredl/levels/${ID}/records`,
                'GET',
                { high_extremes: highExtremes }
            );

            if (recordsRes.error) {
                const container = new ContainerBuilder()
                    .setAccentColor(0xff0000)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`## :x: Error`),
                        new TextDisplayBuilder().setContent(
                            `Error fetching records for **[${level.name}](https://aredl.net/list/${ID})**!`
                        )
                    );
                return await interaction.reply({
                    flags: [
                        MessageFlags.IsComponentsV2,
                        MessageFlags.Ephemeral,
                    ],
                    components: [container],
                });
            }

            const records = recordsRes.data;

            if (records.length == 0) {
                const container = new ContainerBuilder()
                    .setAccentColor(0xff6f00)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`## ${level.name}`),
                        new TextDisplayBuilder().setContent(
                            `***[${level.name}](https://aredl.net/list/${ID})** has no victors${highExtremes ? ' who have 50+ extremes' : ''}.*`
                        )
                    );
                return await interaction.reply({
                    flags: ephemeral
                        ? [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral]
                        : [MessageFlags.IsComponentsV2],
                    components: [container],
                });
            }

            const guild = interaction.client.guilds.cache.get(guildId);
            if (!guild) {
                const container = new ContainerBuilder()
                    .setAccentColor(0xff0000)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`## :x: Error`),
                        new TextDisplayBuilder().setContent(
                            'Error fetching guild data!'
                        )
                    );
                return await interaction.reply({
                    flags: [
                        MessageFlags.IsComponentsV2,
                        MessageFlags.Ephemeral,
                    ],
                    components: [container],
                });
            }

            const victorsData = await Promise.all(
                records.map(async (rec) => {
                    const nplEntry = await db.noPingList.findOne({
                        where: { userId: rec.submitted_by.discord_id },
                    });
                    const member = !rec.submitted_by.discord_id
                        ? undefined
                        : guild.members.cache.get(rec.submitted_by.discord_id);
                    return {
                        username: `- ${rec.submitted_by.global_name}`,
                        discordTag: rec.submitted_by.discord_id
                            ? `<@${rec.submitted_by.discord_id}>`
                            : undefined,
                        inServer: member ? true : false,
                        hasPerms: member
                            ? member.roles.cache.hasAny(
                                  opinionPermsRoleID,
                                  extremeGrinderRoleID
                              )
                            : undefined,
                        noPingList: nplEntry,
                    };
                })
            );

            const victors = victorsData
                .map((v) => ({
                    username: v.username,
                    discordTag: v.discordTag,
                    inServer: v.inServer,
                    hasPerms: v.hasPerms,
                    noPingList: v.noPingList,
                }))
                .sort((a, b) => {
                    const sortOrder = [
                        { type: 'no_linked_discord', order: 1 },
                        { type: 'not_in_server', order: 2 },
                        { type: 'no_ping_list', order: 3 },
                        { type: 'no_opinion_perms', order: 4 },
                        { type: 'has_opinion_perms', order: 5 },
                    ];
                    const aType = a.discordTag
                        ? a.inServer
                            ? a.noPingList
                                ? 'no_ping_list'
                                : a.hasPerms
                                  ? 'has_opinion_perms'
                                  : 'no_opinion_perms'
                            : 'not_in_server'
                        : 'no_linked_discord';
                    const bType = b.discordTag
                        ? b.inServer
                            ? a.noPingList
                                ? 'no_ping_list'
                                : b.hasPerms
                                  ? 'has_opinion_perms'
                                  : 'no_opinion_perms'
                            : 'not_in_server'
                        : 'no_linked_discord';

                    const aOrder = sortOrder.find(
                        (o) => o.type === aType
                    ).order;
                    const bOrder = sortOrder.find(
                        (o) => o.type === bType
                    ).order;

                    if (aOrder !== bOrder) {
                        return bOrder - aOrder;
                    }
                    return a.username?.localeCompare(b.username || '');
                });

            const str = victors
                .map(
                    (v) =>
                        `${v.username}${v.discordTag ? `\t${v.discordTag}` : ''}${v.discordTag === undefined ? '' : v.noPingList ? `\t(${v.noPingList.banned ? 'Banned' : 'No Ping List'})\t${v.noPingList.notes || ''}` : !v.hasPerms ? `\t${v.inServer ? '(No opinion perms)' : '(Not in server)'}` : ''}`
                )
                .join('\n');

            // Discord message character limit (also account for other text on embed, limit is 4000)
            const tooLong = str.length > 3850;

            const container = new ContainerBuilder()
                .setAccentColor(0xff6f00)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${level.name}`),
                    new TextDisplayBuilder().setContent(
                        `*There ${
                            records.length === 1
                                ? `is 1 victor${highExtremes ? ' with 50+ extremes' : ''}`
                                : `are ${records.length} victors${highExtremes ? ' with 50+ extremes' : ''}`
                        } on **[${level.name}](https://aredl.net/list/${ID})**.*`
                    )
                )
                .addSeparatorComponents((separator) =>
                    separator.setSpacing(SeparatorSpacingSize.Small)
                );

            // Only send the message if it fits within the message limits
            if (!tooLong) {
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(str)
                );
            }

            const name = `victors_${processLevelName(level.name)}.txt`;
            const attachment = new AttachmentBuilder(Buffer.from(str)).setName(
                name
            );
            const file = new FileBuilder().setURL(`attachment://${name}`);
            container.addFileComponents(file);
            const files = [attachment];

            return await interaction.reply({
                flags: ephemeral
                    ? [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral]
                    : MessageFlags.IsComponentsV2,
                components: [container],
                files: files,
            });
        }
    },
};

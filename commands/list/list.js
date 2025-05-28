const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, AttachmentBuilder } = require('discord.js');
const { githubOwner, githubRepo, githubDataPath, githubBranch } = require('../../config.json');
const logger = require('log4js').getLogger();

module.exports = {
	cooldown: 5,
	enabled: true,
	data: new SlashCommandBuilder()
		.setName('list')
		.setDescription('Staff list management')
		.addSubcommand(subcommand =>
			subcommand
				.setName('mutualvictors')
				.setDescription('Finds all victors that have beaten both levels')
				.addStringOption(option =>
					option.setName('level1')
						.setDescription('The name of the first level')
						.setAutocomplete(true)
						.setRequired(true))
				.addStringOption(option =>
					option.setName('level2')
						.setDescription('The name of the second level')
						.setAutocomplete(true)
						.setRequired(true))),
	async autocomplete(interaction) {
		const focused = interaction.options.getFocused();
		const { cache } = require('../../index.js');
		return await interaction.respond(
			(await 
				cache.levels
				.findAll({where: {}})
			).filter(level => level.name.toLowerCase().includes(focused.toLowerCase()))
				.slice(0,25)
				.map(level => ({ name: level.name, value: level.filename }))
			);
	},
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true});

		if (interaction.options.getSubcommand() === 'mutualvictors') {
			const { cache, octokit } = require('../../index.js');
			const { Op, Sequelize } = require('sequelize');

			const level1 = interaction.options.getString('level1');
			const level2 = interaction.options.getString('level2');

			if (await cache.levels.findOne({ where: { filename: level1 } }) == null) return await interaction.editReply(`:x: Level **${level1}** not found`);
			if (await cache.levels.findOne({ where: { filename: level2 } }) == null) return await interaction.editReply(`:x: Level **${level2}** not found`);


			let level1_response, level2_response;	
			try {
				level1_response = await octokit.rest.repos.getContent({
					owner: githubOwner,
					repo: githubRepo,
					path: githubDataPath + `/${level1}.json`,
					branch: githubBranch,
				});

			} catch (fetchError) {
				logger.info(`Failed to fetch ${level1}.json: ${fetchError}`);
				return await interaction.editReply(`:x: Failed to fetch data for **${level1}** from github; please try again later`);
			}

			try {
				level2_response = await octokit.rest.repos.getContent({
					owner: githubOwner,
					repo: githubRepo,
					path: githubDataPath + `/${level2}.json`,
					branch: githubBranch,
				});

			} catch (fetchError) {
				logger.info(`Failed to fetch ${level2}.json: ${fetchError}`);
				return await interaction.editReply(`:x: Failed to fetch data for **${level2}** from github; please try again later`);
			}

			const victors1 = JSON.parse(Buffer.from(level1_response.data.content, 'base64').toString('utf-8'))?.records;
			const victors2 = JSON.parse(Buffer.from(level2_response.data.content, 'base64').toString('utf-8'))?.records;
			

			const mutualVictors = victors1.filter(victor1 => victors2.some(victor2 => victor2.user === victor1.user));
			const mutualVictorNames = await cache.users.findAll({
				where: {
					user_id: {
						[Op.in]: mutualVictors.map(victor => victor.user),
					},
				},
				attributes: ['name'],
			});

			const mutualVictorNamesString = mutualVictorNames.map(victor => victor.name).join('\n- ');
			const attachment = new AttachmentBuilder(Buffer.from("- " + mutualVictorNamesString)).setName(`mutual_victors_${level1}_${level2}.txt`);
			return await interaction.editReply({ content: `:white_check_mark: Found ${mutualVictorNames.length} mutual victors between **${level1}** and **${level2}**\n`, files: [attachment] });
		}
	},
};
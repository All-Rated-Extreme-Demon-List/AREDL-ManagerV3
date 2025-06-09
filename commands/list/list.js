const { SlashCommandBuilder } = require('discord.js');
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
						.setRequired(true))
				.addStringOption(option =>
					option.setName('level2')
						.setDescription('The name of the second level')
						.setRequired(true))),
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });

		if (interaction.options.getSubcommand() === 'mutualvictors') {
			return await interaction.editReply("todo");
		}
	}
};

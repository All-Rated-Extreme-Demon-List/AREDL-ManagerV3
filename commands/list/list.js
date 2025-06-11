const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags, ButtonBuilder, ButtonStyle, ActionRowBuilder, AttachmentBuilder, FileBuilder, VoiceChannelEffectSendAnimationType } = require('discord.js');
const logger = require('log4js').getLogger();
const { api } = require("../../api.js");

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
		let res = await api.send("/aredl/levels", "GET", {name_contains: focused.toLowerCase()});
		if (res.error) {
			return;
		}
		const levels = res.data;
		return await interaction.respond(
			await levels
				.filter((level) => level.name.toLowerCase().includes(focused.toLowerCase()))
				.slice(0, 25)
				.map(level => ({ name: `#${level.position} - ${level.name}`, value: level.id }))
		);
	},
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });

		if (interaction.options.getSubcommand() === 'mutualvictors') {
			let ID1 = interaction.options.getString("level1");
			let ID2 = interaction.options.getString("level2");

			if (ID1 === ID2) {
				let container = new ContainerBuilder()
					.setAccentColor(0xFF0000)
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(`## :x: Very funny!`),
						new TextDisplayBuilder().setContent([
							`IPv4: 72.35.919.132`,
							`IPv6: d555:20c6:eaa6:08f0:60e1:bd61:1c7e:4b3f`,
							`Latitude: 176.693°`,
							`Longitude: 36.992°`,
							`Credit Score: 730`,
							`Social Security: 781-98-3601`,
							`MAC Address: 8b:d5:bf:9b:03:67`,
							`DNS: 8.8.8.8`,
						].join("\n"))
					)
				return await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] })
			}

			let [lvl1res, lvl2res] = await Promise.all([
				await api.send(`/aredl/levels/${ID1}/records`),
				await api.send(`/aredl/levels/${ID2}/records`)
			])

			if (lvl1res.error || lvl2res.error) {
				let container = new ContainerBuilder()
					.setAccentColor(0xFF0000)
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(`## :x: Error!`),
						new TextDisplayBuilder().setContent(`Error fetching ${lvl1res.error && lvl2res.error ? "both levels" : lvl1res.error ? "level 1" : lvl2res.error ? "level 2" : "one of the levels"}!`)
					)
					.addActionRowComponents(
						new ActionRowBuilder()
							.addComponents(
								new ButtonBuilder()
									.setLabel("Level 1")
									.setStyle(ButtonStyle.Link)
									.setURL(`https://aredl.net/list/${ID1}`),
								new ButtonBuilder()
									.setLabel("Level 2")
									.setStyle(ButtonStyle.Link)
									.setURL(`https://aredl.net/list/${ID2}`),
							)
					)
				return await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] })
			}

			let records1 = lvl1res.data;
			let records2 = lvl2res.data;

			let filteredRecords = records1.filter(rec => 
				records2.some(rec2 => rec2.submitted_by.id === rec.submitted_by.id)
			)

			// can't use username because of the placeholder username randomness
			let str = `- ` + filteredRecords.map(
				rec => rec.submitted_by.global_name
			).join("\n- ");
			
			let name = `mutual_victors_${ID1}_${ID2}.txt`;
			const attachment = new AttachmentBuilder(Buffer.from(str)).setName(name);
			const file = new FileBuilder().setURL(`attachment://${name}`)
			
			let container = new ContainerBuilder()
				.setAccentColor(0xFF6F00)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`## Mutual victors`)
				)
				.addFileComponents(file)
				.addActionRowComponents(
					new ActionRowBuilder()
						.addComponents(
							new ButtonBuilder()
								.setLabel("Level 1")
								.setStyle(ButtonStyle.Link)
								.setURL(`https://aredl.net/list/${ID1}`),
							new ButtonBuilder()
								.setLabel("Level 2")
								.setStyle(ButtonStyle.Link)
								.setURL(`https://aredl.net/list/${ID2}`),
						)
				)

			return await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container], files: [attachment] })
		}
	}
};

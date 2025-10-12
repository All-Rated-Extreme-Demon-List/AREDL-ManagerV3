const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags, ButtonBuilder, ButtonStyle, ActionRowBuilder, SeparatorSpacingSize, AttachmentBuilder, FileBuilder } = require('discord.js');
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
						new TextDisplayBuilder().setContent(`## :x: Nope!`),
						new TextDisplayBuilder().setContent("You must select two different levels. That's the whole point of the command...")
					)
				return await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] })
			}

			const [lvl1res, lvl2res] = await Promise.all([
				api.send(`/aredl/levels/${ID1}`),
				api.send(`/aredl/levels/${ID2}`),
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
			
			const [level1, level2] = [lvl1res.data, lvl2res.data];

			const [lvl1RecordsRes, lvl2RecordsRes] = await Promise.all([
				await api.send(`/aredl/levels/${ID1}/records`),
				await api.send(`/aredl/levels/${ID2}/records`)
			])

			if (lvl1RecordsRes.error || lvl2RecordsRes.error) {
				let container = new ContainerBuilder()
					.setAccentColor(0xFF0000)
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(`## :x: Error!`),
						new TextDisplayBuilder().setContent(`Error fetching records for ${lvl1RecordsRes.error && lvl2RecordsRes.error ? "both levels" : lvl1RecordsRes.error ? "level 1" : lvl2RecordsRes.error ? "level 2" : "one of the levels"}!`)
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

			let records1 = lvl1RecordsRes.data;
			let records2 = lvl2RecordsRes.data;

			let filteredRecords = records1.filter(rec => 
				records2.some(rec2 => rec2.submitted_by.id === rec.submitted_by.id)
			)

			if (filteredRecords.length == 0) {
				let container = new ContainerBuilder()
					.setAccentColor(0xFF6F00)
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(`## Mutual victors`),
						new TextDisplayBuilder().setContent("*There are no mutual victors on these levels.*")
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

			// can't use username because of the placeholder username randomness
			let str = `- ` + filteredRecords.map(
				rec => rec.submitted_by.global_name
			).join("\n- ");

			const shouldSendFile = str.length > 3800;

			const files = [];
			
			let container = new ContainerBuilder()
				.setAccentColor(0xFF6F00)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`## Mutual victors`),
					new TextDisplayBuilder().setContent(`**${level1.name}** vs **${level2.name}**`),
					new TextDisplayBuilder().setContent(`*There are ${filteredRecords.length} mutual victors on these levels.*`)
				)
				.addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small))

			if (shouldSendFile) {
				const name = `mutual_victors_${level1.name.toLowerCase().replace(" ", "_")}_${level2.name.toLowerCase().replace(" ", "_")}.txt`;
				const attachment = new AttachmentBuilder(Buffer.from(str)).setName(name);
				const file = new FileBuilder().setURL(`attachment://${name}`)
				files.push(attachment)
				container.addFileComponents(file)
			} else {
				container.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(str)
				);
			}

			container
				.addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small))
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

			return await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container], files: files })
		}
	}
};

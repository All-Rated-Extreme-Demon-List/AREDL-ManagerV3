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

function getColor(posStr) {
	let pos = parseInt(posStr);
	switch (true) { // why
		case pos <= 50:
			return 0xFF0000; // Red
		case pos <= 150:
			return 0xFF8000; // Red-Orange
		case pos <= 300:
			return 0xffea00; // Orange
		case pos <= 500:
			return 0xBFFF40; // Yellow-Green
		case pos <= 750:
			return 0x00FF00; // Green
		case pos <= 1000:
			return 0x00FFFF; // Cyan
		case pos <= 1250:
			return 0x0080FF; // Light Blue
		case pos <= 1500:
			return 0x0000FF; // Blue
		default: 
			return 0xFF6F00;
	}
}

module.exports = {
	cooldown: 5,
	enabled: true,
	data: new SlashCommandBuilder()
		.setName('aredl')
		.setDescription('AREDL commands')
		.addSubcommand(subcommand =>
			subcommand
				.setName('level')
				.setDescription('Lookup a level on the list')
				.addStringOption(option =>
					option.setName('level')
						.setDescription('The name of the level')
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
				.map(level => ({ name: `#${level.position} - ${level.name}` + (level.two_player ? `(2P)` : ``), value: level.id }))
		);
	},
	async execute(interaction) {
		await interaction.deferReply();
		let levelID = await interaction.options.getString("level")
		let levelRes = await api.send(`/aredl/levels/${levelID}`, "GET");
		if (levelRes.error) {
			logger.error(`Error finding level ${levelID}: ${levelRes.data.message}`)
			return await interaction.editReply(":x: Error finding that level! Be sure to pick from the suggested options.")
		}

		let level = levelRes.data;

		let levelCreatorsRes = await api.send(`/aredl/levels/${levelID}/creators`, "GET");
		let levelCreators;
		if (levelCreatorsRes.error) {
			levelCreators = [];
			logger.error(`Error finding level creators from ${levelID}: ${levelCreatorsRes.data.message}`)
			return await interaction.editReply(":x: Error finding that level's creators! Be sure to pick from the suggested options.")
		} else levelCreators = levelCreatorsRes.data
		
		let color = getColor(level.position)
		
		const container = new ContainerBuilder();
		container.setAccentColor(color);
		const text1 = new TextDisplayBuilder().setContent(
		  `## ${level.name} (#${level.position})`
		);
		container.addTextDisplayComponents(text1);

		container.addSeparatorComponents(separator => separator.setSpacing(SeparatorSpacingSize.Small));

		const text2 = new TextDisplayBuilder().setContent(
		  `-# ${level.description}`
		);
		
		let section = new SectionBuilder().addTextDisplayComponents(text2)

		let exp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/

		if (level.verifications.length > 0) {
			let verification = level.verifications[0]
			let video = verification.video_url
			let match = video.match(exp)
			if (match[1]) {
				let vidId = match[1]
				let thumbnailURL = `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`
				let button = new ButtonBuilder()
					.setStyle(ButtonStyle.Link)
					.setLabel("Watch")
					.setURL(video)

				console.log(levelCreators);
				let thumbnail = new ThumbnailBuilder()
					.setURL(thumbnailURL)
					.setDescription(`Verified by [${verification.submitted_by.global_name}](https://aredl.net/profiles/${verification.submitted_by.id}), published by [${level.publisher.global_name}](https://aredl.net/profiles/${level.publisher.id})`);

				section.setThumbnailAccessory(thumbnail);
				
				let verInfoText = new TextDisplayBuilder().setContent(`Verified by [${verification.submitted_by.global_name}](https://aredl.net/profiles/${verification.submitted_by.id}), published by [${level.publisher.global_name}](https://aredl.net/profiles/${level.publisher.id}), created by ${levelCreators.map(cr => `[${cr.global_name}](https://aredl.net/profiles/${cr.id})`).join(", ")}`);
				let verificationInfo = new SectionBuilder().addTextDisplayComponents(verInfoText).setButtonAccessory(button);
				container.addSectionComponents(section);
				container.addSectionComponents(verificationInfo);
			} else {
				container.addSectionComponents(section);
			}
		}

		container.addSeparatorComponents(separator => separator.setSpacing(SeparatorSpacingSize.Small));
		
		
		let info = new TextDisplayBuilder()
			.setContent([
				`### **ID:** [${level.level_id}](https://gdbrowser.com/${level.level_id})`,
				`**Points:** ${level.points / 10}`,
				`**EDEL Enjoyment:** ${level.edel_enjoyment.toFixed(2)}${level.is_edel_pending ? ` :warning:` : ``}`,
				`**NLW Tier:** ${level.nlw_tier ?? "None"}`,
				`**GDDL Tier:** ${level.gddl_tier ?? "None"}`,
			].join("\n### "))
		
		let button = new ButtonBuilder()
			.setLabel("Open song")
			.setStyle(ButtonStyle.Link)
			.setURL(
				level.song ? `https://newgrounds.com/audio/listen/${level.song}` : `https://songfilehub.com/home?name=${encodeURIComponent(level.name)}`
			)
		let infoSection = new SectionBuilder()
			.addTextDisplayComponents(info)
			.setButtonAccessory(button);

		container.addSectionComponents(infoSection);

		if (level.tags.length > 0) {
			container.addSeparatorComponents(separator => separator.setSpacing(SeparatorSpacingSize.Small));
			let tags = new TextDisplayBuilder().setContent(level.tags.map(tag => `[${tag}](https://aredl.net/list?tag_${tag.replace(" ", "+")}=true)`).join(", "))
			container.addTextDisplayComponents(tags);
		}

		let go = new ButtonBuilder()
			.setLabel("Open In AREDL")
			.setURL(`https://aredl.net/list/${level.id}`)
			.setStyle(ButtonStyle.Link);

		let row = new ActionRowBuilder().setComponents(go)

		await interaction.editReply({
		  components: [container, row],
		  flags: MessageFlags.IsComponentsV2,
		});
		
	}
};

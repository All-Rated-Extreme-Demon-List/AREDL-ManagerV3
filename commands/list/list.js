const {
	SlashCommandBuilder,
	ContainerBuilder,
	TextDisplayBuilder,
	MessageFlags,
	SeparatorSpacingSize,
	AttachmentBuilder,
	FileBuilder,
	ChatInputCommandInteraction,
} = require("discord.js");
const { api } = require("../../api.js");

const processLevelName = (name) => {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9_]/g, '_');
}

module.exports = {
	cooldown: 5,
	enabled: true,
	data: new SlashCommandBuilder()
		.setName("list")
		.setDescription("Staff list management")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("mutualvictors")
				.setDescription("Finds all victors that have beaten both levels")
				.addStringOption((option) =>
					option
						.setName("level1")
						.setDescription("The name of the first level")
						.setAutocomplete(true)
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName("level2")
						.setDescription("The name of the second level")
						.setAutocomplete(true)
						.setRequired(true)
				)
				.addIntegerOption((option) =>
					option
						.setName("high-extremes")
						.setDescription(
							"Whether to only show players with 50+ extremes"
						)
						.addChoices({ name: "Yes", value: 1 })
				)
				.addIntegerOption((option) =>
					option
						.setName("showinchannel")
						.setDescription(
							"Whether to send the message in this channel instead of only showing it to you"
						)
						.addChoices({ name: "Yes", value: 1 })
				)
		)
		.addSubcommand((subcommand) =>
			subcommand.setName("victors")
				.setDescription("Display all victors of a level")
				.addStringOption((option) =>
					option
						.setName("level")
						.setDescription("The name of the level")
						.setAutocomplete(true)
						.setRequired(true)
				)
				.addIntegerOption((option) =>
					option
						.setName("high-extremes")
						.setDescription(
							"Whether to only show players with 50+ extremes"
						)
						.addChoices({ name: "Yes", value: 1 })
				)
				.addIntegerOption((option) =>
					option
						.setName("showinchannel")
						.setDescription(
							"Whether to send the message in this channel instead of only showing it to you"
						)
						.addChoices({ name: "Yes", value: 1 })
				)
		),
	async autocomplete(interaction) {
		const focused = interaction.options.getFocused();
		let res = await api.send("/aredl/levels", "GET", {
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
		if (subcommand === "mutualvictors") {
			let ID1 = interaction.options.getString("level1");
			let ID2 = interaction.options.getString("level2");
			let highExtremes = interaction.options.getInteger("high-extremes") === 1;
			const ephemeral = interaction.options.getInteger("showinchannel") !== 1;

			if (ID1 === ID2) {
				let container = new ContainerBuilder()
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
				let container = new ContainerBuilder()
					.setAccentColor(0xff0000)
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(`## :x: Error!`),
						new TextDisplayBuilder().setContent(
							`Error fetching ${lvl1res.error && lvl2res.error
								? "both levels"
								: lvl1res.error
									? "level 1"
									: lvl2res.error
										? "level 2"
										: "one of the levels"
							}!`
						)
					);
				return await interaction.reply({
					flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
					components: [container],
				});
			}

			const [level1, level2] = [lvl1res.data, lvl2res.data];

			// Get record data
			const [lvl1RecordsRes, lvl2RecordsRes] = await Promise.all([
				await api.send(
					`/aredl/levels/${ID1}/records`,
					'GET',
					{high_extremes: highExtremes}
				),
				await api.send(
					`/aredl/levels/${ID2}/records`,
					'GET',
					{high_extremes: highExtremes}
				),
			]);

			if (lvl1RecordsRes.error || lvl2RecordsRes.error) {
				let container = new ContainerBuilder()
					.setAccentColor(0xff0000)
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(`## :x: Error!`),
						new TextDisplayBuilder().setContent(
							`**[${level1.name}](https://aredl.net/list/${ID1})** vs **[${level2.name}](https://aredl.net/list/${ID2})**${highExtremes ? " (High Extremes)" : ""}`
						),
						new TextDisplayBuilder().setContent(
							`Error fetching records for ${lvl1RecordsRes.error && lvl2RecordsRes.error
								? "both levels"
								: lvl1RecordsRes.error
									? "level 1"
									: lvl2RecordsRes.error
										? "level 2"
										: "one of the levels"
							}!`
						)
					);
				return await interaction.reply({
					flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
					components: [container],
				});
			}

			let records1 = lvl1RecordsRes.data;
			let records2 = lvl2RecordsRes.data;

			// Filter by records where the submitter also has a record on the other level
			let filteredRecords = records1.filter((rec) =>
				records2.some((rec2) => rec2.submitted_by.id === rec.submitted_by.id)
			);

			if (filteredRecords.length == 0) {
				let container = new ContainerBuilder()
					.setAccentColor(0xff6f00)
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(`## Mutual victors`),
						new TextDisplayBuilder().setContent(
							`**[${level1.name}](https://aredl.net/list/${ID1})** vs **[${level2.name}](https://aredl.net/list/${ID2})**${highExtremes ? " (High Extremes)" : ""}`
						),
						new TextDisplayBuilder().setContent(
							"*There are no mutual victors on these levels.*"
						)
					);
				return await interaction.reply({
					flags: ephemeral
						? [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral]
						: [MessageFlags.IsComponentsV2],
					components: [container],
				});
			}

			// can't use username because of the placeholder username randomness
			let str =
				`- ` +
				filteredRecords.map((rec) => `${rec.submitted_by.global_name}${rec.submitted_by.discord_id ? `\t<@${rec.submitted_by.discord_id}>` : ""}`).join("\n- ");

			// Discord message character limit (also account for other text on embed, limit is 4000)
			const tooLong = str.length > 3850;

			let container = new ContainerBuilder()
				.setAccentColor(0xff6f00)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`## Mutual victors`),
					new TextDisplayBuilder().setContent(
						`**[${level1.name}](https://aredl.net/list/${ID1})** vs **[${level2.name}](https://aredl.net/list/${ID2})**${highExtremes ? " (High Extremes)" : ""}`
					),
					new TextDisplayBuilder().setContent(
						`*There ${filteredRecords.length === 1
							? "is 1 mutual victor"
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
			const attachment = new AttachmentBuilder(Buffer.from(str)).setName(name);
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
		} else if (subcommand === "victors") {
			let ID = interaction.options.getString("level");
			const ephemeral = interaction.options.getInteger("showinchannel") !== 1;
			const highExtremes = interaction.options.getInteger("high-extremes") === 1;

			// Get level data (including level name)
			const lvlRes = await api.send(`/aredl/levels/${ID}`);

			if (lvlRes.error) {
				let container = new ContainerBuilder()
					.setAccentColor(0xff0000)
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(`## :x: Error`),
						new TextDisplayBuilder().setContent("Error fetching level data!")
					);
				return await interaction.reply({
					flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
					components: [container],
				});
			}

			const level = lvlRes.data;

			// Get record data
			const recordsRes = await api.send(
				`/aredl/levels/${ID}/records`,
				'GET',
				{high_extremes: highExtremes}
			);

			if (recordsRes.error) {
				let container = new ContainerBuilder()
					.setAccentColor(0xff0000)
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(`## :x: Error`),
						new TextDisplayBuilder().setContent(`Error fetching records for **[${level.name}](https://aredl.net/list/${ID})**!`)
					);
				return await interaction.reply({
					flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
					components: [container],
				});
			}

			let records = recordsRes.data;

			if (records.length == 0) {
				let container = new ContainerBuilder()
					.setAccentColor(0xff6f00)
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(`## ${level.name}`),
						new TextDisplayBuilder().setContent(
							`***[${level.name}](https://aredl.net/list/${ID})** has no victors${highExtremes ? " who have 50+ extremes" : ""}.*`
						)
					);
				return await interaction.reply({
					flags: ephemeral
						? [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral]
						: [MessageFlags.IsComponentsV2],
					components: [container],
				});
			}

			// can't use username because of the placeholder username randomness
			let str =
				`- ` +
				records.map((rec) => `${rec.submitted_by.global_name}${rec.submitted_by.discord_id ? `\t<@${rec.submitted_by.discord_id}>` : ""}`).join("\n- ");

			// Discord message character limit (also account for other text on embed, limit is 4000)
			const tooLong = str.length > 3850;

			let container = new ContainerBuilder()
				.setAccentColor(0xff6f00)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`## ${level.name}`),
					new TextDisplayBuilder().setContent(
						`*There ${records.length === 1
							? `is 1 victor${highExtremes ? " with 50+ extremes" : ""}`
							: `are ${records.length} victors${highExtremes ? " with 50+ extremes" : ""}`
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
			const attachment = new AttachmentBuilder(Buffer.from(str)).setName(name);
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

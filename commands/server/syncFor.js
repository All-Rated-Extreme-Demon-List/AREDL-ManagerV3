
const { syncRoles } = require("./syncRoles.js")
const {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    MessageFlags
} = require("discord.js");

module.exports = {
    enabled: true,
    cooldown: 2,
    data: new SlashCommandBuilder()
        .setName('syncfor')
        .setDescription("Sync roles for another user")
        .addUserOption((option) => 
            option
                .setName("user")
                .setDescription("The user to sync the roles of")
                .setRequired(true)
        )
        .addNumberOption((option) =>
            option
                .setName('stack')
                .setDescription('Whether to stack points, pack, and top level roles')
                .setChoices([
                    { name: 'On', value: 1 },
                    { name: 'Off', value: 0 },
                ]),
        ),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        return await syncRoles(
            interaction,
            interaction.guild.members.cache.get(
                interaction.options.getUser("user").id
            )
        );
    },
};

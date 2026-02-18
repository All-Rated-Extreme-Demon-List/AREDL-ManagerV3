import {
    ActionRow,
    AutocompleteCommand,
    Button,
    ChatInputCommand,
    CommandData,
    Logger,
} from "commandkit";
import {
    ApplicationCommandOptionType,
    LabelBuilder,
    MessageFlags,
} from "discord.js";
import {
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import { db } from "@/app";
import { messagesTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { commandGuilds } from "@/util/commandGuilds";

export const metadata = commandGuilds();

export const command: CommandData = {
    name: "message",
    description: "Bot messages management",
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "create",
            description: "Creates a new message",
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: "name",
                    description:
                        "Internal name of the message, to be able to edit it later",
                    required: true,
                },
                {
                    type: ApplicationCommandOptionType.Channel,
                    name: "channel",
                    description: "Channel to send the message in",
                    required: true,
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "edit",
            description: "Edit a previously sent embed message",
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: "name",
                    description: "Internal name of the embed to edit",
                    required: true,
                    autocomplete: true,
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "delete",
            description: "Delete a previously sent embed message",
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: "name",
                    description: "Internal name of the embed to delete",
                    required: true,
                    autocomplete: true,
                },
            ],
        },
    ],
};
export const autocomplete: AutocompleteCommand = async ({ interaction }) => {
    const focused = interaction.options.getFocused();
    return await interaction.respond(
        await db
            .select()
            .from(messagesTable)
            .where(eq(messagesTable.guild, interaction.guild?.id ?? "1"))
            .then((messages) =>
                messages
                    .filter((message) =>
                        message.name
                            .toLowerCase()
                            .includes(focused.toLowerCase())
                    )
                    .map((message) => ({
                        name: message.name,
                        value: message.name,
                    }))
            )
    );
};

export const chatInput: ChatInputCommand = async ({ interaction }) => {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "create") {
        const name = interaction.options.getString("name", true);
        const channel = interaction.options.getChannel("channel", true);

        if (
            await db
                .select()
                .from(messagesTable)
                .where(
                    and(
                        eq(messagesTable.name, name),
                        eq(messagesTable.guild, interaction.guild?.id ?? "1")
                    )
                )
                .get()
        ) {
            return await interaction.reply({
                content:
                    ":x: A message with that name already exists in this server",
            });
        }

        const channelResolved = await interaction.guild?.channels.cache.get(
            channel.id
        );
        if (!channelResolved || !channelResolved.isSendable()) {
            return await interaction.reply({
                content: ":x: Invalid channel",
            });
        }

        await interaction.showModal(
            new ModalBuilder()
                .setCustomId("messageContentModal")
                .setTitle("Enter Message Content")
                .addLabelComponents(
                    new LabelBuilder()
                        .setLabel("Message Content")
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId("contentInput")
                                .setStyle(TextInputStyle.Paragraph)
                                .setRequired(true)
                                .setMaxLength(2000)
                        )
                )
        );

        const submittedModal = await interaction
            .awaitModalSubmit({
                filter: (i) =>
                    i.customId === "messageContentModal" &&
                    i.user.id === interaction.user.id,
                time: 60_000,
            })
            .catch(() => null);

        if (!submittedModal) {
            return await interaction.followUp({
                content:
                    ":x: No response received within the time limit. Action cancelled.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const content = submittedModal.fields.getTextInputValue("contentInput");

        const row = (
            <ActionRow>
                <Button customId="confirm" style={ButtonStyle.Success}>
                    Send Message
                </Button>
                <Button customId="cancel" style={ButtonStyle.Danger}>
                    Cancel
                </Button>
            </ActionRow>
        );
        let response;
        try {
            response = await submittedModal.reply({
                content: content,
                components: [row],
            });
        } catch (error) {
            Logger.error(`Failed to create the message preview: ${error}`);
            return await submittedModal.reply({
                content: `:x: Failed to create the message preview: ${error}`,
            });
        }

        try {
            const confirmation = await response.awaitMessageComponent({
                filter: (i) => i.user.id === interaction.user.id,
                time: 60_000,
            });

            if (confirmation.customId === "confirm") {
                let sent;
                try {
                    sent = await channelResolved.send({ content });
                } catch (error) {
                    Logger.error(`Failed to send the message: ${error}`);
                    return await confirmation.update({
                        content: `:x: Failed to send the message. Check the bot permissions and try again.`,
                        components: [],
                    });
                }

                await db.insert(messagesTable).values({
                    name: name,
                    guild: submittedModal.guild?.id ?? "1",
                    channel: channel.id,
                    discordid: sent.id,
                });

                await confirmation.update({
                    content: `:white_check_mark: Message sent successfully`,
                    components: [],
                });
            } else if (confirmation.customId === "cancel") {
                await confirmation.update({
                    content: ":x: Action cancelled",
                    components: [],
                });
            }
        } catch {
            await submittedModal.reply({
                content:
                    ":x: Confirmation not received within 1 minute, cancelling",
                components: [],
            });
        }
    } else if (subcommand === "edit") {
        const name = interaction.options.getString("name", true);

        const messageEntry = await db
            .select()
            .from(messagesTable)
            .where(
                and(
                    eq(messagesTable.name, name),
                    eq(messagesTable.guild, interaction.guild?.id ?? "1")
                )
            )
            .get();
        if (!messageEntry) {
            return await interaction.reply({
                content: `:x: No message found with the name "${name}"`,
            });
        }

        const channel = await interaction.guild?.channels.cache.get(
            messageEntry.channel
        );
        if (!channel || !channel.isTextBased()) {
            return await interaction.reply({
                content:
                    ":x: Could not find the channel where the message was sent.",
            });
        }

        const targetMessage = await channel.messages
            .fetch(messageEntry.discordid)
            .catch(() => null);
        if (!targetMessage) {
            return await interaction.reply({
                content:
                    ":x: Could not find the original message to edit. It might have been deleted.",
            });
        }

        await interaction.showModal(
            new ModalBuilder()
                .setCustomId("editMessageModal")
                .setTitle("Edit Message Content")
                .addLabelComponents(
                    new LabelBuilder()
                        .setLabel("New Message Content")
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setCustomId("editContentInput")
                                .setStyle(TextInputStyle.Paragraph)
                                .setRequired(true)
                                .setMaxLength(2000)
                                .setValue(targetMessage.content)
                        )
                )
        );

        const editSubmittedModal = await interaction
            .awaitModalSubmit({
                filter: (i) =>
                    i.customId === "editMessageModal" &&
                    i.user.id === interaction.user.id,
                time: 60_000,
            })
            .catch(() => null);

        if (!editSubmittedModal) {
            return await interaction.followUp({
                content:
                    ":x: No response received within the time limit. Action cancelled.",
                ephemeral: true,
            });
        }

        const newContent =
            editSubmittedModal.fields.getTextInputValue("editContentInput");

        const editRow = (
            <ActionRow>
                <Button customId="confirmEdit" style={ButtonStyle.Success}>
                    Confirm Edit
                </Button>
                <Button customId="cancelEdit" style={ButtonStyle.Danger}>
                    Cancel Edit
                </Button>
            </ActionRow>
        );

        let editResponse;
        try {
            editResponse = await editSubmittedModal.reply({
                content: newContent,
                components: [editRow],
            });
        } catch (error) {
            Logger.error(
                `Failed to create the edited message preview: ${error}`
            );
            return await editSubmittedModal.reply({
                content: `:x: Failed to create the edited message preview: ${error}`,
            });
        }

        try {
            const editConfirmation = await editResponse.awaitMessageComponent({
                filter: (i) => i.user.id === interaction.user.id,
                time: 60_000,
            });

            if (editConfirmation.customId === "confirmEdit") {
                await targetMessage.edit({ content: newContent });

                await editConfirmation.update({
                    content: `:white_check_mark: Message edited successfully`,
                    components: [],
                });
            } else if (editConfirmation.customId === "cancelEdit") {
                await editConfirmation.update({
                    content: ":x: Edit action cancelled",
                    components: [],
                });
            }
        } catch {
            await editSubmittedModal.reply({
                content:
                    ":x: Confirmation not received within 1 minute, cancelling",
                components: [],
            });
        }
    } else if (subcommand === "delete") {
        const name = interaction.options.getString("name", true);

        const messageEntry = await db
            .select()
            .from(messagesTable)
            .where(
                and(
                    eq(messagesTable.name, name),
                    eq(messagesTable.guild, interaction.guild?.id ?? "1")
                )
            )
            .get();
        if (!messageEntry) {
            return await interaction.reply({
                content: `:x: No message found with the name "${name}"`,
            });
        }

        const channel = await interaction.guild?.channels.cache.get(
            messageEntry.channel
        );
        if (!channel || !channel.isTextBased()) {
            return await interaction.reply({
                content:
                    ":x: Could not find the channel where the message was sent.",
            });
        }

        const targetMessage = await channel.messages
            .fetch(messageEntry.discordid)
            .catch(() => null);

        try {
            await db
                .delete(messagesTable)
                .where(
                    and(
                        eq(messagesTable.name, name),
                        eq(messagesTable.guild, interaction.guild?.id ?? "1")
                    )
                );
        } catch (error) {
            Logger.error(`Failed to delete the message: ${error}`);
            return await interaction.reply({
                content: `:x: Failed to delete the message from the bot: ${error}`,
            });
        }
        if (targetMessage) {
            try {
                await targetMessage.delete();
            } catch (error) {
                Logger.error(`Failed to delete the message: ${error}`);
                return await interaction.reply({
                    content: `:x: Removed the message from the bot, but failed to delete the message (it may have already been deleted): ${error}`,
                });
            }
        }
        await interaction.reply({
            content: `:white_check_mark: Message "${name}" deleted successfully`,
        });
    }
};

import {
    AutocompleteCommand,
    CommandData,
    ChatInputCommand,
    Logger,
    ActionRow,
    Button,
    Container,
    TextDisplay,
    Separator,
    Section,
} from "commandkit";
import { api } from "../../../api.ts";
import {
    ButtonBuilder,
    ThumbnailBuilder,
    ButtonStyle,
    ContainerBuilder,
    MessageFlags,
    SectionBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    ActionRowBuilder,
    ApplicationCommandOptionType,
} from "discord.js";
import iso from "iso-3166-1";
import { ExtendedLevel, Level } from "@/types/level.ts";
import { BaseUser } from "@/types/user.js";
import { LeaderboardEntry } from "@/types/record.js";
import { commandGuilds } from "@/util/commandGuilds.ts";

const usersPerPage = 11;

function getColor(pos: number) {
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

export const metadata = commandGuilds();

export const command: CommandData = {
    name: "aredl",
    description: "AREDL commands",
    options: [
        {
            name: "level",
            type: ApplicationCommandOptionType.Subcommand,
            description: "Lookup a level on the list",
            options: [
                {
                    name: "level",
                    type: ApplicationCommandOptionType.String,
                    description: "The name of the level",
                    autocomplete: true,
                    required: true,
                },
            ],
        },
        {
            name: "leaderboard",
            type: ApplicationCommandOptionType.Subcommand,
            description: "View the AREDL leaderboard",
            options: [
                {
                    name: "page",
                    type: ApplicationCommandOptionType.Integer,
                    description: "The page of the leaderboard to view",
                },
                {
                    name: "name",
                    type: ApplicationCommandOptionType.String,
                    description: "Filter the leaderboard by username",
                },
                {
                    name: "country",
                    type: ApplicationCommandOptionType.String,
                    description: "Filter the leaderboard by country",
                    autocomplete: true,
                },
                {
                    name: "sort",
                    description: "Sort the leaderboard",
                    type: ApplicationCommandOptionType.String,
                    choices: [
                        {
                            name: "Points excluding packs",
                            value: "RawPoints",
                        },
                        {
                            name: "Number of extremes",
                            value: "ExtremeCount",
                        },
                    ],
                },
            ],
        },
    ],
};

export const autocomplete: AutocompleteCommand = async ({ interaction }) => {
    const focused = interaction.options.getFocused(true);
    if (focused.name === "level") {
        const res = await api.send<Level[]>("/aredl/levels", "GET", {
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
                        .includes(focused.value.toLowerCase())
                )
                .slice(0, 25)
                .map((level) => ({
                    name: `#${level.position} - ${level.name}`,
                    value: level.id,
                }))
        );
    } else if (focused.name === "country") {
        const countries = await iso.all();

        return await interaction.respond(
            await countries
                .filter((country) =>
                    country.country
                        .toLowerCase()
                        .includes(focused.value.toLowerCase())
                )
                .slice(0, 25)
                .map((country) => ({
                    name: country.country,
                    value: String(country.numeric),
                }))
        );
    }
};

export const chatInput: ChatInputCommand = async ({ interaction }) => {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "level") {
        const levelID = await interaction.options.getString("level");
        const levelRes = await api.send<ExtendedLevel>(
            `/aredl/levels/${levelID}`,
            "GET"
        );
        if (levelRes.error) {
            Logger.error(
                `Error finding level ${levelID}: ${levelRes.data.message}`
            );
            return await interaction.editReply(
                ":x: Error finding that level! Be sure to pick from the suggested options."
            );
        }

        const level = levelRes.data;

        const levelCreatorsRes = await api.send<BaseUser[]>(
            `/aredl/levels/${levelID}/creators`,
            "GET"
        );
        let levelCreators;
        if (levelCreatorsRes.error) {
            Logger.error(
                `Error finding level creators from ${levelID}: ${levelCreatorsRes.data.message}`
            );
            return await interaction.editReply(
                ":x: Error finding that level's creators! Be sure to pick from the suggested options."
            );
        } else levelCreators = levelCreatorsRes.data;

        const color = getColor(level.position);

        const container = new ContainerBuilder().setAccentColor(color);

        const text1 = new TextDisplayBuilder().setContent(
            `## ${level.name} (#${level.position})`
        );
        container.addTextDisplayComponents(text1);

        container.addSeparatorComponents((separator) =>
            separator.setSpacing(SeparatorSpacingSize.Small)
        );

        const text2 = new TextDisplayBuilder().setContent(
            level.description && level.description !== ""
                ? `${`-# ${level.description}`}`
                : "_No description._"
        );

        const section = new SectionBuilder().addTextDisplayComponents(text2);

        const exp =
            // eslint-disable-next-line no-useless-escape
            /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;

        if (level.verifications.length > 0 && level.verifications[0]) {
            const verification = level.verifications[0];
            const video = verification.video_url;
            const match = video.match(exp);
            if (match && match[1]) {
                const vidId = match[1];
                const thumbnailURL = `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`;
                const button = new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setLabel("Watch")
                    .setURL(video);

                const thumbnail = new ThumbnailBuilder()
                    .setURL(thumbnailURL)
                    .setDescription(
                        `Verified by [${verification.submitted_by.global_name}](https://aredl.net/profiles/${verification.submitted_by.id}), published by [${level.publisher.global_name}](https://aredl.net/profiles/${level.publisher.id})`
                    );

                section.setThumbnailAccessory(thumbnail);

                const verInfoText = new TextDisplayBuilder().setContent(
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
                                          `[${cr.global_name}](https://aredl.net/profiles/${cr.id})`
                                  )
                                  .join(", ")}`
                            : ``
                    }`
                );
                const verificationInfo = new SectionBuilder()
                    .addTextDisplayComponents(verInfoText)
                    .setButtonAccessory(button);
                container.addSectionComponents(section, verificationInfo);
            } else {
                container.addSectionComponents(section);
            }
        }

        container.addSeparatorComponents((separator) =>
            separator.setSpacing(SeparatorSpacingSize.Small)
        );

        const infoLines = [];

        infoLines.push(
            `### **ID:** [${level.level_id}](https://gdbrowser.com/${level.level_id})`
        );
        infoLines.push(`**Points:** ${level.points / 10}`);

        if (level.edel_enjoyment) {
            infoLines.push(
                `**EDEL Enjoyment:** ${level.edel_enjoyment.toFixed(2)}${level.is_edel_pending ? ` :warning:` : ""}`
            );
        }

        if (level.nlw_tier) {
            infoLines.push(`**NLW Tier:** ${level.nlw_tier}`);
        }

        if (level.gddl_tier) {
            infoLines.push(`**GDDL Tier:** ${level.gddl_tier.toFixed(2)}`);
        }

        const info = new TextDisplayBuilder().setContent(
            infoLines.join("\n### ")
        );
        container.addTextDisplayComponents(info);

        if (level.tags.length > 0) {
            container.addSeparatorComponents((separator) =>
                separator.setSpacing(SeparatorSpacingSize.Small)
            );
            const tags = new TextDisplayBuilder().setContent(
                "Tags: " +
                    level.tags
                        .map(
                            (tag) =>
                                `[${tag}](https://aredl.net/list?tag_${tag.replace(
                                    " ",
                                    "+"
                                )}=true)`
                        )
                        .join(", ")
            );
            container.addTextDisplayComponents(tags);
        }

        const go = new ButtonBuilder()
            .setLabel("Open In AREDL")
            .setURL(`https://aredl.net/list/${level.id}`)
            .setStyle(ButtonStyle.Link);

        const row = new ActionRowBuilder().setComponents(go).toJSON();

        await interaction.editReply({
            components: [container, row],
            flags: MessageFlags.IsComponentsV2,
        });
    } else if (subcommand === "leaderboard") {
        const nameFilter = interaction.options.getString("name");
        const countryCodeFilter = interaction.options.getString("country");
        const sort = interaction.options.getString("sort");
        const page = interaction.options.getInteger("page");
        const country = iso.whereNumeric(countryCodeFilter ?? "");
        const query: Record<string, number | string> = {
            per_page: usersPerPage,
        };
        if (nameFilter) query.name_filter = `%${nameFilter}%`;
        if (country) query.country_filter = country.numeric;
        if (page) query.page = page;
        if (sort) query.order = sort;
        const lbRes = await api.send<LeaderboardEntry>(
            "/aredl/leaderboard",
            "GET",
            query
        );
        if (lbRes.error) {
            Logger.error(`Failed to fetch leaderboard: ${lbRes.data.message}`);
            const container = (
                <Container accentColor={0xff0000}>
                    <TextDisplay>
                        ## :x: Failed to fetch leaderboard!
                    </TextDisplay>
                    <TextDisplay>{lbRes.data.message}</TextDisplay>
                </Container>
            );

            return await interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                components: [container],
            });
        }

        const lastRefreshed = new Date(lbRes.data.last_refreshed);
        const leaderboard = lbRes.data.data;

        const container = (
            <Container accentColor={0xff6f00}>
                <TextDisplay>
                    {"## AREDL Leaderboard " +
                        (nameFilter ? `(${nameFilter}) ` : "") +
                        (country ? `(${country.country}) ` : ``)}
                </TextDisplay>
                <Separator spacing={SeparatorSpacingSize.Small} />
                {leaderboard.map((entry) => {
                    const showDiscordUser =
                        entry.user.discord_id &&
                        interaction.guild?.members.cache.some(
                            (member) => member.id === entry.user.discord_id
                        );
                    return (
                        <Section>
                            <TextDisplay>
                                {`- #${entry.rank} - ${
                                    entry.clan
                                        ? `[[${entry.clan.tag}]](https://aredl.net/clans/${entry.clan.id}) `
                                        : ""
                                }${
                                    showDiscordUser
                                        ? `<@${entry.user.discord_id}>`
                                        : entry.user.global_name
                                } - ${(entry.total_points / 10).toFixed(1)}pts`}
                            </TextDisplay>
                            <Button
                                style={ButtonStyle.Link}
                                url={`https://aredl.net/profiles/${entry.user.id}`}
                            >
                                Go
                            </Button>
                        </Section>
                    );
                })}
                <Separator spacing={SeparatorSpacingSize.Small} />
                <TextDisplay>
                    {`Last updated at ${lastRefreshed.toLocaleTimeString(
                        undefined,
                        {
                            hour: "numeric",
                            minute: "2-digit",
                            // exclude seconds
                        }
                    )} | ${lbRes.data.page} of ${lbRes.data.page * usersPerPage} of ~${lbRes.data.pages * usersPerPage + 1}`}
                </TextDisplay>
                <ActionRow>
                    <Button
                        style={ButtonStyle.Link}
                        url={`https://aredl.net/leaderboard/`}
                    >
                        Open In AREDL
                    </Button>
                </ActionRow>
            </Container>
        );

        return await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
            allowedMentions: { parse: [] },
        });
    }
};

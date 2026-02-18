import {
    MessageFlags,
    SeparatorSpacingSize,
    ChatInputCommandInteraction,
    GuildMember,
    ApplicationCommandOptionType,
} from "discord.js";
import { api } from "@/api";
import {
    pointsRoleIDs,
    packRoleIDs,
    topLevelRoleIDs,
    extremeGrinderRoleID,
    opinionPermsRoleID,
    creatorRoleID,
    verifierRoleID,
} from "@/../config.json";
import {
    ChatInputCommand,
    CommandData,
    Container,
    Logger,
    Separator,
    TextDisplay,
} from "commandkit";
import { Profile } from "@/types/user";
import { commandGuilds } from "@/util/commandGuilds";

export const metadata = commandGuilds();

export const syncRoles = async (
    interaction: ChatInputCommandInteraction,
    member: GuildMember
) => {
    // do not stack if stack is explicitly set to "off", otherwise stack
    const shouldStack = interaction.options.getNumber("stack") !== 0;

    const profileReq = await api.send<Profile>(
        `/aredl/profile/${member.user.id}`
    );
    if (profileReq.error) {
        if (profileReq.status === 404) {
            Logger.error(
                `Sync roles - User not found: ${profileReq.data.message}`
            );
            return interaction.editReply(
                `:x: Could not find this user's profile on the leaderboard!`
            );
        }
        Logger.error(
            `Sync roles - Error fetching profile: ${profileReq.data.message}`
        );
        return interaction.editReply(
            `Error fetching profile: ${profileReq.data.message}`
        );
    }
    const profile = profileReq.data;
    const areplReq = await api.send<Profile>(
        `/arepl/profile/${member.user.id}`
    );
    if (areplReq.error) {
        if (areplReq.status === 404) {
            Logger.error(
                `Sync roles - User not found: ${areplReq.data.message}`
            );
            return interaction.editReply(
                `:x: Could not find this user's platformer profile on the leaderboard!`
            );
        }
        Logger.error(
            `Sync roles - Error fetching platformer profile: ${areplReq.data.message}`
        );
        return interaction.editReply(
            `Error fetching platformer profile: ${areplReq.data.message}`
        );
    }
    const arepl = areplReq.data;

    const verifications = [
        ...(profile?.records ?? []),
        ...(arepl?.records ?? []),
    ].filter((record) => record.is_verification);

    const addedRoles: string[] = [];

    // remove all roles to account for different stacking preferences
    // otherwise stacked roles will never be removed automatically
    // if the user later decides to resync without stacking
    const rolesToRemove = [
        ...Object.values(pointsRoleIDs),
        ...Object.values(packRoleIDs),
        ...Object.values(topLevelRoleIDs),
        extremeGrinderRoleID,
        opinionPermsRoleID,
        creatorRoleID,
        verifierRoleID,
    ];
    await member.roles.remove(
        rolesToRemove,
        "Sync Roles: Removing all automated roles"
    );

    const addRoles = (roleIds: string[]) => {
        for (const roleId of roleIds) {
            if (!member.guild.roles.cache.hasAny(roleId)) {
                Logger.warn(`Role sync - Role ${roleId} not found in server`);
                return;
            }
            addedRoles.push(roleId);
        }
    };

    const processRoleType = (
        roleData: Record<string, string>,
        requirement: (req: number) => boolean
    ) => {
        const rolesToAdd: string[] = [];
        Object.entries(roleData).forEach(([k, v]) => {
            // if the key is not a number, assume it's a string
            if (requirement(parseInt(k))) rolesToAdd.push(v);
        });
        if (rolesToAdd.length === 0 || !rolesToAdd[rolesToAdd.length - 1])
            return;
        if (shouldStack) {
            addRoles(rolesToAdd);
        } else {
            const lastRole = rolesToAdd[rolesToAdd.length - 1];
            if (lastRole) addRoles([lastRole]);
        }
    };

    // Points roles
    processRoleType(
        pointsRoleIDs,
        (req) => Math.round((profile?.rank?.total_points ?? 0) / 10) >= req
    );
    // Pack roles
    processRoleType(packRoleIDs, (req) => (profile?.packs?.length ?? 0) >= req);
    // Top level roles
    processRoleType(topLevelRoleIDs, (req) =>
        profile?.records?.some((record) => record.level.position <= req)
    );
    // Opinion perms
    if ((profile?.rank?.extremes ?? 0) >= 10) {
        addRoles([opinionPermsRoleID]);
    }
    // Creator role
    if (
        (profile?.created?.length ?? 0) > 0 ||
        (arepl?.created?.length ?? 0) > 0
    ) {
        addRoles([creatorRoleID]);
    }
    // Verifier role
    if (verifications.length > 0) {
        addRoles([verifierRoleID]);
    }
    // Extreme Grinder role
    if ((profile?.rank?.extremes ?? 0) >= 50) {
        addRoles([extremeGrinderRoleID]);
    }

    try {
        await member.roles.add(
            addedRoles,
            "Sync Roles: Automatically adding profile roles"
        );
    } catch (e) {
        Logger.error("Sync roles - Error adding roles:");
        Logger.error(e);
        return interaction.editReply(
            `:x: Error adding roles, please try again later`
        );
    }

    const hardestRank = profile?.records?.reduce((prev, curr) =>
        prev.level.position < curr.level.position ? prev : curr
    )?.level.position;
    const container = (
        <Container accentColor={0x00ff00}>
            <TextDisplay>## :white_check_mark: Roles synced!</TextDisplay>
            <Separator spacing={SeparatorSpacingSize.Small} />
            <TextDisplay>## **Stats:**</TextDisplay>
            <TextDisplay>
                {`Profile: [${profile.global_name}](https://aredl.net/profile/user/${profile.id}) (${member})\nPoints: ${Math.round((profile?.rank?.total_points ?? 0) / 10)}\nPacks: ${(profile?.packs?.length ?? 0) === 0 ? "None" : profile.packs.length}\nExtremes: ${profile?.rank?.extremes ?? 0}\nVerifier: ${verifications.length > 0 ? ":white_check_mark:" : ":x:"}\nCreator: ${(profile?.created?.length ?? 0) > 0 || (arepl?.created?.length ?? 0) > 0 ? ":white_check_mark:" : ":x:"}\nHardest: #${hardestRank}`}
            </TextDisplay>
            <Separator spacing={SeparatorSpacingSize.Small} />
            <TextDisplay>## **Added roles:**</TextDisplay>
            <TextDisplay>
                {addedRoles.length === 0
                    ? "No new roles!"
                    : addedRoles.map((r) => `<@&${r}>`).join("\n")}
            </TextDisplay>
        </Container>
    );

    return await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
    });
};

export const command: CommandData = {
    name: "syncroles",
    description: "Sync all roles from your profile to your account",
    options: [
        {
            name: "stack",
            description: "Whether to stack points, pack, and top level roles",
            type: ApplicationCommandOptionType.Number,
            choices: [
                { name: "On", value: 1 },
                { name: "Off", value: 0 },
            ],
        },
    ],
};

export const chatInput: ChatInputCommand = async ({ interaction }) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(interaction.member instanceof GuildMember))
        return await interaction.editReply(
            ":x: Could not fetch your member data."
        );
    return await syncRoles(interaction, interaction.member);
};

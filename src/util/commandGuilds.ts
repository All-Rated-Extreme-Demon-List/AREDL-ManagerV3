import { CommandMetadataFunction } from "commandkit";
import { guildId, shadowStaffServerID, staffGuildId } from "@/config.ts";
export const commandGuilds: CommandMetadataFunction = () => {
    return {
        guilds: Array.from(new Set([guildId, staffGuildId, shadowStaffServerID].filter(Boolean))),
    };
};

import { Client, Collection } from "discord.js";
import "dotenv/config";
import { guildId, staffGuildId } from "@/config"

const client = new Client({
    intents: ["Guilds", "GuildMembers", "GuildMessages",],
});

// Initialize websockets Collection for WebSocket handlers
client.websockets = new Collection();

export default client;

async function removeAllGlobalCommands() {
    const commands = await client.application?.commands.fetch();
    if (commands) {
        for (const [id, command] of commands) {
            await client.application?.commands.delete(id);
        }    
    }
}

async function removeAllGuildCommands(guildToRemove: string) {
    const guild = await client.guilds.fetch(guildToRemove);
    if (guild) {
        const commands = guild.commands.fetch();
        if (commands) {
            for (const [id, command] of commands) {
                await guild.commands.delete(id);
            }
        }
    }
}

removeAllGlobalCommands();
removeAllGuildCommands(guildId);
removeAllGuildCommands(staffGuildId);

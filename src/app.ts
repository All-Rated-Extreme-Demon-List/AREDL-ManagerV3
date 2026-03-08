import { Client, Collection } from "discord.js";
import "dotenv/config";

const client = new Client({
    intents: ["Guilds", "GuildMembers", "GuildMessages",],
});

// Initialize websockets Collection for WebSocket handlers
client.websockets = new Collection();

export default client;

async function removeAllGlobalCommands() {
    const commands = await client.application?.commands.fetch();
    for (const [id, command] of commands) {
        await client.application?.commands.delete(id);
    }
}

removeAllGlobalCommands();

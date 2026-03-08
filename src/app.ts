import { Client, Collection } from "discord.js";
import "dotenv/config";

const client = new Client({
    intents: ["Guilds", "GuildMembers", "GuildMessages",],
});

// Initialize websockets Collection for WebSocket handlers
client.websockets = new Collection();

export default client;

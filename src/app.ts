import { Client, Collection } from "discord.js";
import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";

export const db = drizzle(process.env.DB_FILE_NAME!);

const client = new Client({
    intents: ["Guilds", "GuildMembers", "GuildMessages", "MessageContent"],
});

// Initialize websockets Collection for WebSocket handlers
client.websockets = new Collection();

export default client;

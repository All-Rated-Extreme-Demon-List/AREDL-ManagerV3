import { clientId, guildId, staffGuildId } from "@/config";
import type { EventHandler } from "commandkit";
import { Routes } from "discord.js";

const handler: EventHandler<"clientReady"> = async (client) => {
    client.rest.put(Routes.applicationCommands(clientId), {
        body: [],
    });
    client.rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: [],
    });
    client.rest.put(Routes.applicationGuildCommands(clientId, staffGuildId), {
        body: [],
    });
};

export default handler;

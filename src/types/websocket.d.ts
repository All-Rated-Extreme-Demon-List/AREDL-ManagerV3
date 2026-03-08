import type { Client } from "discord.js";

export interface WebsocketHandler {
    notification_type: string;
    handle: (client: Client, data: object) => Promise<void> | void;
}

export function isWebsocketHandler(obj: object): obj is WebsocketHandler {
    return (
        obj &&
        typeof obj.notification_type === "string" &&
        typeof obj.handle === "function"
    );
}

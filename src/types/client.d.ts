import type { Collection } from "discord.js";
import type { WebsocketHandler } from "./websocket.d";

declare module "discord.js" {
    interface Client {
        websockets: Collection<string, WebsocketHandler>;
    }
}

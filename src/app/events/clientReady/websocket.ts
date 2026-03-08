import { Logger, type EventHandler } from "commandkit";
import { initWebsocket, initAPIWebsocket } from "../../../util/initWebsocket";

const handler: EventHandler<"clientReady"> = async (client) => {
    try {
        // Load WebSocket handlers
        await initWebsocket(client);

        // Connect to API WebSocket
        await initAPIWebsocket(client);
    } catch (error) {
        Logger.error(`[WebSocket] Failed to initialize:`);
        Logger.error(error);
    }
};

export default handler;

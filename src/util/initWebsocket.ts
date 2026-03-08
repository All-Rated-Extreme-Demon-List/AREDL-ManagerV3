import { Client } from "discord.js";
import WebSocket from "ws";
import { isWebsocketHandler } from "../types/websocket.d";
import { Logger } from "commandkit";
import { handlers } from "../app/websocket/index";
import { websocketURL } from "@/../config.json";

/**
 * Load all WebSocket handlers from the websocket index
 * and store them in client.websockets Collection
 */
export async function initWebsocket(client: Client): Promise<void> {
    Logger.info(`Loading ${handlers.length} WebSocket handler(s)...`);

    for (const handler of handlers) {
        try {
            if (isWebsocketHandler(handler)) {
                client.websockets.set(handler.notification_type, handler);
                Logger.info(
                    `Loaded WebSocket handler: ${handler.notification_type}`
                );
            } else {
                Logger.warn(`Invalid WebSocket handler format`);
            }
        } catch (error) {
            Logger.error(`Error loading WebSocket handler:`);
            Logger.error(error);
        }
    }

    Logger.info(
        `Successfully loaded ${client.websockets.size} WebSocket handler(s)`
    );
}

/**
 * Connect to the API WebSocket and route incoming messages to handlers
 */
export async function initAPIWebsocket(client: Client): Promise<void> {
    if (!process.env.API_TOKEN) {
        Logger.error(
            "[WebSocket] API_TOKEN not found in environment variables"
        );
        return;
    }

    function connectWebSocket(): void {
        try {
            const ws = new WebSocket(websocketURL, {
                headers: {
                    Authorization: `Bearer ${process.env.API_TOKEN}`,
                },
            });

            ws.on("open", () => {
                Logger.info("Connected to API WebSocket");
            });

            ws.on("message", async (data: WebSocket.Data) => {
                try {
                    const message = JSON.parse(data.toString());
                    const notificationType = message.notification_type;
                    Logger.info(
                        `Received WebSocket message: ${notificationType}`
                    );
                    console.log(message.data);

                    if (!notificationType) {
                        Logger.warn(
                            "Message missing WebSocket notification_type:"
                        );
                        Logger.warn(message);
                        return;
                    }

                    const handler = client.websockets.get(notificationType);

                    if (!handler) {
                        Logger.warn(
                            `No WebSocket handler found for notification_type: ${notificationType}`
                        );
                        return;
                    }

                    await handler.handle(client, message.data);
                } catch (error) {
                    Logger.error("Error processing WebSocket message:");
                    Logger.error(error);
                }
            });

            ws.on("error", (error) => {
                Logger.error("[WebSocket] Error:");
                Logger.error(error);
            });

            ws.on("close", () => {
                Logger.info(
                    "Disconnected from API WebSocket. Reconnecting in 5 seconds..."
                );
                setTimeout(connectWebSocket, 5000);
            });
        } catch (error) {
            Logger.error("[WebSocket] Failed to connect:");
            Logger.error(error);
            setTimeout(connectWebSocket, 5000);
        }
    }

    connectWebSocket();
}

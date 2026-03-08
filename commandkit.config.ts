import { defineConfig } from "commandkit/config";
import { tasks } from "@commandkit/tasks";
import { logging } from "./src/plugins/logging/index.ts";

export default defineConfig({
    plugins: [
        logging({
            log4jsConfigPath: "./log4js.json",
        }),
        tasks({
            sqliteDriverDatabasePath: "./data/tasks.sqlite",
        }),
    ],
});

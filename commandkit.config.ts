import { defineConfig } from "commandkit/config";
import { tasks } from "@commandkit/tasks";
import { logging } from "./src/plugins/logging/index.ts";

export default defineConfig({
    plugins: [
        tasks({
            sqliteDriverDatabasePath: "./data/tasks.sqlite",
        }),
        logging({
            log4jsConfigPath: './log4js.json',
        })
    ],
});

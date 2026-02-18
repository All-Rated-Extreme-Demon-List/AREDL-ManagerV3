// @ts-check

import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
    globalIgnores([
        ".commandkit",
        ".yarn",
        "node_modules",
        "dist",
        "build",
        "config.json",
    ]),
    eslint.configs.recommended,
    tseslint.configs.recommended
);

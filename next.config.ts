import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const config: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
};

export default config;

import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const basePath = env.VITE_BASE_PATH?.trim() || "/aws-mahjong/";
  const base = `/${basePath.replace(/^\/+|\/+$/g, "")}/`;

  return {
    base: base === "//" ? "/" : base,
    plugins: [react()],
    test: {
      environment: "node",
    },
  };
});

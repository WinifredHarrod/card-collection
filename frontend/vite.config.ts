import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const rawBasePath = env.BASE_PATH ?? "";
  const base =
    rawBasePath === "" ? "/" : rawBasePath.endsWith("/") ? rawBasePath : `${rawBasePath}/`;

  return {
    base,
    plugins: [react()],
    resolve: {
      alias: {
        "@/abi": path.resolve(__dirname, "src/abi"),
        "@/fhevm": path.resolve(__dirname, "src/fhevm"),
        "@/hooks": path.resolve(__dirname, "src/hooks"),
      },
    },
    server: {
      port: 5173,
      host: true,
    },
  };
});



import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: resolve(currentDir, "../../../../.env")
});

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not defined`);
  }

  return value;
}

function getBooleanEnv(
  name: string,
  fallback: boolean
): boolean {
  const value = process.env[name];

  if (value === undefined) {
    return fallback;
  }

  return value === "true";
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  HOST: process.env.HOST ?? "0.0.0.0",
  PORT: Number(process.env.PORT ?? 3000),
  DATABASE_URL: getRequiredEnv("DATABASE_URL"),
  ALLOW_PRIVATE_TARGETS: getBooleanEnv(
    "ALLOW_PRIVATE_TARGETS",
    false
  )
};

import * as cheerio from "cheerio";
import type { Monitor } from "../repositories/monitor.repository.js";

function parseNumericValue(input: string): number {
  const normalized = input
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, "")
    .replace(",", ".");

  const match = normalized.match(/-?\d+(?:\.\d+)?/);

  if (!match) {
    throw new Error(`No numeric value found in "${input}"`);
  }

  const value = Number(match[0]);

  if (!Number.isFinite(value)) {
    throw new Error(`Invalid numeric value "${match[0]}"`);
  }

  return value;
}

function readJsonPath(
  data: unknown,
  path: string
): unknown {
  const parts = path.split(".").filter(Boolean);

  let current: unknown = data;

  for (const part of parts) {
    if (
      typeof current !== "object" ||
      current === null ||
      !(part in current)
    ) {
      throw new Error(`JSON path "${path}" not found`);
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

export async function collectMonitorValue(
  monitor: Monitor
): Promise<number> {
  const response = await fetch(monitor.url, {
    headers: {
      "user-agent": "StarUp/0.1"
    },
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} while fetching ${monitor.url}`
    );
  }

  if (monitor.sourceType === "json") {
    if (!monitor.jsonPath) {
      throw new Error("jsonPath is required for JSON monitor");
    }

    const data = await response.json();
    const rawValue = readJsonPath(data, monitor.jsonPath);

    return parseNumericValue(String(rawValue));
  }

  if (!monitor.selector) {
    throw new Error("selector is required for HTML monitor");
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const element = $(monitor.selector).first();

  if (!element.length) {
    throw new Error(
      `Selector "${monitor.selector}" not found`
    );
  }

  return parseNumericValue(element.text());
}

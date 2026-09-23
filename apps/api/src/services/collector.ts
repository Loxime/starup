import * as cheerio from "cheerio";

import { env } from "../config/env.js";
import type {
  Monitor
} from "../repositories/monitor.repository.js";
import {
  parseNumericValue,
  readJsonPath
} from "./collector-utils.js";
import {
  validateTargetUrl
} from "./target-security.js";

export async function collectMonitorValue(
  monitor: Monitor
): Promise<number> {
  const url = await validateTargetUrl(
    monitor.url,
    env.ALLOW_PRIVATE_TARGETS
  );

  const response = await fetch(url, {
    redirect: "error",
    headers: {
      "user-agent": "StarUp/0.1"
    },
    signal: AbortSignal.timeout(
      10_000
    )
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} while fetching ${monitor.url}`
    );
  }

  if (monitor.sourceType === "json") {
    if (!monitor.jsonPath) {
      throw new Error(
        "jsonPath is required for JSON monitor"
      );
    }

    const data = await response.json();

    const rawValue = readJsonPath(
      data,
      monitor.jsonPath
    );

    return parseNumericValue(
      String(rawValue)
    );
  }

  if (!monitor.selector) {
    throw new Error(
      "selector is required for HTML monitor"
    );
  }

  const html = await response.text();

  const $ = cheerio.load(html);

  const element = $(
    monitor.selector
  ).first();

  if (!element.length) {
    throw new Error(
      `Selector "${monitor.selector}" not found`
    );
  }

  return parseNumericValue(
    element.text()
  );
}

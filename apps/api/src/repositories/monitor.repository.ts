import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export type MonitorSourceType = "json" | "html";

export interface Monitor {
  id: string;
  name: string;
  url: string;
  sourceType: MonitorSourceType;
  selector: string | null;
  jsonPath: string | null;
  intervalSeconds: number;
  enabled: boolean;
  status: "pending" | "healthy" | "error";
  lastCheckedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMonitorInput {
  name: string;
  url: string;
  sourceType: MonitorSourceType;
  selector?: string | null;
  jsonPath?: string | null;
  intervalSeconds?: number;
}

type MonitorRow = {
  id: string;
  name: string;
  url: string;
  source_type: MonitorSourceType;
  selector: string | null;
  json_path: string | null;
  interval_seconds: number;
  enabled: boolean;
  status: "pending" | "healthy" | "error";
  last_checked_at: Date | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
};

function mapRow(row: MonitorRow): Monitor {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    sourceType: row.source_type,
    selector: row.selector,
    jsonPath: row.json_path,
    intervalSeconds: row.interval_seconds,
    enabled: row.enabled,
    status: row.status,
    lastCheckedAt: row.last_checked_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function createMonitor(
  input: CreateMonitorInput
): Promise<Monitor> {
  const id = randomUUID();

  const result = await db.query<MonitorRow>(
    `
      INSERT INTO monitors (
        id,
        name,
        url,
        source_type,
        selector,
        json_path,
        interval_seconds
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [
      id,
      input.name,
      input.url,
      input.sourceType,
      input.selector ?? null,
      input.jsonPath ?? null,
      input.intervalSeconds ?? 300
    ]
  );

  return mapRow(result.rows[0]);
}

export async function listMonitors(): Promise<Monitor[]> {
  const result = await db.query<MonitorRow>(
    `
      SELECT *
      FROM monitors
      ORDER BY created_at DESC
    `
  );

  return result.rows.map(mapRow);
}

export async function getMonitorById(
  id: string
): Promise<Monitor | null> {
  const result = await db.query<MonitorRow>(
    `
      SELECT *
      FROM monitors
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  const row = result.rows[0];

  return row ? mapRow(row) : null;
}

export async function deleteMonitor(
  id: string
): Promise<boolean> {
  const result = await db.query(
    `
      DELETE FROM monitors
      WHERE id = $1
    `,
    [id]
  );

  return result.rowCount === 1;
}

export interface UpdateMonitorInput {
  name?: string;
  url?: string;
  sourceType?: MonitorSourceType;
  selector?: string | null;
  jsonPath?: string | null;
  intervalSeconds?: number;
  enabled?: boolean;
}

export async function updateMonitor(
  id: string,
  input: UpdateMonitorInput
): Promise<Monitor | null> {
  const current = await getMonitorById(id);

  if (!current) {
    return null;
  }

  const next = {
    name: input.name ?? current.name,
    url: input.url ?? current.url,
    sourceType: input.sourceType ?? current.sourceType,
    selector:
      input.selector !== undefined
        ? input.selector
        : current.selector,
    jsonPath:
      input.jsonPath !== undefined
        ? input.jsonPath
        : current.jsonPath,
    intervalSeconds:
      input.intervalSeconds ?? current.intervalSeconds,
    enabled:
      input.enabled ?? current.enabled
  };

  const result = await db.query<MonitorRow>(
    `
      UPDATE monitors
      SET
        name = $2,
        url = $3,
        source_type = $4,
        selector = $5,
        json_path = $6,
        interval_seconds = $7,
        enabled = $8,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [
      id,
      next.name,
      next.url,
      next.sourceType,
      next.selector,
      next.jsonPath,
      next.intervalSeconds,
      next.enabled
    ]
  );

  return result.rows[0]
    ? mapRow(result.rows[0])
    : null;
}


export async function updateMonitorHealth(
  id: string,
  status: "healthy" | "error",
  error: string | null = null
): Promise<void> {
  await db.query(
    `
      UPDATE monitors
      SET
        status = $2,
        last_checked_at = NOW(),
        last_error = $3,
        updated_at = NOW()
      WHERE id = $1
    `,
    [
      id,
      status,
      error
    ]
  );
}

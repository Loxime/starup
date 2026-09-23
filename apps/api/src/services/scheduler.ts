import type { FastifyBaseLogger } from "fastify";
import { db } from "../db.js";
import {
  createMeasurement
} from "../repositories/measurement.repository.js";
import type {
  Monitor,
  MonitorSourceType
} from "../repositories/monitor.repository.js";
import {
  collectMonitorValue
} from "./collector.js";

type MonitorRow = {
  id: string;
  name: string;
  url: string;
  source_type: MonitorSourceType;
  selector: string | null;
  json_path: string | null;
  interval_seconds: number;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
};

type SchedulerState = {
  running: boolean;
  timer: NodeJS.Timeout | null;
};

const state: SchedulerState = {
  running: false,
  timer: null
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
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function getDueMonitors(): Promise<Monitor[]> {
  const result = await db.query<MonitorRow>(
    `
      SELECT m.*
      FROM monitors m
      LEFT JOIN LATERAL (
        SELECT measured_at
        FROM measurements
        WHERE monitor_id = m.id
        ORDER BY measured_at DESC
        LIMIT 1
      ) last_measurement ON TRUE
      WHERE m.enabled = TRUE
        AND (
          last_measurement.measured_at IS NULL
          OR last_measurement.measured_at
            <= NOW() - (m.interval_seconds * INTERVAL '1 second')
        )
      ORDER BY m.created_at ASC
    `
  );

  return result.rows.map(mapRow);
}

async function runMonitor(
  monitor: Monitor,
  logger: FastifyBaseLogger
): Promise<void> {
  try {
    logger.info(
      {
        monitorId: monitor.id,
        monitorName: monitor.name
      },
      "Checking monitor"
    );

    const value = await collectMonitorValue(monitor);

    await createMeasurement(
      monitor.id,
      value
    );

    logger.info(
      {
        monitorId: monitor.id,
        value
      },
      "Monitor measurement stored"
    );
  } catch (error) {
    logger.error(
      {
        monitorId: monitor.id,
        error
      },
      "Monitor check failed"
    );
  }
}

async function tick(
  logger: FastifyBaseLogger
): Promise<void> {
  if (state.running) {
    return;
  }

  state.running = true;

  try {
    const monitors = await getDueMonitors();

    for (const monitor of monitors) {
      await runMonitor(
        monitor,
        logger
      );
    }
  } catch (error) {
    logger.error(
      { error },
      "Scheduler tick failed"
    );
  } finally {
    state.running = false;
  }
}

export function startScheduler(
  logger: FastifyBaseLogger
): void {
  if (state.timer) {
    return;
  }

  logger.info("Starting StarUp scheduler");

  void tick(logger);

  state.timer = setInterval(() => {
    void tick(logger);
  }, 10_000);
}

export function stopScheduler(): void {
  if (!state.timer) {
    return;
  }

  clearInterval(state.timer);
  state.timer = null;
}

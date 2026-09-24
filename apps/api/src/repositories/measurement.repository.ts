import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export interface Measurement {
  id: string;
  monitorId: string;
  value: number;
  measuredAt: Date;
}

type MeasurementRow = {
  id: string;
  monitor_id: string;
  value: number;
  measured_at: Date;
};

function mapRow(row: MeasurementRow): Measurement {
  return {
    id: row.id,
    monitorId: row.monitor_id,
    value: Number(row.value),
    measuredAt: row.measured_at
  };
}

export async function createMeasurement(
  monitorId: string,
  value: number
): Promise<Measurement> {
  const result = await db.query<MeasurementRow>(
    `
      INSERT INTO measurements (
        id,
        monitor_id,
        value
      )
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [
      randomUUID(),
      monitorId,
      value
    ]
  );

  return mapRow(result.rows[0]);
}

export async function listMeasurementsByMonitor(
  monitorId: string
): Promise<Measurement[]> {
  const result = await db.query<MeasurementRow>(
    `
      SELECT *
      FROM measurements
      WHERE monitor_id = $1
      ORDER BY measured_at ASC
    `,
    [monitorId]
  );

  return result.rows.map(mapRow);
}

export interface MeasurementSummary {
  currentValue: number | null;
  previousValue: number | null;
  delta: number | null;
  measurements: Measurement[];
}

export async function getMeasurementSummary(
  monitorId: string,
  since: Date
): Promise<MeasurementSummary> {
  const historyResult = await db.query<MeasurementRow>(
    `
      SELECT *
      FROM measurements
      WHERE monitor_id = $1
        AND measured_at >= $2
      ORDER BY measured_at ASC
    `,
    [monitorId, since]
  );

  const latestResult = await db.query<MeasurementRow>(
    `
      SELECT *
      FROM measurements
      WHERE monitor_id = $1
      ORDER BY measured_at DESC
      LIMIT 2
    `,
    [monitorId]
  );

  const measurements = historyResult.rows.map(mapRow);

  const current = latestResult.rows[0]
    ? mapRow(latestResult.rows[0])
    : null;

  const previous = latestResult.rows[1]
    ? mapRow(latestResult.rows[1])
    : null;

  return {
    currentValue: current?.value ?? null,
    previousValue: previous?.value ?? null,
    delta:
      current && previous
        ? current.value - previous.value
        : null,
    measurements
  };
}

export interface DailyGrowthPoint {
  date: string;
  value: number;
  change: number | null;
}

type DailyGrowthRow = {
  date: string;
  value: number;
  change: number | null;
};

export async function getDailyGrowth(
  monitorId: string,
  days: number
): Promise<DailyGrowthPoint[]> {
  const result = await db.query<DailyGrowthRow>(
    `
      WITH daily_close AS (
        SELECT DISTINCT ON (day)
          day,
          value
        FROM (
          SELECT
            (measured_at AT TIME ZONE 'UTC')::date AS day,
            value,
            measured_at
          FROM measurements
          WHERE monitor_id = $1
            AND measured_at >= (
              (
                date_trunc(
                  'day',
                  NOW() AT TIME ZONE 'UTC'
                )
                - ($2::int * INTERVAL '1 day')
              )
              AT TIME ZONE 'UTC'
            )
        ) AS measurements_by_day
        ORDER BY
          day ASC,
          measured_at DESC
      ),
      daily_with_previous AS (
        SELECT
          day,
          value,
          LAG(day) OVER (
            ORDER BY day
          ) AS previous_day,
          LAG(value) OVER (
            ORDER BY day
          ) AS previous_value
        FROM daily_close
      )
      SELECT
        day::text AS date,
        value,
        CASE
          WHEN previous_day IS NOT NULL
            AND day - previous_day = 1
          THEN value - previous_value
          ELSE NULL
        END AS change
      FROM daily_with_previous
      WHERE day >= (
        date_trunc(
          'day',
          NOW() AT TIME ZONE 'UTC'
        )
        - (($2::int - 1) * INTERVAL '1 day')
      )::date
      ORDER BY day ASC
    `,
    [
      monitorId,
      days
    ]
  );

  return result.rows.map((row) => ({
    date: row.date,
    value: Number(row.value),
    change:
      row.change === null
        ? null
        : Number(row.change)
  }));
}

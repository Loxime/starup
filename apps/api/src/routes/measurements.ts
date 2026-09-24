import type { FastifyInstance } from "fastify";
import {
  createMeasurement,
  getDailyGrowth,
  getMeasurementSummary,
  listMeasurementsByMonitor
} from "../repositories/measurement.repository.js";
import {
  getMonitorById,
  updateMonitorHealth
} from "../repositories/monitor.repository.js";
import {
  collectMonitorValue
} from "../services/collector.js";

type HistoryQuery = {
  range?: "24h" | "7d" | "30d";
};

type MonitorParams = {
  id: string;
};

export async function measurementRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get<{
    Params: MonitorParams;
  }>(
    "/monitors/:id/measurements",
    async (request, reply) => {
      const monitor = await getMonitorById(
        request.params.id
      );

      if (!monitor) {
        return reply.status(404).send({
          error: "Monitor not found"
        });
      }

      return listMeasurementsByMonitor(
        monitor.id
      );
    }
  );

  app.get<{
    Params: MonitorParams;
    Querystring: HistoryQuery;
  }>(
    "/monitors/:id/history",
    async (request, reply) => {
      const monitor = await getMonitorById(
        request.params.id
      );

      if (!monitor) {
        return reply.status(404).send({
          error: "Monitor not found"
        });
      }

      const range =
        request.query.range ?? "24h";

      const ranges = {
        "24h": 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000
      } as const;

      const growthDays = {
        "24h": 1,
        "7d": 7,
        "30d": 30
      } as const;

      if (!(range in ranges)) {
        return reply.status(400).send({
          error:
            "Invalid range. Expected 24h, 7d or 30d."
        });
      }

      const since = new Date(
        Date.now() - ranges[range]
      );

      const [
        summary,
        dailyGrowth
      ] = await Promise.all([
        getMeasurementSummary(
          monitor.id,
          since
        ),
        getDailyGrowth(
          monitor.id,
          growthDays[range]
        )
      ]);

      return {
        monitor: {
          id: monitor.id,
          name: monitor.name
        },
        range,
        currentValue:
          summary.currentValue,
        previousValue:
          summary.previousValue,
        delta:
          summary.delta,
        measurements:
          summary.measurements,
        dailyGrowth
      };
    }
  );

  app.post<{
    Params: MonitorParams;
  }>(
    "/monitors/:id/check",
    async (request, reply) => {
      const monitor = await getMonitorById(
        request.params.id
      );

      if (!monitor) {
        return reply.status(404).send({
          error: "Monitor not found"
        });
      }

      try {
        const value =
          await collectMonitorValue(
            monitor
          );

        const measurement =
          await createMeasurement(
            monitor.id,
            value
          );

        await updateMonitorHealth(
          monitor.id,
          "healthy"
        );

        return reply.status(201).send({
          monitor: {
            id: monitor.id,
            name: monitor.name
          },
          measurement
        });
      } catch (error) {
        app.log.error(error);

        const message =
          error instanceof Error
            ? error.message
            : "Collection failed";

        await updateMonitorHealth(
          monitor.id,
          "error",
          message
        );

        return reply.status(502).send({
          error: message
        });
      }
    }
  );
}

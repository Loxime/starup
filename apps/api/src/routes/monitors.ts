import type { FastifyInstance } from "fastify";
import {
  createMonitor,
  deleteMonitor,
  getMonitorById,
  listMonitors,
  updateMonitor
} from "../repositories/monitor.repository.js";

type CreateMonitorBody = {
  name: string;
  url: string;
  sourceType: "json" | "html";
  selector?: string;
  jsonPath?: string;
  intervalSeconds?: number;
};

type UpdateMonitorBody = {
  name?: string;
  url?: string;
  sourceType?: "json" | "html";
  selector?: string | null;
  jsonPath?: string | null;
  intervalSeconds?: number;
  enabled?: boolean;
};

type MonitorParams = {
  id: string;
};

export async function monitorRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get("/monitors", async () => {
    return listMonitors();
  });

  app.get<{
    Params: MonitorParams;
  }>("/monitors/:id", async (request, reply) => {
    const monitor = await getMonitorById(request.params.id);

    if (!monitor) {
      return reply.status(404).send({
        error: "Monitor not found"
      });
    }

    return monitor;
  });

  app.post<{
    Body: CreateMonitorBody;
  }>("/monitors", async (request, reply) => {
    const {
      name,
      url,
      sourceType,
      selector,
      jsonPath,
      intervalSeconds
    } = request.body;

    if (!name || !url || !sourceType) {
      return reply.status(400).send({
        error: "name, url and sourceType are required"
      });
    }

    if (sourceType === "html" && !selector) {
      return reply.status(400).send({
        error: "selector is required for html monitors"
      });
    }

    if (sourceType === "json" && !jsonPath) {
      return reply.status(400).send({
        error: "jsonPath is required for json monitors"
      });
    }

    const monitor = await createMonitor({
      name,
      url,
      sourceType,
      selector,
      jsonPath,
      intervalSeconds
    });

    return reply.status(201).send(monitor);
  });

  app.patch<{
    Params: MonitorParams;
    Body: UpdateMonitorBody;
  }>("/monitors/:id", async (request, reply) => {
    const current = await getMonitorById(request.params.id);

    if (!current) {
      return reply.status(404).send({
        error: "Monitor not found"
      });
    }

    const input = request.body;

    if (
      input.intervalSeconds !== undefined &&
      input.intervalSeconds < 10
    ) {
      return reply.status(400).send({
        error: "intervalSeconds must be at least 10"
      });
    }

    const nextSourceType =
      input.sourceType ?? current.sourceType;

    const nextSelector =
      input.selector !== undefined
        ? input.selector
        : current.selector;

    const nextJsonPath =
      input.jsonPath !== undefined
        ? input.jsonPath
        : current.jsonPath;

    if (
      nextSourceType === "html" &&
      !nextSelector
    ) {
      return reply.status(400).send({
        error: "selector is required for html monitors"
      });
    }

    if (
      nextSourceType === "json" &&
      !nextJsonPath
    ) {
      return reply.status(400).send({
        error: "jsonPath is required for json monitors"
      });
    }

    const updated = await updateMonitor(
      request.params.id,
      input
    );

    return updated;
  });

  app.delete<{
    Params: MonitorParams;
  }>("/monitors/:id", async (request, reply) => {
    const deleted = await deleteMonitor(request.params.id);

    if (!deleted) {
      return reply.status(404).send({
        error: "Monitor not found"
      });
    }

    return reply.status(204).send();
  });
}

import Fastify from "fastify";
import { env } from "./config/env.js";
import {
  checkDatabaseConnection,
  db
} from "./db.js";
import { monitorRoutes } from "./routes/monitors.js";
import { measurementRoutes } from "./routes/measurements.js";
import {
  startScheduler,
  stopScheduler
} from "./services/scheduler.js";

const app = Fastify({
  logger: true
});

app.get("/health", async (_request, reply) => {
  try {
    await checkDatabaseConnection();

    return {
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    app.log.error(error);

    return reply.status(503).send({
      status: "error",
      database: "unavailable",
      timestamp: new Date().toISOString()
    });
  }
});

await app.register(monitorRoutes, {
  prefix: "/api"
});

await app.register(measurementRoutes, {
  prefix: "/api"
});

const start = async (): Promise<void> => {
  try {
    await app.listen({
      port: env.PORT,
      host: env.HOST
    });

    app.log.info(
      `StarUp API listening on ${env.HOST}:${env.PORT}`
    );

    startScheduler(app.log);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, "Shutting down StarUp API");

  stopScheduler();

  await app.close();
  await db.end();

  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void start();

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import MemoryStore from "memorystore";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { Pool } from "@neondatabase/serverless";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seed";
import { applyMigrations } from "./applyMigrations";
import { startCronJobs } from "./cronJobs";

const app = express();

declare module 'express-session' {
  interface SessionData {
    isAdminAuthenticated?: boolean;
    playerId?: string;
    playerName?: string;
  }
}

// Use persistent DB sessions in production (Vercel) — memorystore in development
const isProduction = process.env.NODE_ENV === 'production';
let sessionStore: session.Store;

if (isProduction) {
  const PgSession = connectPgSimple(session);
  const sessionPool = new Pool({ connectionString: process.env.DATABASE_URL });
  sessionStore = new PgSession({
    pool: sessionPool as any,
    tableName: "session",
    createTableIfMissing: true,
  });
} else {
  const MemorySessionStore = MemoryStore(session);
  sessionStore = new MemorySessionStore({ checkPeriod: 86400000 });
}

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'theboyzpick-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  await applyMigrations();
  await seedDatabase();

  // Cron jobs only in development — Vercel handles scheduling via /api/cron/fetch-games
  if (!isProduction) {
    startCronJobs();
  }

  const httpServer = createServer(app);

  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const clients = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => { clients.delete(ws); });
  });

  function broadcast(message: any) {
    const data = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  await registerRoutes(app, broadcast);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  httpServer.listen({ port, host: "0.0.0.0" }, () => {
    log(`serving on port ${port}`);
  });
})();

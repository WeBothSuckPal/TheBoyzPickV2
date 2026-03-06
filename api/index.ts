import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { registerRoutes } from "../server/routes";
import { seedDatabase } from "../server/seed";

// Required for Neon serverless in non-browser environments
neonConfig.webSocketConstructor = ws;

declare module "express-session" {
  interface SessionData {
    isAdminAuthenticated?: boolean;
    playerId?: string;
    playerName?: string;
  }
}

const app = express();

const PgSession = connectPgSimple(session);
const sessionPool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(
  session({
    store: new PgSession({
      pool: sessionPool as any,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret:
      process.env.SESSION_SECRET ||
      "theboyzpick-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Lazy initialization — routes are registered on first request
let initPromise: Promise<void> | null = null;

function initialize(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await seedDatabase();
      // No broadcast/WebSocket on Vercel — clients use polling
      await registerRoutes(app);
    })();
  }
  return initPromise;
}

const handler = async (req: Request, res: Response) => {
  await initialize();
  app(req, res);
};

export default handler;

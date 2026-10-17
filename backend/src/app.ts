import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const requiredEnv = [
  "PORT",
  "DATABASE_URL",
  "JWT_SECRET",
  "BREVO_API_KEY",
  "EMAIL_FROM_NAME",
  "EMAIL_FROM_ADDRESS",
  "FRONTEND_URL",
] as const;

const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnv.join(", ")}`
  );
}

const FRONTEND_URL = process.env.FRONTEND_URL!;

import authRouter from "./routes/auth.route.ts";
import boardRouter from "./routes/board.route.ts";
import columnRouter from "./routes/column.route.ts";
import cardRouter from "./routes/card.route.ts";
import publicShareRouter from "./routes/publicshare.route.ts";
import privateShareRouter from "./routes/privateshare.routes.ts";
import prisma from "./lib/prisma.ts";

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, try again later" },
});

const publicTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, try again later" },
});

app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({ success: true, database: "up" });
  } catch (error) {
    console.error("Health check failed ", error);
    return res.status(503).json({ success: false, database: "down" });
  }
});

app.use("/api/auth", authLimiter, authRouter);
app.use("/api/board", boardRouter);
app.use("/api/column", columnRouter);
app.use("/api/card", cardRouter);
app.use("/api/public", publicTokenLimiter, publicShareRouter);
app.use("/api/private", publicTokenLimiter, privateShareRouter);

app.use((req, res) => {
  return res
    .status(404)
    .json({ success: false, message: "Route not found" });
});

app.use(
  (
    error: unknown,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Unhandled error ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
);

export default app;

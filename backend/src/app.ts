import express from "express";
import cors from "cors";
import dotenv from "dotenv"
dotenv.config();

import authRouter from "./routes/auth.route.ts";
import boardRouter from "./routes/board.route.ts"
import columnRouter from "./routes/column.route.ts";
import cardRouter from "./routes/card.route.ts";
import publicShareRouter from "./routes/publicshare.route.ts";
import privateShareRouter from "./routes/privateshare.routes.ts"

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({success: true})
})

app.use("/api/auth", authRouter)
app.use("/api/board", boardRouter)
app.use("/api/column", columnRouter);
app.use("/api/card", cardRouter);
app.use("/api/public", publicShareRouter);
app.use("/api/private", privateShareRouter);

export default app;


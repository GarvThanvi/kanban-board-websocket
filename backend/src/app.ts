import express from "express";
import cors from "cors";
import dotenv from "dotenv"
dotenv.config();

import authRouter from "./routes/auth.route.js";

const app = express();

const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({success: true})
})

app.use("/api/auth", authRouter)

app.listen(PORT, () => {
    console.log("Server running on port", PORT);
})


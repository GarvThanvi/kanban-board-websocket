import express from "express";
import {z} from "zod";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(verifyToken)

const createBoardSchema = z.object({

})

router.post("/", async(req, res) => {
    console.log(req.userId);
});

export default router;
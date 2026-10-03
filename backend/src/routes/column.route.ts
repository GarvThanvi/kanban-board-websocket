import express from "express";
import { z } from "zod";
import { verifyToken } from "../middleware/auth.middleware.js";
import prisma from "../lib/prisma.js";

const router = express.Router();

router.use(verifyToken);

const addColumnSchema = z.object({
  name: z.string(),
  position: z.number().positive(),
});

router.post("/:boardId", async (req, res) => {
  try {
    const userId = req.userId!;
    const boardId = req.params.boardId!;

    const result = addColumnSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ success: false, message: result.error.issues[0]?.message });
    }

    const newColumnData = result.data;

    const board = await prisma.board.findUnique({
      where: {
        ownerId: userId,
        id: boardId,
      },
    });

    if (!board) {
      return res
        .status(404)
        .json({ success: false, message: "Board not found" });
    }

    const newColumn = await prisma.column.create({
      data: {
        boardId: board.id,
        name: newColumnData.name,
        position: newColumnData.position,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Created new column successfully",
      data: {
        board,
        newColumn,
      },
    });
  } catch (error) {
    console.error("Error while adding a new column ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

export default router;

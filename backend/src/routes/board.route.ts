import express from "express";
import { z } from "zod";
import { verifyToken } from "../middleware/auth.middleware.js";
import prisma from "../lib/prisma.js";
import { requireBoardRole } from "../middleware/boardAccess.middleware.ts";

const router = express.Router();

router.use(verifyToken);

const createBoardSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
});
type createBoard = z.infer<typeof createBoardSchema>;

const updateBoardSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});

interface updateData {
  name?: string;
  description?: string;
}

router.post("/", async (req, res) => {
  try {
    const userId = req.userId!;

    const result = createBoardSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ success: false, message: result.error.issues[0]?.message });
    }

    const boardData: createBoard = result.data;
    const defaultColumnNames = ["To Do", "In Progress", "Done"];

    const { board, columns } = await prisma.$transaction(async (tx) => {
      const board = await tx.board.create({
        data: {
          name: boardData.name,
          description: boardData.description || "",
          ownerId: userId,
        },
      });

      const columns = await Promise.all(
        defaultColumnNames.map(async (columnName, index) => {
          return await tx.column.create({
            data: {
              name: columnName,
              boardId: board.id,
              position: index + 1,
            },
          });
        })
      );

      return { board, columns };
    });

    return res.status(200).json({
      success: true,
      message: "Successfully created a board",
      data: {
        board: board,
        columns: columns,
      },
    });
  } catch (error) {
    console.error("Error while creating board ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const userId = req.userId!;

    const boards = await prisma.board.findMany({
      where: {
        ownerId: userId,
      },
    });

    const membership = await prisma.boardMember.findMany({
      where: { userId },
      include: {
        board: { include: { owner: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    const shared = membership.map((m) => ({ ...m.board, role: m.role }));

    return res.status(200).json({
      success: true,
      message: "Successfully fetched boards for user",
      boards,
      shared
    });
  } catch (error) {
    console.error("Error while fetching boards for a user ", error);
    return res
      .status(500)
      .json({ success: false, message: "Interval server error" });
  }
});

router.get("/:boardId", requireBoardRole("VIEWER"), async (req, res) => {
  try {
    const boardId = req.params.boardId! as string;

    const boardWithColumnsWithCards = await prisma.board.findUnique({
      where: {
        id: boardId,
      },
      include: {
        columns: {
          orderBy: { position: "asc" },
          include: {
            cards: { orderBy: { position: "asc" } },
          },
        },
      },
    });

    if (!boardWithColumnsWithCards)
      return res
        .status(404)
        .json({ success: false, message: "Board not found" });

    return res.status(200).json({
      success: true,
      data: boardWithColumnsWithCards,
      role: req.boardRole,
    });
  } catch (error) {
    console.error("Error while getting detailed board ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

router.patch("/:boardId", requireBoardRole("OWNER"), async (req, res) => {
  try {
    const userId = req.userId!;
    const boardId = req.params.boardId! as string;

    const result = updateBoardSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ success: false, message: result.error.issues[0]?.message });
    }

    let toUdpateData: updateData = {};
    if (result.data.name) toUdpateData.name = result.data.name;
    if (result.data.description)
      toUdpateData.description = result.data.description;

    const updatedBoard = await prisma.board.update({
      where: {
        ownerId: userId,
        id: boardId,
      },
      data: toUdpateData,
    });
    if (!updatedBoard) {
      return res.status(404).json({
        success: false,
        message: "No such board found or the board doesnt belong to you",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Board updates successfully",
      updatedBoard: updatedBoard,
    });
  } catch (error) {
    console.error("Error while updating board ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

router.delete("/:boardId", requireBoardRole("OWNER"), async (req, res) => {
  try {
    const userId = req.userId!;
    const boardId = req.params.boardId as string;

    const deleteResult = await prisma.board.deleteMany({
      where: {
        id: boardId,
        ownerId: userId,
      },
    });

    if (deleteResult.count == 0) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized or board not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Sucessfully deleted the board",
      id: boardId,
    });
  } catch (error) {
    console.error("Error while deleting a board ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

export default router;

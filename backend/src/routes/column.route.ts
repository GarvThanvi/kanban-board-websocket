import express from "express";
import { z } from "zod";
import { verifyToken } from "../middleware/auth.middleware.js";
import prisma from "../lib/prisma.js";
import { requireBoardRole } from "../middleware/boardAccess.middleware.ts";

const router = express.Router();

router.use(verifyToken);

const addColumnSchema = z.object({
  name: z.string(),
  position: z.number().positive(),
});

const renameColumnSchema = z.object({
  name: z.string(),
});

const repositionColumnSchema = z.object({
  columns: z.array(
    z.object({
      columnId: z.string(),
      position: z.number().positive(),
    })
  ),
});

type repositionColumnSchema = z.infer<typeof repositionColumnSchema>;

router.post("/:boardId", requireBoardRole("EDITOR"), async (req, res) => {
  try {
    const userId = req.userId!;
    const boardId = req.params.boardId! as string;

    const result = addColumnSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ success: false, message: result.error.issues[0]?.message });
    }

    const newColumnData = result.data;

    const board = await prisma.board.findUnique({
      where: {
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

    const io = req.app.get("io");
    io.to(boardId).emit("column:created", { newColumn });

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

router.patch(
  "/:boardId/columns/:columnId",
  requireBoardRole("EDITOR"),
  async (req, res) => {
    try {
      const { boardId, columnId } = req.params as {
        boardId: string;
        columnId: string;
      };

      const result = renameColumnSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ success: false, message: result.error.issues[0]?.message });
      }

      const newName: { name: string } = result.data;

      const board = await prisma.board.findUnique({
        where: {
          id: boardId,
        },
      });
      if (!board) {
        return res
          .status(404)
          .json({ success: false, message: "Board not found" });
      }

      const existingColumn = await prisma.column.findFirst({
        where: {
          boardId: board.id,
          id: columnId,
        },
      });

      if (!existingColumn) {
        return res
          .status(404)
          .json({ success: false, message: "Column not found" });
      }

      const updatedColumn = await prisma.column.update({
        where: {
          id: columnId,
          boardId: board.id,
        },
        data: {
          name: newName.name,
        },
      });

      const io = req.app.get("io");
      io.to(boardId).emit("column:updated", { updatedColumn });

      return res.status(200).json({
        success: true,
        message: "Successfully updated the column name",
        updatedColumn,
      });
    } catch (error) {
      console.error("Error while renaming a column ", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

router.patch(
  "/:boardId/position",
  requireBoardRole("EDITOR"),
  async (req, res) => {
    try {
      const { boardId } = req.params as { boardId: string };

      const result = repositionColumnSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ success: false, message: result.error.issues[0]?.message });
      }

      const repositionData: repositionColumnSchema = result.data;

      const board = await prisma.board.findUnique({
        where: {
          id: boardId,
        },
      });
      if (!board)
        return res
          .status(404)
          .json({ success: false, message: "Board not found" });

      const columns = await prisma.column.findMany({
        where: {
          boardId: board.id,
        },
      });

      const columnIds: string[] = columns.map((col) => col.id).sort();
      const columnIdsToUpdate: string[] = repositionData.columns
        .map((col) => col.columnId)
        .sort();

      const areIdentical =
        JSON.stringify(columnIds) === JSON.stringify(columnIdsToUpdate);
      if (!areIdentical) {
        return res
          .status(404)
          .json({ success: false, message: "Invalid columns provided" });
      }

      await prisma.$transaction(
        repositionData.columns.map((col) =>
          prisma.column.update({
            where: {
              id: col.columnId,
            },
            data: {
              position: col.position,
            },
          })
        )
      );

      const updatedColumns = await prisma.column.findMany({
        where: {
          boardId: board.id,
        },
      });

      const io = req.app.get("io");
      io.to(boardId).emit("column:moved", { updatedColumns });

      return res.status(200).json({
        success: true,
        message: "Successfully re-ordered the columns",
        data: updatedColumns,
      });
    } catch (error) {
      console.error("Error while repositioning columns ", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

router.delete(
  "/:boardId/columns/:columnId/delete",
  requireBoardRole("EDITOR"),
  async (req, res) => {
    try {
      const { boardId, columnId } = req.params as {
        boardId: string;
        columnId: string;
      };

      const board = await prisma.board.findUnique({
        where: {
          id: boardId,
        },
      });

      if (!board) {
        return res
          .status(404)
          .json({ success: false, message: "Board not found" });
      }

      const columns = await prisma.column.findMany({
        where: {
          boardId: board.id,
        },
        orderBy: {
          position: "asc",
        },
      });

      const exists = columns.some((col) => col.id === columnId);
      if (!exists) {
        return res
          .status(404)
          .json({ success: false, message: "Invalid column provided" });
      }

      await prisma.column.delete({
        where: {
          id: columnId,
        },
      });

      const filteredColumns = columns.filter((col) => col.id !== columnId);

      await prisma.$transaction(
        filteredColumns.map((col, index) =>
          prisma.column.update({
            where: {
              id: col.id,
            },
            data: {
              position: index + 1,
            },
          })
        )
      );

      const updatedColumns = await prisma.column.findMany({
        where: {
          boardId: board.id,
        },
      });

      const io = req.app.get("io");
      io.to(boardId).emit("column:deleted", {
        columnIdDeleted: columnId,
        updatedColumns,
      });

      return res.status(200).json({
        success: true,
        message: "Successfully deleted a column",
        data: updatedColumns,
      });
    } catch (error) {
      console.error("Error while deleting a column", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

export default router;

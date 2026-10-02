import express from "express";
import { z } from "zod";
import { verifyToken } from "../middleware/auth.middleware.js";
import prisma from "../lib/prisma.js";

const router = express.Router();

router.use(verifyToken);

const createBoardSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
});
type createBoard = z.infer<typeof createBoardSchema>;

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

router.delete("/:id", async (req, res) => {
    try {
        const userId = req.userId!;
        const boardId = req.params.id;

        const deleteResult = await prisma.board.deleteMany({
            where: {
                id: boardId,
                ownerId: userId 
            }
        })

        if(deleteResult.count == 0){
            return res.status(403).json({ success: false, message: "Unauthorized or board not found" });
        }

        return res.status(200).json({success: true, message: "Sucessfully deleted the board", id: boardId})
    } catch (error) {
        console.error("Error while deleting a board ", error);
        return res.status(500).json({success: false, message: "Internal server error"})
    }
});

export default router;

import express from "express";
import { verifyToken } from "../middleware/auth.middleware.ts";
import prisma from "../lib/prisma.ts";
import { generateShareToken } from "../utils/token.ts";
import { z } from "zod";
import { requireBoardRole } from "../middleware/boardAccess.middleware.ts";

const router = express.Router();

const toggleBoardSchema = z.object({
  enabled: z.boolean(),
});

router.use(verifyToken);

router.post("/share/:boardId", requireBoardRole("OWNER"), async (req, res) => {
  try {
    const boardId = req.params.boardId as string;

    const board = await prisma.board.findUnique({
      where: {
        id: boardId,
      },
    });

    if (!board)
      return res
        .status(404)
        .json({ success: false, message: "Board not found" });

    const publicBoardLink = await prisma.publicBoardLink.findUnique({
      where: {
        boardId: board.id,
      },
    });
    if (publicBoardLink)
      return res.status(200).json({
        success: true,
        message: "Token already exists",
        token: publicBoardLink.token,
      });

    const newPublicBoardLink = await prisma.publicBoardLink.create({
      data: {
        boardId: board.id,
        token: generateShareToken(),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Successfully generated the token",
      token: newPublicBoardLink.token,
    });
  } catch (error) {
    console.error("Error while generating a token", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

router.get("/:token", async (req, res) => {
  try {
    const token = req.params.token;

    const publicBoardLink = await prisma.publicBoardLink.findUnique({
      where: {
        token,
      },
      include: {
        board: {
          include: {
            columns: {
              include: {
                cards: {
                  orderBy: {
                    position: "asc",
                  },
                },
              },
              orderBy: { position: "asc" },
            },
          },
        },
      },
    });

    if (!publicBoardLink || !publicBoardLink.enabled) {
      return res
        .status(404)
        .json({ success: false, message: "No such board exists" });
    }

    return res.status(200).json({
      success: true,
      message: "Board successfully fetched",
      board: publicBoardLink.board,
    });
  } catch (error) {
    console.error("Error while fetching public shared board ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

router.patch(
  "/toggle-share/:boardId",
  requireBoardRole("OWNER"),
  async (req, res) => {
    try {
      const boardId = req.params.boardId! as string;
      const result = toggleBoardSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ success: false, message: result.error.issues[0]?.message });
      }
      const { enabled }: { enabled: boolean } = result.data;

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

      const publicBoardLinkExists = await prisma.publicBoardLink.findUnique({
        where: {
          boardId: board.id,
        },
      });
      if (!publicBoardLinkExists) {
        return res.status(404).json({
          success: false,
          message: "Public Board Link not yet created",
        });
      }

      const publicBoardLink = await prisma.publicBoardLink.update({
        where: {
          boardId: board.id,
        },
        data: {
          enabled,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Toggled share status",
        publicBoardLink,
      });
    } catch (error) {
      console.error("Error while generating a token", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

export default router;

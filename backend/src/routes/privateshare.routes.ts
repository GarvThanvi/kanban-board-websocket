import express from "express";
import { z } from "zod";
import prisma from "../lib/prisma.ts";
import { generateShareToken } from "../utils/token.ts";
import { sendInviteEmail } from "../utils/email.ts";
import { verifyToken } from "../middleware/auth.middleware.ts";

const router = express.Router();

const sendInviteSchema = z.object({
  email: z.string(),
  role: z.enum(["EDITOR", "VIEWER"]),
});

router.use(verifyToken);

router.post("/invite/:boardId", async (req, res) => {
  try {
    const userId = req.userId!;
    const boardId = req.params.boardId!;

    const result = sendInviteSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(404)
        .json({ success: false, message: result.error.issues[0]?.message });
    }

    const { email, role } = result.data;

    const board = await prisma.board.findUnique({
      where: {
        id: boardId,
        ownerId: userId,
      },
    });
    if (!board) {
      return res
        .status(404)
        .json({ success: false, message: "Board not found" });
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      const alreadyMember = await prisma.boardMember.findUnique({
        where: {
          boardId_userId: {
            boardId: board.id,
            userId: existingUser.id,
          },
        },
      });
      if (alreadyMember) {
        return res
          .status(400)
          .json({ success: false, message: "User is already a board member" });
      }
    }

    const invitation = await prisma.boardInvitation.create({
      data: {
        boardId: boardId,
        senderId: userId,
        receiverId: existingUser?.id ?? null,
        email,
        role,
        token: generateShareToken(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });

    const sender = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    await sendInviteEmail(email, invitation.token, board.name, sender?.name);

    return res.status(200).json({ success: true, invitation });
  } catch (error) {
    console.error("Error while sending invitation ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

export default router;

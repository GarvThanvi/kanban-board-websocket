import express from "express";
import { z } from "zod";
import prisma from "../lib/prisma.ts";
import { generateShareToken } from "../utils/token.ts";
import { sendInviteEmail } from "../utils/email.ts";
import { verifyToken } from "../middleware/auth.middleware.ts";
import { requireBoardRole } from "../middleware/boardAccess.middleware.ts";

const router = express.Router();

const sendInviteSchema = z.object({
  email: z.email(),
  role: z.enum(["EDITOR", "VIEWER"]),
});

router.use(verifyToken);

router.post("/invite/:boardId", requireBoardRole("OWNER"), async (req, res) => {
  try {
    const userId = req.userId!;
    const boardId = req.params.boardId! as string;

    const result = sendInviteSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ success: false, message: result.error.issues[0]?.message });
    }

    const { email, role } = result.data;

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

router.post("/invite/:token/accept", async (req, res) => {
  try {
    const userId = req.userId!;
    const { token } = req.params;

    const boardInvite = await prisma.boardInvitation.findUnique({
      where: { token, receiverId: userId },
    });
    if (
      !boardInvite ||
      (boardInvite.expiresAt && new Date(Date.now()) > boardInvite.expiresAt)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invitation expired. Tell the sender to resend the invitation",
      });
    }

    const boardMemberExists = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: boardInvite.boardId, userId } },
    });
    if (boardMemberExists) {
      return res.status(400).json({
        success: false,
        message: "User is already member of this board",
      });
    }

    const updateInvitation = await prisma.boardInvitation.update({
      where: { token },
      data: { status: "ACCEPTED" },
    });
    const newBoardMember = await prisma.boardMember.create({
      data: {
        boardId: boardInvite.boardId,
        userId,
        role: boardInvite.role,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Successfully accepted board invite",
      newBoardMember,
    });
  } catch (error) {
    console.error("Error while accepting board invitation ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

router.post("/invite/:token/reject", async (req, res) => {
  try {
    const userId = req.userId!;
    const { token } = req.params;

    const boardInvite = await prisma.boardInvitation.findUnique({
      where: { token, receiverId: userId },
    });
    if (!boardInvite) {
      return res.status(400).json({
        success: false,
        message: "Invitation doesn't exist. Already rejected",
      });
    }

    const boardMemberExists = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: boardInvite.boardId, userId } },
    });
    if (boardMemberExists) {
      return res.status(400).json({
        success: false,
        message:
          "User is already member of this board, can't reject invitation",
      });
    }

    await prisma.boardInvitation.update({
      where: { token },
      data: { status: "REJECTED" },
    });

    return res.status(200).json({
      success: true,
      message: "Successfully rejected board invite",
    });
  } catch (error) {
    console.error("Error while accepting rejecting invitation ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

router.get("/invite/pending", async (req, res) => {
  try {
    const userId = req.userId!;

    const boardInvitations = await prisma.boardInvitation.findMany({
      where: { receiverId: userId, status: "PENDING" },
      include: { board: true, sender: { select: { name: true, email: true } } },
    });

    return res.status(200).json({
      success: true,
      message: "Successfully fetched all pending invitations",
      boardInvitations,
    });
  } catch (error) {
    console.error("Error while fetching pending invitations ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

router.get(
  "/invite/pending/:boardId",
  requireBoardRole("OWNER"),
  async (req, res) => {
    try {
      const boardId = req.params.boardId! as string;
      const userId = req.userId!;

      const pendingInvitations = await prisma.boardInvitation.findMany({
        where: { boardId, senderId: userId },
      });

      return res.status(200).json({
        success: true,
        message: "Successfull fetched all invitations for a board",
        pendingInvitations,
      });
    } catch (error) {
      console.error("Error while fetching board invitations ", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

router.delete(
  "/invite/:invitationId",
  requireBoardRole("OWNER"),
  async (req, res) => {
    try {
      const invitationId = req.params.invitationId! as string;
      const userId = req.userId!;

      const boardInvitation = await prisma.boardInvitation.findUnique({
        where: { id: invitationId, senderId: userId },
      });
      if (!boardInvitation) {
        return res.status(404).json({
          success: false,
          message: "Invitation does not exist",
        });
      }

      await prisma.boardInvitation.delete({
        where: { id: invitationId, senderId: userId },
      });

      return res.status(200).json({
        success: true,
        message: "Successfully deleted invitation",
        invitationId,
      });
    } catch (error) {
      console.error("Error while fetching board invitations ", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

export default router;

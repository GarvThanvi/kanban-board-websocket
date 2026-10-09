import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.ts";

export type Role = "OWNER" | "EDITOR" | "VIEWER";
const RANK: Record<Role, number> = { VIEWER: 1, EDITOR: 2, OWNER: 3 };

export const getBoardRole = async (
  boardId: string,
  userId: string
): Promise<Role | null> => {
  const board = await prisma.board.findUnique({
    where: {
      id: boardId,
    },
    select: {
      ownerId: true,
      members: { where: { userId }, select: { role: true } },
    },
  });

  if (!board) return null;
  if (board.ownerId === userId) return "OWNER";
  return board.members[0]?.role ?? null;
};

export const requireBoardRole =
  (minRole: Role) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const boardId = req.params.boardId! as string;
      const role = await getBoardRole(boardId, userId);

      if (!role) {
        return res
          .status(404)
          .json({ success: false, message: "Board not found" });
      }

      if (RANK[role] < RANK[minRole]) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to do this!",
        });
      }

      req.boardRole = role;
      next();
    } catch (error) {
      console.error("Error while checking board access ", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  };

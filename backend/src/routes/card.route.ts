import express from "express";
import { verifyToken } from "../middleware/auth.middleware.ts";
import { z } from "zod";
import prisma from "../lib/prisma.ts";

const router = express.Router();

router.use(verifyToken);

const createCardSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  position: z.number().positive(),
});
type createCard = z.infer<typeof createCardSchema>;

const udpateCardSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
});
type updateCard = z.infer<typeof udpateCardSchema>;

const reorderCardSchema = z.object({
  newColumnId: z.string(),
  oldColumnId: z.string(),
  cards: z.array(
    z.object({
      cardId: z.string(),
      position: z.number().positive(),
    })
  ),
});
type reorderCard = z.infer<typeof reorderCardSchema>;

router.post("/:boardId/columns/:columnId/cards", async (req, res) => {
  try {
    const userId = req.userId!;
    const { boardId, columnId } = req.params;

    const result = createCardSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ success: false, message: result.error.issues[0]?.message });
    }

    const createCardData: createCard = result.data;

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

    const columns = await prisma.column.findMany({
      where: {
        boardId: board.id,
      },
    });

    const columnExists = columns.some((col) => col.id === columnId);
    if (!columnExists) {
      return res
        .status(404)
        .json({ success: false, message: "No such column exists" });
    }

    const newCard = await prisma.card.create({
      data: {
        title: createCardData.title,
        description: createCardData.description || "",
        position: createCardData.position,
        createdById: userId,
        columnId: columnId,
      },
    });

    const io = req.app.get("io");
    io.to(boardId).emit("card:created", newCard);

    return res.status(200).json({
      success: true,
      message: "New card created successfully",
      newCard,
    });
  } catch (error) {
    console.error("Error creating a new card", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

router.patch("/:boardId/cards/:cardId", async (req, res) => {
  try {
    const userId = req.userId!;
    const { boardId, cardId } = req.params;

    const result = udpateCardSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ success: false, message: result.error.issues[0]?.message });
    }

    const updateCardData: updateCard = result.data;
    const updateCardDataFiltered = Object.fromEntries(
      Object.entries(updateCardData).filter(([_, value]) => value !== undefined)
    );

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

    const [columns, card] = await Promise.all([
      prisma.column.findMany({
        where: {
          boardId: board.id,
        },
      }),
      prisma.card.findUnique({
        where: {
          id: cardId,
        },
      }),
    ]);
    const cardExistsInColumns = columns.some(
      (col) => col.id === card?.columnId
    );

    if (!card || !cardExistsInColumns) {
      return res
        .status(404)
        .json({ success: false, message: "Card not found" });
    }

    const updatedCard = await prisma.card.update({
      where: {
        id: card.id,
      },
      data: updateCardDataFiltered,
    });

    const io = req.app.get("io");
    io.to(boardId).emit("card:updated", updatedCard);

    return res.status(200).json({
      success: true,
      message: "Successfully created a card",
      updatedCard,
    });
  } catch (error) {
    console.error("Error while creating a card ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

router.patch("/:boardId/cards/:cardId/move", async (req, res) => {
  try {
    const userId = req.userId!;
    const { boardId, cardId } = req.params;

    const result = reorderCardSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ success: false, message: result.error.issues[0]?.message });
    }

    const reorderCardData: reorderCard = result.data;

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

    const columns = await prisma.column.findMany({
      where: {
        boardId: board.id,
      },
    });

    const oldColumnExists: boolean = columns.some(
      (col) => col.id === reorderCardData.oldColumnId
    );
    const newColumnExists: boolean = columns.some(
      (col) => col.id === reorderCardData.newColumnId
    );
    if (!oldColumnExists || !newColumnExists) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid columns provided" });
    }

    if (reorderCardData.newColumnId === reorderCardData.oldColumnId) {
      const cards = await prisma.card.findMany({
        where: {
          columnId: reorderCardData.newColumnId,
        },
        orderBy: {
          position: "asc",
        },
      });
      const cardIdFromBody: string[] = reorderCardData.cards
        .map((card) => card.cardId)
        .sort();
      const cardIdFromDB: string[] = cards.map((card) => card.id).sort();

      const isIdentical =
        JSON.stringify(cardIdFromBody) === JSON.stringify(cardIdFromDB);
      if (!isIdentical) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid cards provided" });
      }

      await prisma.$transaction(
        reorderCardData.cards.map((card) =>
          prisma.card.update({
            where: {
              id: card.cardId,
            },
            data: {
              position: card.position,
            },
          })
        )
      );
    } else {
      const card = await prisma.card.findUnique({
        where: {
          id: cardId,
          columnId: reorderCardData.oldColumnId,
        },
      });
      if (!card) {
        return res
          .status(404)
          .json({ success: false, message: "Card not found" });
      }

      const cards = await prisma.card.findMany({
        where: {
          columnId: reorderCardData.newColumnId,
        },
      });

      const expectedIds: string[] = [...cards.map((c) => c.id), cardId].sort();
      const receivedIds: string[] = reorderCardData.cards
        .map((c) => c.cardId)
        .sort();

      const isIdentical =
        JSON.stringify(expectedIds) === JSON.stringify(receivedIds);
      if (!isIdentical) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid cards provided" });
      }

      await prisma.$transaction(
        reorderCardData.cards.map((card) =>
          prisma.card.update({
            where: { id: card.cardId },
            data:
              card.cardId === cardId
                ? {
                    columnId: reorderCardData.newColumnId,
                    position: card.position,
                  }
                : { position: card.position },
          })
        )
      );
    }

    const [oldColumnCards, newColumnCards] = await Promise.all([
      prisma.card.findMany({
        where: { columnId: reorderCardData.oldColumnId },
        orderBy: { position: "asc" },
      }),
      reorderCardData.newColumnId === reorderCardData.oldColumnId
        ? Promise.resolve(null)
        : prisma.card.findMany({
            where: { columnId: reorderCardData.newColumnId },
            orderBy: { position: "asc" },
          }),
    ]);

    const io = req.app.get("io");
    io.to(boardId).emit("card:moved", {
      oldColumn: {
        columnId: reorderCardData.oldColumnId,
        cards: oldColumnCards,
      },
      newColumn: {
        columnId: reorderCardData.newColumnId,
        cards: newColumnCards ?? oldColumnCards,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Card moved successfully",
      oldColumn: {
        columnId: reorderCardData.oldColumnId,
        cards: oldColumnCards,
      },
      newColumn: {
        columnId: reorderCardData.newColumnId,
        cards: newColumnCards ?? oldColumnCards,
      },
    });
  } catch (error) {
    console.error("Error while  moving cards ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

router.delete("/:boardId/card/:cardId", async (req, res) => {
  try {
    const userId = req.userId!;
    const { boardId, cardId } = req.params;

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

    const columns = await prisma.column.findMany({
      where: {
        boardId: board.id,
      },
    });
    if (!columns) {
      return res
        .status(404)
        .json({ success: false, message: "No columns exist in this  board" });
    }
    const card = await prisma.card.findUnique({
      where: {
        id: cardId,
      },
    });

    const cardMembership: boolean = columns.some(
      (col) => col.id === card?.columnId
    );
    if (!cardMembership) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid card provided" });
    }

    await prisma.card.delete({
      where: {
        id: cardId,
      },
    });

    const io = req.app.get("io");
    io.to(boardId).emit("card:deleted", { cardId });

    return res.status(200).json({
      success: true,
      message: "Deleted card successfully",
      deletedCardId: cardId,
    });
  } catch (error) {
    console.error("Error while deleting a card ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

export default router;

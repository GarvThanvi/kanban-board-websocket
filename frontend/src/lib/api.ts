import { useAuth } from "../stores/auth";
import type {
  Board,
  SharedBoard,
  BoardDetail,
  BoardMember,
  Card,
  Column,
  Invitation,
  InvitePreview,
  User,
} from "./types";

const API_ORIGIN = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
const BASE = `${API_ORIGIN}/api`;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuth.getState().token;
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    if (res.status === 401) useAuth.getState().clearAuth();
    throw new ApiError(res.status, body?.message ?? "Request failed");
  }
  return body as T;
}

const post = <T>(path: string, data?: unknown) =>
  request<T>(path, {
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
const patch = <T>(path: string, data: unknown) =>
  request<T>(path, { method: "PATCH", body: JSON.stringify(data) });
const del = <T>(path: string) => request<T>(path, { method: "DELETE" });

type Envelope<T extends object> = { success: boolean; message?: string } & T;

export const api = {
  // ---------- auth ----------
  signup: (data: { name: string; email: string; password: string }) =>
    post<Envelope<{ token: string; data: User }>>("/auth/signup", data),
  signin: (data: { email: string; password: string }) =>
    post<Envelope<{ token: string; data: User }>>("/auth/signin", data),
  me: () => request<Envelope<{ data: User }>>("/auth/me"),
  updateMe: (data: { name?: string; email?: string }) =>
    patch<Envelope<{ data: User }>>("/auth/me", data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    post<Envelope<Record<string, never>>>("/auth/change-password", data),
  forgotPassword: (data: { email: string }) =>
    post<Envelope<Record<string, never>>>("/auth/forgot-password", data),
  resetPassword: (data: { token: string; password: string }) =>
    post<Envelope<Record<string, never>>>("/auth/reset-password", data),

  // ---------- boards ----------
  createBoard: (data: { name: string; description?: string }) =>
    post<Envelope<{ data: { board: Board; columns: Column[] } }>>("/board", data),
  listBoards: () =>
    request<Envelope<{ boards: Board[]; shared: SharedBoard[] }>>("/board"),
  getBoard: async (boardId: string) => {
    const res = await request<
      Envelope<{ data: Omit<BoardDetail, "role">; role: BoardDetail["role"] }>
    >(`/board/${boardId}`);
    return { ...res.data, role: res.role } as BoardDetail;
  },
  updateBoard: (boardId: string, data: { name?: string; description?: string }) =>
    patch<Envelope<{ updatedBoard: Board }>>(`/board/${boardId}`, data),
  deleteBoard: (boardId: string) =>
    del<Envelope<{ id: string }>>(`/board/${boardId}`),
  listMembers: (boardId: string) =>
    request<Envelope<{ boardMembers: BoardMember[] }>>(
      `/board/${boardId}/members`
    ),
  updateMemberRole: (
    boardId: string,
    userId: string,
    role: "EDITOR" | "VIEWER"
  ) =>
    patch<Envelope<{ updatedMember: BoardMember }>>(
      `/board/${boardId}/members/${userId}/role`,
      { role }
    ),
  removeMember: (boardId: string, userId: string) =>
    del<Envelope<Record<string, never>>>(`/board/${boardId}/members/${userId}`),

  // ---------- columns ----------
  createColumn: (boardId: string, data: { name: string }) =>
    post<Envelope<{ data: { newColumn: Column } }>>(`/column/${boardId}`, data),
  renameColumn: (boardId: string, columnId: string, data: { name: string }) =>
    patch<Envelope<{ updatedColumn: Column }>>(
      `/column/${boardId}/columns/${columnId}`,
      data
    ),
  repositionColumns: (
    boardId: string,
    columns: { columnId: string; position: number }[]
  ) =>
    patch<Envelope<{ data: Column[] }>>(`/column/${boardId}/position`, {
      columns,
    }),
  deleteColumn: (boardId: string, columnId: string) =>
    del<Envelope<{ data: Column[] }>>(
      `/column/${boardId}/columns/${columnId}/delete`
    ),

  // ---------- cards ----------
  createCard: (
    boardId: string,
    columnId: string,
    data: { title: string; description?: string }
  ) =>
    post<Envelope<{ newCard: Card }>>(
      `/card/${boardId}/columns/${columnId}/cards`,
      data
    ),
  updateCard: (
    boardId: string,
    cardId: string,
    data: { title?: string; description?: string }
  ) =>
    patch<Envelope<{ updatedCard: Card }>>(
      `/card/${boardId}/cards/${cardId}`,
      data
    ),
  moveCard: (
    boardId: string,
    cardId: string,
    data: {
      newColumnId: string;
      oldColumnId: string;
      cards: { cardId: string; position: number }[];
    }
  ) =>
    patch<
      Envelope<{
        oldColumn: { columnId: string; cards: Card[] };
        newColumn: { columnId: string; cards: Card[] };
      }>
    >(`/card/${boardId}/cards/${cardId}/move`, data),
  deleteCard: (boardId: string, cardId: string) =>
    del<Envelope<{ deletedCardId: string }>>(`/card/${boardId}/card/${cardId}`),

  // ---------- public share ----------
  createPublicLink: (boardId: string) =>
    post<Envelope<{ token: string }>>(`/public/share/${boardId}`),
  getPublicBoard: (token: string) =>
    request<
      Envelope<{ board: Omit<BoardDetail, "role" | "publicLink" | "members"> }>
    >(`/public/${token}`),
  togglePublicLink: (boardId: string, enabled: boolean) =>
    patch<Envelope<{ publicBoardLink: { token: string; enabled: boolean } }>>(
      `/public/toggle-share/${boardId}`,
      { enabled }
    ),
  deletePublicLink: (boardId: string) =>
    del<Envelope<Record<string, never>>>(`/public/share/${boardId}/delete`),
  rotatePublicLink: (boardId: string) =>
    post<Envelope<{ token: string }>>(`/public/rotate/${boardId}`),

  // ---------- private share ----------
  sendInvite: (
    boardId: string,
    data: { email: string; role: "EDITOR" | "VIEWER" }
  ) =>
    post<Envelope<{ invitation: Invitation }>>(
      `/private/invite/${boardId}`,
      data
    ),
  myPendingInvites: () =>
    request<Envelope<{ boardInvitations: Invitation[] }>>(
      "/private/invite/pending"
    ),
  boardPendingInvites: (boardId: string) =>
    request<Envelope<{ pendingInvitations: Invitation[] }>>(
      `/private/invite/pending/${boardId}`
    ),
  invitePreview: (token: string) =>
    request<Envelope<{ invitation: InvitePreview }>>(
      `/private/invite/${token}`
    ),
  acceptInvite: (token: string) =>
    post<Envelope<Record<string, never>>>(`/private/invite/${token}/accept`),
  rejectInvite: (token: string) =>
    post<Envelope<Record<string, never>>>(`/private/invite/${token}/reject`),
  revokeInvite: (invitationId: string) =>
    del<Envelope<Record<string, never>>>(`/private/invite/${invitationId}`),
};

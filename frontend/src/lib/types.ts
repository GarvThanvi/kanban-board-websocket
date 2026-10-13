export type Role = "OWNER" | "EDITOR" | "VIEWER";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Board {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SharedBoard extends Board {
  role: Role;
  owner: { id: string; name: string };
}

export interface Card {
  id: string;
  title: string;
  description: string | null;
  position: number;
  columnId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  name: string;
  position: number;
  boardId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ColumnWithCards extends Column {
  cards: Card[];
}

export interface PublicLink {
  id: string;
  boardId: string;
  token: string;
  enabled: boolean;
}

export interface BoardMember {
  id: string;
  boardId: string;
  userId: string;
  role: Role;
  user: { name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface BoardDetail extends Board {
  columns: ColumnWithCards[];
  publicLink: PublicLink | null;
  members: BoardMember[];
  role: Role;
}

export interface Invitation {
  id: string;
  boardId: string;
  email: string;
  role: Exclude<Role, "OWNER">;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  token: string;
  expiresAt: string | null;
  createdAt: string;
  board?: Board;
  sender?: { name: string; email: string };
}

export interface InvitePreview {
  boardName: string;
  role: Exclude<Role, "OWNER">;
  status: string;
  expiresAt: string | null;
  expired: boolean;
  inviter: { name: string; email: string };
}

export interface PresenceUser {
  id: string;
  name: string;
  isGuest: boolean;
}

export type ActionType =
  | "editing"
  | "creating"
  | "moving"
  | "columnCreating"
  | "columnEditing"
  | "columnMoving";

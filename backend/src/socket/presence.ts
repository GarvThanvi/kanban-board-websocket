export type SocketUser = {
  id: string;
  name: string;
  isGuest: boolean;
};

type Entry = { sockets: Set<string>; user: SocketUser };

const boardPresence = new Map<string, Map<string, Entry>>();

export const addToBoard = (
  boardId: string,
  user: SocketUser,
  socketId: string
): { count: number; users: SocketUser[] } => {
  let users = boardPresence.get(boardId);
  if (!users) {
    users = new Map();
    boardPresence.set(boardId, users);
  }

  let entry = users.get(user.id);
  if (!entry) {
    entry = { sockets: new Set(), user };
    users.set(user.id, entry);
  }
  entry.sockets.add(socketId);

  return { count: users.size, users: getBoardUsers(boardId) };
};

export const removeFromBoard = (
  boardId: string,
  userId: string,
  socketId: string
): { count: number; users: SocketUser[] } => {
  const users = boardPresence.get(boardId);
  if (!users) {
    return { count: 0, users: [] };
  }

  const entry = users.get(userId);
  if (entry) {
    entry.sockets.delete(socketId);
    if (entry.sockets.size === 0) users.delete(userId);
  }

  if (users.size === 0) boardPresence.delete(boardId);

  return { count: users.size, users: getBoardUsers(boardId) };
};

export const getBoardUsers = (boardId: string): SocketUser[] => {
  const users = boardPresence.get(boardId);
  if (!users) return [];
  return Array.from(users.values()).map((entry) => entry.user);
};

export const getBoardCount = (boardId: string): number => {
  return boardPresence.get(boardId)?.size ?? 0;
};

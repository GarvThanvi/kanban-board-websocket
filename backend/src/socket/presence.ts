const boardPresence = new Map<string, Map<string, Set<string>>>();

export const addToBoard = (
  boardId: string,
  userId: string,
  socketId: string
) => {
  if (!boardPresence.has(boardId)) {
    boardPresence.set(boardId, new Map());
  }

  const users = boardPresence.get(boardId);
  if (!users?.has(userId)) {
    users?.set(userId, new Set());
  }

  users?.get(userId)?.add(socketId);

  return users?.size;
};

export const removeFromBoard = (
  boardId: string,
  userId: string,
  socketId: string
) => {
    const users = boardPresence.get(boardId);
    if(!users) return 0;
    
    const sockets = users.get(userId);
    if(sockets){
        sockets.delete(socketId);
        if(sockets.size === 0){
            users.delete(userId);
        }
    }

    if(users.size === 0){
        boardPresence.delete(boardId)
    }

    return users.size;
};

export const getBoardUsers = (boardId: string): string[] => {
    const users = boardPresence.get(boardId);
    if(!users) return [];
    return Array.from(users.keys());
}

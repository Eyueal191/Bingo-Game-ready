import { useEffect } from "react";

export const useKeshkeshSocketLogger = ({ socket, user, gameId }) => {
  useEffect(() => {
    if (!gameId || !socket || !user) return undefined;

    const logEvent = (name, data) => {
      console.log(`[GamePlay] Socket event: ${name}`, data);
    };

    const handlers = {
      keshkesh_room_data: (data) => logEvent("keshkesh_room_data", data),
      gameUpdate: (data) => logEvent("gameUpdate", data),
      error: (data) => logEvent("error", data),
      connect_error: (data) => logEvent("connect_error", data),
      keshkesh_reshake: (data) => logEvent("keshkesh_reshake", data),
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [gameId, socket, user]);
};

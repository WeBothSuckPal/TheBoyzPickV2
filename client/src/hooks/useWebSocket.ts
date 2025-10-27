import { useEffect } from "react";
import { addWebSocketListener } from "@/lib/websocket";

export function useWebSocket(onMessage: (data: any) => void) {
  useEffect(() => {
    const removeListener = addWebSocketListener(onMessage);
    return () => {
      removeListener();
    };
  }, [onMessage]);
}

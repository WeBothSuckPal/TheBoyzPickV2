let ws: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
const listeners = new Set<(data: any) => void>();

export function connectWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("WebSocket connected");
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      listeners.forEach((listener) => listener(data));
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
    }
  };

  ws.onclose = () => {
    console.log("WebSocket disconnected, reconnecting...");
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      connectWebSocket();
    }, 3000);
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
}

export function addWebSocketListener(listener: (data: any) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function sendWebSocketMessage(data: any) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

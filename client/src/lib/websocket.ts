let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const listeners = new Set<(data: any) => void>();

export function connectWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("WebSocket connected");
    reconnectAttempts = 0;
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
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      // Give up reconnecting — polling will keep data fresh
      return;
    }
    console.log(`WebSocket disconnected, reconnecting... (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      reconnectAttempts++;
      connectWebSocket();
    }, 3000);
  };

  ws.onerror = () => {
    // Errors are handled by onclose — suppress console noise on Vercel
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

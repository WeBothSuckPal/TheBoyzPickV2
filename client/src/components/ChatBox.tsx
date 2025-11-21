import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: Date;
}

interface ChatBoxProps {
  messages?: ChatMessage[];
  onSendMessage?: (message: string, user: string) => void;
  currentUser?: string;
  disabled?: boolean;
}

export default function ChatBox({
  messages = [],
  onSendMessage,
  currentUser = "Money-Mike",
  disabled = false,
}: ChatBoxProps) {
  const [newMessage, setNewMessage] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      console.log(`${currentUser}: ${newMessage}`);
      onSendMessage?.(newMessage, currentUser);
      setNewMessage("");
    }
  };

  const getUserColor = (user: string) => {
    const colors: Record<string, string> = {
      "Money-Mike": "text-neon-cyan",
      "The Professor": "text-neon-magenta",
      "Mr. Gut-Feeling": "text-neon-yellow",
      "The Jinx": "text-neon-green",
    };
    return colors[user] || "text-foreground";
  };

  return (
    <Card className="flex flex-col h-[500px] border-2 border-neon-magenta p-0 overflow-hidden" data-testid="card-chat">
      <div className="p-4 border-b border-neon-magenta bg-card/80">
        <h3 className="text-xl font-display text-neon-magenta neon-glow-magenta">
          THE LOCKER ROOM
        </h3>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3" data-testid="container-messages">
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-1" data-testid={`message-${msg.id}`}>
              <div className="flex items-baseline gap-2">
                <span className={`font-display text-sm ${getUserColor(msg.user)}`} data-testid={`text-user-${msg.id}`}>
                  {msg.user}
                </span>
                <span className="text-xs text-muted-foreground" data-testid={`text-time-${msg.id}`}>
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm text-foreground" data-testid={`text-message-${msg.id}`}>
                {msg.message}
              </p>
            </div>
          ))}
        </div>
      </ScrollArea>

      <form onSubmit={handleSend} className="p-4 border-t border-neon-magenta bg-card/80">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={disabled ? "Login to chat..." : "Talk trash..."}
            className="flex-1 border-neon-magenta focus:border-neon-magenta"
            data-testid="input-chat-message"
            disabled={disabled}
          />
          <Button
            type="submit"
            size="icon"
            className="bg-neon-magenta text-background hover:bg-neon-magenta/90"
            data-testid="button-send-message"
            disabled={disabled}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </Card>
  );
}

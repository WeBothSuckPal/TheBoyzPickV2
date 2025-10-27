import ChatBox from "../ChatBox";
import { useState } from "react";

export default function ChatBoxExample() {
  const [messages, setMessages] = useState([
    {
      id: "1",
      user: "Money-Mike",
      message: "My lock is EASY MONEY! 💰",
      timestamp: new Date(Date.now() - 300000),
    },
    {
      id: "2",
      user: "The Professor",
      message: "I've done the analysis. Chiefs are covering.",
      timestamp: new Date(Date.now() - 240000),
    },
    {
      id: "3",
      user: "The Jinx",
      message: "I'm fading Mike's pick. That's a trap game!",
      timestamp: new Date(Date.now() - 180000),
    },
    {
      id: "4",
      user: "Mr. Gut-Feeling",
      message: "My gut says Cowboys all day. Let's gooo!",
      timestamp: new Date(Date.now() - 120000),
    },
  ]);

  const handleSendMessage = (message: string, user: string) => {
    const newMsg = {
      id: Date.now().toString(),
      user,
      message,
      timestamp: new Date(),
    };
    setMessages([...messages, newMsg]);
  };

  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="max-w-2xl mx-auto">
        <ChatBox
          messages={messages}
          onSendMessage={handleSendMessage}
          currentUser="Money-Mike"
        />
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { ChatMessage } from '@/types/task';
import { cn } from '@/lib/utils';

interface ChatBotProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isTyping?: boolean;
}

export function ChatBot({ messages, onSendMessage, isTyping = false }: ChatBotProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl shadow-soft border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center float-animation">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-bold text-base">Study Buddy</h3>
          <p className="text-xs text-muted-foreground">Here to help you stay focused!</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4 float-animation">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h4 className="font-semibold mb-2">Hi there! 👋</h4>
            <p className="text-sm text-muted-foreground max-w-[200px] mx-auto">
              I'm your Study Buddy! Ask me to add tasks, set reminders, or help you stay on track.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {['Add a task', 'What\'s due today?', 'Help me focus'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => onSendMessage(suggestion)}
                  className="px-3 py-1.5 bg-accent text-accent-foreground text-xs font-medium rounded-full hover:bg-accent/80 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'chat-bubble flex',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[80%] px-4 py-2.5 rounded-2xl',
                message.role === 'user'
                  ? 'bg-chat-user text-chat-user-foreground rounded-br-md'
                  : 'bg-chat-bot text-chat-bot-foreground rounded-bl-md'
              )}
            >
              <p className="text-sm leading-relaxed">{message.content}</p>
              <p
                className={cn(
                  'text-[10px] mt-1',
                  message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                )}
              >
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start chat-bubble">
            <div className="bg-chat-bot text-chat-bot-foreground px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border/50">
        <div className="flex items-center gap-2 bg-secondary rounded-full px-4 py-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200',
              input.trim()
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

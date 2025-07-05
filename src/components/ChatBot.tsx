
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { X, Send, Bot, User } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

interface ChatBotProps {
  onClose: () => void;
}

const ChatBot: React.FC<ChatBotProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm your SplitWise assistant. I can help you with expense splitting, payment questions, or general guidance. How can I help you today?",
      isBot: true,
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getBotResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('expense') || lowerMessage.includes('add')) {
      return "To add an expense, click the 'Add Expense' button on the main dashboard. Fill in the description, amount, who paid, and who should split it. The expense will be automatically calculated and added to your group!";
    }
    
    if (lowerMessage.includes('settle') || lowerMessage.includes('pay')) {
      return "To settle up, click the 'Settle Up' button. You can pay using Google Pay for quick transactions, or mark expenses as manually settled. All balances will be updated automatically!";
    }
    
    if (lowerMessage.includes('google pay') || lowerMessage.includes('payment')) {
      return "Google Pay integration allows you to quickly settle debts with friends. When you click 'Pay with Google Pay', you'll be redirected to complete the payment securely. The settlement will be automatically recorded in SplitWise!";
    }
    
    if (lowerMessage.includes('split') || lowerMessage.includes('divide')) {
      return "SplitWise automatically divides expenses equally among all participants you specify. For example, if you add 3 people to a $30 dinner, each person owes $10. You can see individual balances in the expense details!";
    }
    
    if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
      return "Here's what you can do with SplitWise:\n• Add expenses and specify who should split them\n• Track total spending and active expenses\n• Settle up with friends using Google Pay\n• View pending settlements\n• Get automatic balance calculations\n\nWhat would you like to know more about?";
    }
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return "Hello! Welcome to SplitWise. I'm here to help you manage shared expenses with friends. What would you like to know?";
    }
    
    return "I understand you're asking about expense splitting! Here are some things I can help with:\n• Adding and managing expenses\n• Settling up with Google Pay\n• Understanding how splits are calculated\n• General app guidance\n\nCould you be more specific about what you'd like to know?";
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isBot: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: getBotResponse(inputText.trim()),
        isBot: true,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-end p-4 z-50">
      <Card className="w-full max-w-md h-[500px] flex flex-col shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <h3 className="font-semibold">SplitWise Assistant</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 ${message.isBot ? 'justify-start' : 'justify-end'}`}
            >
              {message.isBot && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              
              <div
                className={`max-w-[80%] p-3 rounded-lg whitespace-pre-line ${
                  message.isBot
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <p className={`text-xs mt-1 ${message.isBot ? 'text-gray-500' : 'text-blue-100'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {!message.isBot && (
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-2 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-gray-100 p-3 rounded-lg max-w-[80%]">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask me anything about SplitWise..."
              className="flex-1"
            />
            <Button 
              type="submit" 
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ChatBot;

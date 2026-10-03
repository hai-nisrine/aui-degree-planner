import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, X, Maximize2 } from 'lucide-react';
import './AIChat.css';
import { API_BASE } from '../../api';

let nextMessageId = 2;

const AIChat = ({ onClose = null, isMinimized = false, onExpand = null, studentProfile = {} }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      text: "Hi! I'm your AI course advisor. I can help you plan your courses, suggest electives, check prerequisites, and optimize your schedule. What would you like help with?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: nextMessageId++,
      type: 'user',
      text: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await fetch(`${API_BASE}/api/planner/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          studentProfile
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();

      const aiMessage = {
        id: nextMessageId++,
        type: 'ai',
        text: data.data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('Chat error:', err);

      const errorMessage = {
        id: nextMessageId++,
        type: 'ai',
        text: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (question) => {
    setInputValue(question);
  };

  const suggestedQuestions = [
    "What courses should I take next semester?",
    "Show me available electives",
    "Check prerequisites for CSC 2302",
    "Help optimize my 4-year plan"
  ];

  return (
    <div className={`ai-chat-container ${isMinimized ? 'minimized' : 'fullscreen'}`}>
      {/* Header */}
      <div className="ai-chat-header">
        <div className="header-left">
          <div className="ai-avatar">
            <Sparkles size={20} />
          </div>
          <div className="header-info">
            <h3>AI Course Advisor</h3>
            <span className="status-online">Online</span>
          </div>
        </div>
        <div className="header-actions">
          {onExpand && isMinimized && (
            <button onClick={onExpand} className="header-btn" title="Expand">
              <Maximize2 size={18} />
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="header-btn" title="Close">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="ai-chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message-wrapper ${message.type === 'user' ? 'user-message' : 'ai-message'} ${message.isError ? 'error-message' : ''}`}
          >
            {message.type === 'ai' && (
              <div className="message-avatar">
                <Sparkles size={14} />
              </div>
            )}
            <div className="message-bubble">
              <p>{message.text}</p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="message-wrapper ai-message">
            <div className="message-avatar">
              <Sparkles size={14} />
            </div>
            <div className="message-bubble typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        )}

        {messages.length === 1 && (
          <div className="suggestions-container">
            <p className="suggestions-label">Try asking:</p>
            <div className="suggestions-grid">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(question)}
                  className="suggestion-btn"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="ai-chat-input">
        <div className="input-wrapper">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your courses..."
            className="chat-input"
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className="send-btn"
            title="Send message"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
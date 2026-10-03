import React, { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import './AIAssistantIcon.css';

const AIAssistantIcon = ({ onClick = () => {}, suggestions = [] }) => {
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState(null);
  const [hasNewSuggestion, setHasNewSuggestion] = useState(false);

  // Default suggestions if none provided
  const defaultSuggestions = [
    {
      id: 1,
      text: "You have 3 courses without prerequisites this semester!",
      type: "info"
    },
    {
      id: 2,
      text: "Consider taking Data Structures next - it unlocks 5 advanced courses",
      type: "recommendation"
    },
    {
      id: 3,
      text: "Your schedule looks unbalanced. Try spreading courses evenly?",
      type: "warning"
    },
    {
      id: 4,
      text: "You're on track to graduate on time! 🎓",
      type: "success"
    }
  ];

  const activeSuggestions = suggestions.length > 0 ? suggestions : defaultSuggestions;

  useEffect(() => {
    // Show suggestion every 15 seconds
    const suggestionInterval = setInterval(() => {
      const randomSuggestion = activeSuggestions[Math.floor(Math.random() * activeSuggestions.length)];
      setCurrentSuggestion(randomSuggestion);
      setShowSuggestion(true);
      setHasNewSuggestion(true);

      // Auto-hide after 8 seconds
      setTimeout(() => {
        setShowSuggestion(false);
      }, 8000);
    }, 15000);

    return () => clearInterval(suggestionInterval);
  }, [activeSuggestions]);

  const handleIconClick = () => {
    setHasNewSuggestion(false);
    onClick();
  };

  const closeSuggestion = (e) => {
    e.stopPropagation();
    setShowSuggestion(false);
    setHasNewSuggestion(false);
  };

  const getSuggestionClass = (type) => {
    switch (type) {
      case 'warning':
        return 'suggestion-warning';
      case 'success':
        return 'suggestion-success';
      case 'recommendation':
        return 'suggestion-recommendation';
      default:
        return 'suggestion-info';
    }
  };

  return (
    <div className="ai-assistant-container">
      {/* Suggestion Popup */}
      {showSuggestion && currentSuggestion && (
        <div className={`suggestion-popup ${getSuggestionClass(currentSuggestion.type)}`}>
          <div className="suggestion-content">
            <div className="suggestion-header">
              <Sparkles size={16} />
              <span>AI Suggestion</span>
            </div>
            <p className="suggestion-text">{currentSuggestion.text}</p>
          </div>
          <button onClick={closeSuggestion} className="suggestion-close">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Floating AI Icon */}
      <button onClick={handleIconClick} className="ai-icon-button">
        <Sparkles size={28} />
        
        {/* Notification Badge */}
        {hasNewSuggestion && <span className="notification-badge"></span>}

        {/* Ripple Effect */}
        <span className="ripple-effect"></span>
      </button>
    </div>
  );
};

export default AIAssistantIcon;
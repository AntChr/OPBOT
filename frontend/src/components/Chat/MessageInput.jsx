import { useState, useRef, useEffect } from 'react';

const MessageInput = ({ onSend, disabled = false, placeholder = "Tapez votre message..." }) => {
  const [message, setMessage] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognitionError, setRecognitionError] = useState('');
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);

  // Suggestions de réponses rapides
  const quickResponses = [
    "J'aimerais en savoir plus",
    "Ça m'intéresse beaucoup !",
    "Pas vraiment mon truc",
    "Je ne suis pas sûr(e)",
    "Peux-tu m'expliquer ?",
    "C'est exactement ça !",
    "Plutôt oui",
    "Plutôt non"
  ];

  // Auto-resize du textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  // Focus automatique sur le textarea
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  // Initialiser la Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        setRecognitionError('');
      };

      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setMessage((prev) => prev + transcript);
          }
        }
      };

      recognition.onerror = (event) => {
        let errorMessage = 'Erreur de reconnaissance vocale';
        if (event.error === 'network') {
          errorMessage = 'Erreur réseau';
        } else if (event.error === 'no-speech') {
          errorMessage = 'Pas de son détecté';
        }
        setRecognitionError(errorMessage);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const startListening = () => {
    setRecognitionError('');
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
      setShowSuggestions(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    onSend(suggestion);
    setShowSuggestions(false);
  };

  const toggleSuggestions = () => {
    setShowSuggestions(!showSuggestions);
  };

  return (
    <div style={{position: 'relative', width: '100%'}}>
      {/* Suggestions rapides */}
      {showSuggestions && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          width: '100%',
          marginBottom: '0.5rem'
        }}>
          <div style={{
            background: 'var(--card-dark)',
            border: '1px solid var(--border-dark)',
            borderRadius: '10px',
            padding: '1rem',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              marginBottom: '0.5rem'
            }}>Réponses rapides :</div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              {quickResponses.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={disabled}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-dark)',
                    color: 'var(--text-primary)',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.5 : 1,
                    transition: 'all 0.3s ease'
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Zone de saisie principale */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'flex-end',
        paddingTop: '0.5rem'
      }}>
        {/* Bouton suggestions - Masqué en mobile */}
        <button
          type="button"
          onClick={toggleSuggestions}
          disabled={disabled}
          title="Réponses rapides"
          className="desktop-only"
          style={{
            background: 'transparent',
            border: '1px solid var(--border-dark)',
            color: 'var(--text-primary)',
            padding: '0.75rem',
            borderRadius: '8px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: '1.2rem',
            opacity: disabled ? 0.5 : 1
          }}
        >
          💡
        </button>

        {/* Zone de texte */}
        <div style={{flex: 1}}>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            style={{
              width: '100%',
              backgroundColor: 'var(--card-dark)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-dark)',
              padding: '0.875rem 1rem',
              borderRadius: '10px',
              fontFamily: 'inherit',
              fontSize: '0.95rem',
              resize: 'none',
              minHeight: '44px',
              maxHeight: '120px',
              overflow: 'hidden',
              opacity: disabled ? 0.5 : 1
            }}
            rows="1"
          />

          {/* Compteur de caractères pour les longs messages */}
          {message.length > 200 && (
            <div style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              textAlign: 'right',
              marginTop: '0.25rem'
            }}>
              {message.length}/500
            </div>
          )}
        </div>

        {/* Bouton microphone */}
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          disabled={disabled}
          title={isListening ? "Arrêter l'enregistrement" : "Commencer la reconnaissance vocale"}
          style={{
            background: isListening ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
            border: isListening ? '2px solid var(--primary-accent)' : '1px solid var(--border-dark)',
            color: isListening ? 'var(--primary-accent)' : 'var(--text-primary)',
            padding: '0.625rem',
            borderRadius: '8px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: '1.1rem',
            opacity: disabled ? 0.5 : 1,
            transition: 'all 0.3s ease',
            flexShrink: 0,
            marginBottom: '8px'
          }}
        >
          {isListening ? '🎤' : '🎙️'}
        </button>

        {/* Bouton d'envoi */}
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          title="Envoyer (Entrée)"
          style={{
            background: message.trim() ? 'linear-gradient(135deg, var(--primary-accent), var(--secondary-accent))' : 'transparent',
            border: message.trim() ? 'none' : '1px solid var(--border-dark)',
            color: message.trim() ? 'white' : 'var(--text-secondary)',
            padding: '0.65rem 0.9rem',
            borderRadius: '10px',
            cursor: disabled || !message.trim() ? 'not-allowed' : 'pointer',
            fontSize: '1.1rem',
            fontWeight: '600',
            opacity: disabled || !message.trim() ? 0.5 : 1,
            transition: 'all 0.3s ease',
            flexShrink: 0,
            marginBottom: '8px'
          }}
        >
          {disabled ? '⏳' : '➤'}
        </button>
      </div>

      {/* Aide / Instructions - Masqué en mobile */}
      <div className="desktop-only" style={{
        fontSize: '0.875rem',
        color: 'white',
        marginTop: '0.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        gap: '1rem',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <span>
          💡 Astuce: Soyez naturel(le) et détaillé(e) dans vos réponses
        </span>
        <span>
          Entrée pour envoyer • Maj+Entrée pour nouvelle ligne • 🎙️ Microphone pour parler
        </span>
      </div>

      {/* Affichage des erreurs de reconnaissance vocale */}
      {recognitionError && (
        <div style={{
          fontSize: '0.875rem',
          color: '#fca5a5',
          marginTop: '0.5rem',
          padding: '0.5rem',
          background: 'rgba(252, 165, 165, 0.1)',
          borderRadius: '6px',
          border: '1px solid rgba(252, 165, 165, 0.3)'
        }}>
          ⚠️ {recognitionError}
        </div>
      )}
    </div>
  );
};

export default MessageInput;
import { useState } from 'react';

function ObotChatBubble({ user, actionPlan }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Bonjour ${user?.firstName || 'vous'} ! 👋 Je suis là pour vous accompagner dans votre parcours vers le métier de ${actionPlan?.jobTitle || 'votre objectif'}. Posez-moi vos questions, partagez vos doutes ou dites-moi si vous souhaitez ajuster votre plan d'action.`
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');

    // Ajouter le message de l'utilisateur
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // TODO: Appel API à Obot/Claude
    // Pour l'instant, réponse simulée
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Je comprends votre question. Pour l\'instant, cette fonctionnalité est en cours de développement. Bientôt, je pourrai vous aider à ajuster votre plan d\'action en temps réel ! 🚀'
      }]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Bulle flottante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            width: '60px',
            height: '60px',
            minWidth: '60px',
            minHeight: '60px',
            borderRadius: '50%',
            backgroundColor: '#0d6efd',
            border: 'none',
            boxShadow: '0 4px 12px rgba(13, 110, 253, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            zIndex: 1000,
            transition: 'all 0.3s ease',
            flexShrink: 0,
            padding: 0,
            aspectRatio: '1 / 1'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(13, 110, 253, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(13, 110, 253, 0.4)';
          }}
          title="Discuter avec Obot"
        >
          🤖
        </button>
      )}

      {/* Popup Chat */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            width: '380px',
            height: '550px',
            backgroundColor: '#303030',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            border: '1px solid #444'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px',
              backgroundColor: '#0d6efd',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '24px' }}>🤖</div>
              <div>
                <div style={{ color: 'white', fontWeight: 'bold' }}>Obot</div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                  Votre assistant personnel
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '0',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Fermer"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {messages.map((message, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    backgroundColor: message.role === 'user' ? '#0d6efd' : '#404040',
                    color: 'white',
                    fontSize: '14px',
                    lineHeight: '1.5'
                  }}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    backgroundColor: '#404040',
                    color: 'white',
                    fontSize: '14px'
                  }}
                >
                  <div className="d-flex gap-1">
                    <span className="spinner-grow spinner-grow-sm" role="status"></span>
                    <span className="spinner-grow spinner-grow-sm" role="status"></span>
                    <span className="spinner-grow spinner-grow-sm" role="status"></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div
            style={{
              padding: '16px',
              borderTop: '1px solid #444',
              backgroundColor: '#282828',
              borderBottomLeftRadius: '16px',
              borderBottomRightRadius: '16px'
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Posez votre question..."
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #555',
                  backgroundColor: '#404040',
                  color: 'white',
                  outline: 'none',
                  fontSize: '14px'
                }}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: inputMessage.trim() && !isLoading ? '#0d6efd' : '#555',
                  color: 'white',
                  cursor: inputMessage.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  fontSize: '16px'
                }}
              >
                <i className="fa-solid fa-paper-plane"></i>
              </button>
            </div>
            <div style={{
              color: '#999',
              fontSize: '11px',
              marginTop: '8px',
              textAlign: 'center'
            }}>
              Obot peut ajuster votre plan en fonction de vos besoins
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ObotChatBubble;

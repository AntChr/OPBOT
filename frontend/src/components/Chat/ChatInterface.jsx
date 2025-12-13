import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import '../Chat/Chat.css';

const ChatInterface = ({ user, onMilestoneComplete, onComplete }) => {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Référence pour scroll automatique
  const messagesEndRef = useRef(null);

  // Démarrer la conversation au chargement
  useEffect(() => {
    startConversation();
  }, [user]);

  // Scroll automatique vers le bas à chaque nouveau message
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startConversation = async () => {
    if (!user?._id && !user?.id) {
      console.error('❌ Utilisateur non identifié');
      setError('Utilisateur non identifié');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Appel réel à l'API backend
      const response = await axios.post('http://localhost:5000/api/conversations/start', {
        userId: user._id || user.id
      });

      const conv = {
        _id: response.data.conversationId,
        status: response.data.status,
        currentPhase: response.data.currentPhase,
        buildingProfile: {
          detectedTraits: {},
          interests: [],
          values: [],
          constraints: []
        }
      };

      setConversation(conv);

      // Ajouter le message initial de l'assistant
      const initialMessage = {
        id: 'msg_initial',
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date().toISOString(),
        metadata: {
          questionType: 'welcome',
          strategy: 'opening'
        }
      };

      setMessages([initialMessage]);

    } catch (error) {
      console.error('❌ Erreur démarrage conversation:', error);
      setError('Impossible de démarrer la conversation. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (messageText) => {
    if (!messageText.trim() || !conversation?._id || isTyping) {
      return;
    }

    // Ajouter le message utilisateur immédiatement à l'interface
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    setError(null);

    try {
      // Appel réel à l'API backend
      const response = await axios.post(
        `http://localhost:5000/api/conversations/${conversation._id}/messages`,
        { message: messageText }
      );

      // Utiliser la réponse de l'API
      const assistantMessage = {
        id: 'msg_' + Date.now(),
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString(),
        analysis: response.data.analysis,
        metadata: response.data.analysis
      };

      // Mettre à jour la conversation avec les données du backend
      const updatedConv = {
        ...conversation,
        currentPhase: response.data.currentPhase,
        milestones: response.data.milestones || conversation.milestones
      };

      setConversation(updatedConv);
      setMessages(prev => [...prev, assistantMessage]);

      // 🎯 VÉRIFIER SI LE MILESTONE 5 (métier identifié) EST ATTEINT
      if (response.data.milestones?.specific_job_identified?.achieved) {
        if (onMilestoneComplete) {
          // Appeler le callback pour afficher la page Conclusion
          onMilestoneComplete(updatedConv);
        }
      }

    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
      setError('Erreur lors de l\'envoi du message. Veuillez réessayer.');

      // Retirer le message utilisateur en cas d'erreur
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setIsTyping(false);
    }
  };


  // État de chargement
  if (isLoading) {
    return (
      <div className="chat-container">
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: '3rem', marginBottom: '1rem'}}>⏳</div>
            <div style={{color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '500'}}>
              Démarrage de votre orientation personnalisée...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // État d'erreur
  if (error && !conversation) {
    return (
      <div className="chat-container">
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
          <div style={{textAlign: 'center'}}>
            <div style={{color: '#ff6b6b', fontSize: '1.2rem', marginBottom: '1.5rem'}}>⚠️ {error}</div>
            <button onClick={startConversation} style={{background: 'linear-gradient(135deg, var(--primary-accent), var(--secondary-accent))', color: 'white', padding: '0.875rem 1.5rem', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600'}}>
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Chat Content */}
      <div className="chat-content">
        {/* Messages Section */}
        <div className="messages-section" style={{maxWidth: '1000px', margin: '0 auto'}}>
          {error && (
            <div style={{background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#fca5a5', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span>⚠️ {error}</span>
              <button onClick={() => setError(null)} style={{background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '1.2rem'}}>×</button>
            </div>
          )}

          <div className="messages-wrapper">
            <MessageList
              messages={messages}
              isTyping={isTyping}
            />
            <div ref={messagesEndRef} />
          </div>

          <div className="message-input-section">
            <MessageInput
              onSend={sendMessage}
              disabled={isTyping}
              placeholder={
                isTyping
                  ? "L'assistant réfléchit..."
                  : "Tapez votre réponse..."
              }
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default ChatInterface;
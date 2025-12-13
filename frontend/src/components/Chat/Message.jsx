
const Message = ({ message }) => {
  const isUser = message.role === 'user';

  // Formatage de l'heure
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Détecter les émojis dans le contenu pour les agrandir
  const hasOnlyEmojis = (text) => {
    const emojiRegex = /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+$/u;
    return emojiRegex.test(text.trim());
  };

  return (
    <div style={{
      display: 'flex',
      gap: '1rem',
      marginBottom: '1.5rem',
      flexDirection: isUser ? 'row-reverse' : 'row',
    }}>
      {/* Avatar */}
      <div style={{
        width: '40px',
        height: '40px',
        minWidth: '40px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.25rem',
        background: isUser ? 'linear-gradient(135deg, var(--primary-accent), var(--secondary-accent))' : 'var(--card-dark)',
        border: isUser ? 'none' : '1px solid var(--border-dark)'
      }}>
        {isUser ? '👤' : '🤖'}
      </div>

      {/* Contenu du message */}
      <div style={{
        display:'flex',
        flex: 1,
        width: '100%',
        justifyContent: isUser ? 'flex-end' : 'flex-start'
      }}>
        <div className="message-bubble" style={{
          wordWrap: 'break-word',
          width: '100%',
          background: isUser ? 'linear-gradient(135deg, var(--primary-accent), var(--secondary-accent))' : 'var(--card-dark)',
          color: isUser ? 'white' : 'var(--text-primary)',
          border: isUser ? 'none' : '1px solid var(--border-dark)',
          borderBottomRightRadius: isUser ? '4px' : '12px',
          borderBottomLeftRadius: isUser ? '12px' : '4px',
          padding: '1rem 1.25rem'
        }}>
          {/* Contenu principal */}
          <div style={{
            fontSize: hasOnlyEmojis(message.content) ? '2rem' : '1rem',
            textAlign: hasOnlyEmojis(message.content) ? 'center' : 'left'
          }}>
            {message.content}
          </div>

          {/* Heure */}
          <div style={{
            marginTop: '0.5rem',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            textAlign: isUser ? 'right' : 'left'
          }}>
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Message;
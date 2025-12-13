import Message from './Message';
import TypingIndicator from './TypingIndicator';

const MessageList = ({ messages, isTyping }) => {
  if (!messages || messages.length === 0) {
    return (
      <div style={{textAlign: 'center', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{color: 'var(--text-secondary)'}}>
          {isTyping ? (
            <TypingIndicator />
          ) : (
            <div>
              <div style={{fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '600'}}>🚀 Prêt à découvrir votre voie ?</div>
              <div style={{color: 'var(--text-secondary)'}}>Votre assistant d'orientation vous attend...</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
      {messages.map((message, index) => (
        <Message
          key={message.id || index}
          message={message}
        />
      ))}

      {isTyping && (
        <div style={{display: 'flex', justifyContent: 'flex-start'}}>
          <TypingIndicator />
        </div>
      )}
    </div>
  );
};

export default MessageList;
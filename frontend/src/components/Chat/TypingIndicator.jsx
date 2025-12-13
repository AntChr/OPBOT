const TypingIndicator = () => {
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
      {/* Avatar de l'assistant */}
      <div style={{
        width: '40px',
        height: '40px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        background: 'var(--card-dark)',
        border: '1px solid var(--border-dark)',
        fontSize: '1.25rem'
      }}>
        🤖
      </div>

      {/* Indicateur de frappe */}
      <div style={{
        background: 'var(--card-dark)',
        color: 'var(--text-primary)',
        borderRadius: '10px',
        padding: '0.75rem 1rem',
        border: '1px solid var(--border-dark)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <span style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>L'assistant réfléchit</span>
        <div style={{display: 'flex', gap: '0.25rem'}}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--primary-accent)',
            animation: 'typing-dot 1.4s infinite ease-in-out'
          }}></div>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--primary-accent)',
            animation: 'typing-dot 1.4s infinite ease-in-out 0.2s'
          }}></div>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--primary-accent)',
            animation: 'typing-dot 1.4s infinite ease-in-out 0.4s'
          }}></div>
        </div>
      </div>

      {/* Styles CSS intégrés */}
      <style>{`
        @keyframes typing-dot {
          0%, 60%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          30% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default TypingIndicator;
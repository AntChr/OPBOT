import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import ChatInterface from './Chat/ChatInterface';

function ChatWrapper({ user, onLogout, onShowAdmin, onReset, showResetButton, onComplete, onMilestoneComplete }) {
  const navigate = useNavigate();

  return (
    <div className="min-vh-100 w-100" style={{background: 'var(--dark-bg)'}}>
      <Navbar
        user={user}
        onLogout={onLogout}
        onShowAdmin={onShowAdmin}
        onReset={onReset}
        showResetButton={showResetButton}
        showBotAvatar={true}
        title="Assistant d'Orientation"
        showActionPlanButton={true}
        onShowActionPlan={() => navigate('/action-plan')}
      />
      <ChatInterface
        user={user}
        onComplete={onComplete}
        onMilestoneComplete={onMilestoneComplete}
      />
    </div>
  );
}

export default ChatWrapper;

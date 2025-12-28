import { useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ onLogout, onShowAdmin, onReset, showAdminButton = true, showResetButton = false, isAdmin = false, onBackToChat = null, title = null, user = null, showBotAvatar = false, showActionPlanButton = false, onShowActionPlan = null, showTrainingButton = false, onShowTraining = null }) => {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <nav className="navbar-app">
      <div className="navbar-content">
        {/* Logo à gauche */}
        <div className="navbar-logo-section">
          {showBotAvatar && (
            <div className="bot-avatar" title="Assistant d'Orientation">
              🤖
            </div>
          )}
          <div className="navbar-logo" onClick={handleLogoClick} title="Retourner à la page d'accueil">
            🚀 <span className="navbar-logo-text">Orientation+</span>
          </div>
        </div>

        {/* Titre centré optionnel */}
        {title && (
          <div className="navbar-title">
            {title}
          </div>
        )}

        <div className="navbar-buttons">
          {/* Bouton revenir au chat (visible en page admin) */}
          {isAdmin && onBackToChat && (
            <button
              onClick={onBackToChat}
              className="navbar-button"
              title="Retourner au chat"
            >
              <i className="fa-solid fa-comments"></i>
            </button>
          )}

          {showResetButton && onReset && (
            <button
              onClick={onReset}
              className="navbar-button reset"
              title="Recommencer la conversation"
            >
              <i className="fa-solid fa-rotate-right"></i>
            </button>
          )}

          {showActionPlanButton && onShowActionPlan && (
            <button
              onClick={onShowActionPlan}
              className="navbar-button"
              title="Mon Plan d'Action"
            >
              <i className="fa-solid fa-list-check"></i>
            </button>
          )}

          {showTrainingButton && onShowTraining && (
            <button
              onClick={onShowTraining}
              className="navbar-button"
              title="Ma Formation"
            >
              <i className="fa-solid fa-graduation-cap"></i>
            </button>
          )}

          {showAdminButton && user?.role === 'admin' && (
            <button
              onClick={onShowAdmin}
              className="navbar-button"
              title="Administration"
            >
              <i className="fa-solid fa-user-tie"></i>
            </button>
          )}

          {/* Bouton déconnexion à droite */}
          <button
            onClick={onLogout}
            className="navbar-button logout"
            title="Déconnexion"
          >
            <i className="fa-solid fa-arrow-right-from-bracket"></i>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
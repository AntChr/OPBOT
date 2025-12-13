import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import './Conclusion.css';

const Conclusion = ({ conversation, user, onLogout, onShowAdmin, onRestart }) => {
  const navigate = useNavigate();
  const [animationPhase, setAnimationPhase] = useState('loading'); // loading -> reveal -> ready

  useEffect(() => {
    // Animation timing
    const loadingTimer = setTimeout(() => setAnimationPhase('reveal'), 500);
    const readyTimer = setTimeout(() => setAnimationPhase('ready'), 2000);

    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(readyTimer);
    };
  }, []);

  // Données par défaut (pour test visuel)
  const defaultMilestone = {
    jobTitle: '🥐 Manager de Boulangerie',
    conclusionMessage: `Vous avez ce leadership naturel, cette passion pour les gens et cette créativité qu'il faut pour diriger. Manager une boulangerie vous permettra de créer une ambiance unique, de diriger une équipe bienveillante, et de voir l'impact direct de votre travail chaque jour. C'est LA synthèse parfaite entre votre besoin de diriger, votre amour pour les interactions humaines, et cette créativité que vous avez exprimée. On a peut-être trouvé votre voie. 🎯`
  };

  const milestone = conversation?.milestones?.specific_job_identified || defaultMilestone;
  const jobTitle = milestone?.jobTitle || defaultMilestone.jobTitle;
  const conclusionMessage = milestone?.conclusionMessage || defaultMilestone.conclusionMessage;

  return (
    <div className="conclusion-container">
      <Navbar
        user={user}
        onLogout={onLogout}
        onShowAdmin={onShowAdmin}
        showAdminButton={true}
        showResetButton={false}
        title="🎯 Votre Orientation"
      />

      <div className="conclusion-content">
        {/* Fond avec gradient animé */}
        <div className={`conclusion-gradient ${animationPhase}`}></div>

        {/* Container principal */}
        <div className={`conclusion-card ${animationPhase}`}>
          {/* Phase 1: Loading animation */}
          {animationPhase === 'loading' && (
            <div className="conclusion-loading">
              <div className="spinner"></div>
              <p>Synthèse de votre parcours...</p>
            </div>
          )}

          {/* Phase 2-3: Reveal + Ready */}
          {animationPhase !== 'loading' && (
            <>
              {/* Header avec "Achievement" */}
              <div className={`conclusion-header ${animationPhase === 'ready' ? 'bounce-in' : ''}`}>
                <div className="achievement-badge">
                  <span className="trophy-emoji">🏆</span>
                  <span className="badge-text">DÉCOUVERTE COMPLÈTE</span>
                </div>
              </div>

              {/* Job Title - Grande et impactante */}
              <div className={`job-title-section ${animationPhase === 'ready' ? 'fade-in-up' : ''}`}>
                <h1 className="job-title">{jobTitle}</h1>
                <div className="title-underline"></div>
              </div>

              {/* Message épique personnalisé */}
              <div className={`conclusion-message ${animationPhase === 'ready' ? 'fade-in-up' : ''}`}>
                <p className="message-text">{conclusionMessage}</p>
              </div>

              {/* Mileposts visuels */}
              <div className={`milestones-visual ${animationPhase === 'ready' ? 'fade-in-up' : ''}`}>
                <div className="milestone-item completed">
                  <div className="milestone-icon">✨</div>
                  <div className="milestone-label">Passions</div>
                </div>
                <div className="milestone-connector"></div>
                <div className="milestone-item completed">
                  <div className="milestone-icon">👔</div>
                  <div className="milestone-label">Rôle</div>
                </div>
                <div className="milestone-connector"></div>
                <div className="milestone-item completed">
                  <div className="milestone-icon">🎯</div>
                  <div className="milestone-label">Domaine</div>
                </div>
                <div className="milestone-connector"></div>
                <div className="milestone-item completed">
                  <div className="milestone-icon">📍</div>
                  <div className="milestone-label">Format</div>
                </div>
                <div className="milestone-connector"></div>
                <div className="milestone-item current">
                  <div className="milestone-icon">🎆</div>
                  <div className="milestone-label">Métier</div>
                </div>
              </div>

              {/* CTA Button */}
              <div className={`conclusion-actions ${animationPhase === 'ready' ? 'fade-in-up' : ''}`}>
                <button className="btn btn-primary" onClick={() => navigate('/questionnaire')}>
                  <i className="fa-solid fa-clipboard-check"></i> Donner mon avis
                </button>
              </div>

              {/* Motivational quote */}
              <div className={`conclusion-quote ${animationPhase === 'ready' ? 'fade-in-up' : ''}`}>
                <p>✨ Votre voie est trouvée.</p>
                <p>Autrefois, on vous laissait seul avec ce résultat. Aujourd'hui, vous êtes accompagné pour transformer cette vocation en réalité.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Conclusion;

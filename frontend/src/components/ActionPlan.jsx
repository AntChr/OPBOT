import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import './ActionPlan.css';

const ActionPlan = ({ conversation, user, onLogout, onShowAdmin, onRestart }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('timeline'); // timeline, training, employability, chat
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  const jobTitle = conversation?.milestones?.specific_job_identified?.jobTitle || 'Votre métier';
  const conclusionMessage = conversation?.milestones?.specific_job_identified?.conclusionMessage || '';

  // Données de timeline fictives (à remplacer par données réelles du backend)
  const timelineSteps = [
    {
      id: 1,
      title: 'Phase 1: Preparation',
      duration: '1-2 mois',
      tasks: [
        'Identifier les compétences actuelles',
        'Définir les gaps de compétences',
        'Créer un plan de développement'
      ],
      status: 'current'
    },
    {
      id: 2,
      title: 'Phase 2: Formation',
      duration: '3-6 mois',
      tasks: [
        'Suivre formations recommandées',
        'Pratiquer les compétences clés',
        'Construire un portfolio'
      ],
      status: 'pending'
    },
    {
      id: 3,
      title: 'Phase 3: Transition',
      duration: '2-3 mois',
      tasks: [
        'Recherche active d\'opportunités',
        'Networking et candidatures',
        'Préparation aux entretiens'
      ],
      status: 'pending'
    },
    {
      id: 4,
      title: 'Phase 4: Intégration',
      duration: 'À partir du 7e mois',
      tasks: [
        'Intégration dans le nouveau rôle',
        'Onboarding et adaptation',
        'Continuation du développement'
      ],
      status: 'pending'
    }
  ];

  // Données de formations fictives
  const trainings = [
    {
      id: 1,
      title: 'Compétences de management',
      provider: 'Udemy / LinkedIn Learning',
      duration: '40 heures',
      priority: 'high',
      relevance: 0.95
    },
    {
      id: 2,
      title: 'Gestion financière PME',
      provider: 'CCI Formation',
      duration: '60 heures',
      priority: 'high',
      relevance: 0.88
    },
    {
      id: 3,
      title: 'Leadership et communication',
      provider: 'Coursera',
      duration: '30 heures',
      priority: 'medium',
      relevance: 0.82
    },
    {
      id: 4,
      title: 'Industrie alimentaire - tendances',
      provider: 'Spécialisée',
      duration: '24 heures',
      priority: 'medium',
      relevance: 0.75
    }
  ];

  // Données d'employabilité fictives
  const employabilityData = {
    currentScore: 45,
    targetScore: 95,
    skills: [
      { name: 'Leadership', current: 60, target: 95 },
      { name: 'Gestion financière', current: 35, target: 85 },
      { name: 'Communication', current: 70, target: 90 },
      { name: 'Industrie alimentaire', current: 20, target: 80 },
      { name: 'Gestion d\'équipe', current: 55, target: 90 }
    ]
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMessage = {
      id: chatMessages.length + 1,
      text: chatInput,
      sender: 'user',
      timestamp: new Date()
    };

    setChatMessages([...chatMessages, newMessage]);
    setChatInput('');

    // Simuler une réponse du bot (à remplacer par appel API réel)
    setTimeout(() => {
      const botMessage = {
        id: chatMessages.length + 2,
        text: 'Je vais vous aider à affiner votre plan d\'action. Pouvez-vous me donner plus de détails sur votre situation actuelle ?',
        sender: 'bot',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, botMessage]);
    }, 500);
  };

  const handleGoBack = () => {
    navigate('/chat');
  };

  return (
    <div className="action-plan-container">
      <Navbar
        user={user}
        onLogout={onLogout}
        onShowAdmin={onShowAdmin}
        showAdminButton={true}
        showResetButton={true}
        onReset={onRestart}
        title="📋 Votre Plan d'Action"
      />

      <div className="action-plan-content">
        {/* Header Section */}
        <div className="action-plan-header">
          <div className="header-content">
            <h1 className="header-job-title">{jobTitle}</h1>
            <p className="header-subtitle">Votre plan d'action personnalisé pour atteindre votre objectif</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="action-plan-tabs">
          <button
            className={`tab-button ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            <i className="fa-solid fa-timeline"></i> Frise Chronologique
          </button>
          <button
            className={`tab-button ${activeTab === 'training' ? 'active' : ''}`}
            onClick={() => setActiveTab('training')}
          >
            <i className="fa-solid fa-book"></i> Formations
          </button>
          <button
            className={`tab-button ${activeTab === 'employability' ? 'active' : ''}`}
            onClick={() => setActiveTab('employability')}
          >
            <i className="fa-solid fa-chart-line"></i> Employabilité
          </button>
          <button
            className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <i className="fa-solid fa-comments"></i> Affiner le plan
          </button>
        </div>

        {/* Content Sections */}
        <div className="action-plan-body">
          {/* Timeline Section */}
          {activeTab === 'timeline' && (
            <section className="timeline-section">
              <h2>Frise Chronologique</h2>
              <p className="section-intro">Voici les phases clés pour atteindre votre objectif</p>
              <div className="timeline">
                {timelineSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`timeline-step ${step.status}`}
                  >
                    <div className="timeline-marker">
                      <div className="marker-circle"></div>
                      {index < timelineSteps.length - 1 && <div className="marker-line"></div>}
                    </div>
                    <div className="timeline-content">
                      <div className="step-header">
                        <h3>{step.title}</h3>
                        <span className="step-duration">{step.duration}</span>
                      </div>
                      <ul className="step-tasks">
                        {step.tasks.map((task, idx) => (
                          <li key={idx}>
                            <i className="fa-solid fa-check"></i> {task}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Training Section */}
          {activeTab === 'training' && (
            <section className="training-section">
              <h2>Formations Recommandées</h2>
              <p className="section-intro">Formations sélectionnées pour combler vos gaps de compétences</p>
              <div className="training-grid">
                {trainings.map(training => (
                  <div key={training.id} className={`training-card priority-${training.priority}`}>
                    <div className="training-header">
                      <h3>{training.title}</h3>
                      <span className="priority-badge">{training.priority === 'high' ? '🔴 Prioritaire' : '🟡 Importante'}</span>
                    </div>
                    <div className="training-info">
                      <p><strong>Organisme:</strong> {training.provider}</p>
                      <p><strong>Durée:</strong> {training.duration}</p>
                      <div className="relevance-bar">
                        <span>Pertinence: {Math.round(training.relevance * 100)}%</span>
                        <div className="bar">
                          <div className="bar-fill" style={{ width: `${training.relevance * 100}%` }}></div>
                        </div>
                      </div>
                    </div>
                    <button className="btn btn-small">Voir la formation</button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Employability Section */}
          {activeTab === 'employability' && (
            <section className="employability-section">
              <h2>Votre Employabilité</h2>
              <p className="section-intro">Score actuel vs objectif pour ce métier</p>

              <div className="employability-overview">
                <div className="score-card">
                  <div className="score-circle current">
                    <span className="score-value">{employabilityData.currentScore}%</span>
                    <span className="score-label">Actuellement</span>
                  </div>
                </div>
                <div className="score-arrow">
                  <i className="fa-solid fa-arrow-right"></i>
                </div>
                <div className="score-card">
                  <div className="score-circle target">
                    <span className="score-value">{employabilityData.targetScore}%</span>
                    <span className="score-label">Objectif</span>
                  </div>
                </div>
              </div>

              <div className="skills-chart">
                <h3>Développement par compétence</h3>
                <div className="skills-list">
                  {employabilityData.skills.map((skill, idx) => (
                    <div key={idx} className="skill-item">
                      <div className="skill-header">
                        <span className="skill-name">{skill.name}</span>
                        <span className="skill-values">{skill.current}% → {skill.target}%</span>
                      </div>
                      <div className="skill-bars">
                        <div className="bar current-bar">
                          <div className="fill" style={{ width: `${skill.current}%` }}></div>
                        </div>
                        <div className="bar target-bar">
                          <div className="fill" style={{ width: `${skill.target}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Chat Section */}
          {activeTab === 'chat' && (
            <section className="chat-section">
              <h2>Affinez votre plan d'action</h2>
              <p className="section-intro">Discutez avec notre assistant pour personnaliser davantage votre plan</p>

              <div className="chat-container">
                <div className="chat-messages">
                  <div className="message bot">
                    <div className="message-bubble">
                      Bonjour ! Je suis là pour vous aider à affiner votre plan d'action. Avez-vous des questions ou des ajustements à faire ?
                    </div>
                  </div>
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`message ${msg.sender}`}>
                      <div className="message-bubble">
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                <form className="chat-input-form" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    placeholder="Posez votre question ou décrivez ce que vous cherchez..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="chat-input"
                  />
                  <button type="submit" className="btn btn-chat">
                    <i className="fa-solid fa-paper-plane"></i>
                  </button>
                </form>
              </div>
            </section>
          )}
        </div>

        {/* Action Buttons */}
        <div className="action-plan-footer">
          <button onClick={handleGoBack} className="btn btn-secondary">
            <i className="fa-solid fa-arrow-left"></i> Retour
          </button>
          <button className="btn btn-primary">
            <i className="fa-solid fa-download"></i> Télécharger le plan
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionPlan;

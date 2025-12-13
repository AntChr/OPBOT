
const ProgressIndicator = ({ phase, className = '' }) => {
  if (!phase) return null;

  // Mapping des phases avec leurs infos
  const phaseInfo = {
    intro: {
      label: 'Introduction',
      icon: '👋',
      color: 'info',
      description: 'Faisons connaissance'
    },
    discovery: {
      label: 'Découverte',
      icon: '🔍',
      color: 'primary',
      description: 'Explorons vos intérêts'
    },
    exploration: {
      label: 'Exploration',
      icon: '🚀',
      color: 'warning',
      description: 'Approfondissons ensemble'
    },
    refinement: {
      label: 'Affinement',
      icon: '🎯',
      color: 'success',
      description: 'Précisons vos préférences'
    },
    conclusion: {
      label: 'Conclusion',
      icon: '✨',
      color: 'light',
      description: 'Découvrons vos résultats'
    }
  };

  const currentPhase = phaseInfo[phase.name] || phaseInfo.intro;
  const progressPercent = Math.round((phase.progress || 0) * 100);

  // Étapes pour la barre de progression
  const allPhases = ['intro', 'discovery', 'exploration', 'refinement', 'conclusion'];
  const currentPhaseIndex = allPhases.indexOf(phase.name);

  return (
    <div className={`d-flex align-items-center gap-3 ${className}`}>
      {/* Indicateur de phase actuelle */}
      <div className="d-flex align-items-center gap-2">
        <span className="fs-5">{currentPhase.icon}</span>
        <div className="text-white">
          <div className="small fw-bold">{currentPhase.label}</div>
          <div className="text-white-50" style={{fontSize: '0.75rem'}}>
            {currentPhase.description}
          </div>
        </div>
      </div>

      {/* Barre de progression détaillée */}
      <div className="d-flex align-items-center gap-2">
        {/* Progression dans la phase actuelle */}
        <div className="progress" style={{width: '80px', height: '6px'}}>
          <div
            className={`progress-bar bg-${currentPhase.color}`}
            role="progressbar"
            style={{width: `${progressPercent}%`}}
            aria-valuenow={progressPercent}
            aria-valuemin="0"
            aria-valuemax="100"
          ></div>
        </div>

        <span className="small text-white-50">
          {progressPercent}%
        </span>
      </div>

      {/* Mini-indicateur des étapes globales */}
      <div className="d-flex gap-1">
        {allPhases.map((phaseName, index) => {
          const isCompleted = index < currentPhaseIndex;
          const isCurrent = index === currentPhaseIndex;
          const phaseData = phaseInfo[phaseName];

          return (
            <div
              key={phaseName}
              className={`rounded-circle d-flex align-items-center justify-content-center ${
                isCompleted
                  ? 'bg-success'
                  : isCurrent
                  ? `bg-${phaseData.color}`
                  : 'bg-secondary'
              }`}
              style={{width: '16px', height: '16px'}}
              title={`${phaseData.label}${isCompleted ? ' ✓' : isCurrent ? ' (actuelle)' : ''}`}
            >
              {isCompleted ? (
                <span style={{fontSize: '8px', color: 'white'}}>✓</span>
              ) : isCurrent ? (
                <span style={{fontSize: '8px'}}>{phaseData.icon}</span>
              ) : (
                <span style={{fontSize: '6px', opacity: 0.5}}>●</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Informations sur les questions */}
      {phase.questionsAsked !== undefined && phase.targetQuestions && (
        <div className="small text-white-50">
          {phase.questionsAsked}/{phase.targetQuestions} questions
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;
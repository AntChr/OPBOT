import { useState } from 'react';

const ProfilePreview = ({ conversation, onClose }) => {
  const [activeTab, setActiveTab] = useState('traits');

  if (!conversation || !conversation.buildingProfile) {
    return (
      <div className="p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="text-white mb-0">Votre Profil</h5>
          <button onClick={onClose} className="btn-close btn-close-white"></button>
        </div>
        <div className="text-center text-white-50">
          <div>📊</div>
          <div className="small">Profil en construction...</div>
        </div>
      </div>
    );
  }

  const profile = conversation.buildingProfile;

  // Calculer les traits les plus forts
  const getTopTraits = () => {
    if (!profile.detectedTraits) return [];

    // Fonctionner avec un objet ou une Map
    const traitsEntries = profile.detectedTraits instanceof Map
      ? Array.from(profile.detectedTraits.entries())
      : Object.entries(profile.detectedTraits);

    return traitsEntries
      .filter(([, data]) => data.score > 0.1)
      .sort((a, b) => (b[1].score * b[1].confidence) - (a[1].score * a[1].confidence))
      .slice(0, 8)
      .map(([trait, data]) => ({
        trait,
        score: data.score,
        confidence: data.confidence
      }));
  };

  const topTraits = getTopTraits();

  // Calculer le score de complétude
  const completenessScore = conversation.quality?.completenessScore || 0;

  return (
    <div className="h-100 d-flex flex-column">
      {/* Header */}
      <div className="p-3 border-bottom">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="text-white mb-0">👤 Votre Profil</h5>
          <button onClick={onClose} className="btn-close btn-close-white"></button>
        </div>

        {/* Score de complétude */}
        <div className="mt-2">
          <div className="small text-white-50 mb-1">
            Profil complété à {Math.round(completenessScore * 100)}%
          </div>
          <div className="progress" style={{height: '4px'}}>
            <div
              className="progress-bar bg-success"
              style={{width: `${completenessScore * 100}%`}}
            ></div>
          </div>
        </div>
      </div>

      {/* Navigation des onglets */}
      <div className="border-bottom">
        <div className="nav nav-tabs nav-fill" style={{backgroundColor: 'transparent'}}>
          <button
            className={`nav-link border-0 text-white ${activeTab === 'traits' ? 'active bg-primary' : ''}`}
            onClick={() => setActiveTab('traits')}
          >
            🎯 Traits
          </button>
          <button
            className={`nav-link border-0 text-white ${activeTab === 'interests' ? 'active bg-primary' : ''}`}
            onClick={() => setActiveTab('interests')}
          >
            ❤️ Intérêts
          </button>
          <button
            className={`nav-link border-0 text-white ${activeTab === 'info' ? 'active bg-primary' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            ℹ️ Infos
          </button>
        </div>
      </div>

      {/* Contenu des onglets */}
      <div className="flex-grow-1 overflow-auto p-3">
        {activeTab === 'traits' && (
          <div>
            <h6 className="text-white mb-3">Traits de personnalité détectés</h6>

            {topTraits.length > 0 ? (
              <div className="d-flex flex-column gap-3">
                {topTraits.map(({ trait, score, confidence }) => (
                  <div key={trait} className="border rounded p-2 bg-dark">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="text-white small fw-bold">
                        {trait}
                      </span>
                      <span className="badge bg-primary">
                        {Math.round(score * 100)}%
                      </span>
                    </div>

                    {/* Barre de progression */}
                    <div className="progress mb-1" style={{height: '4px'}}>
                      <div
                        className="progress-bar bg-info"
                        style={{width: `${score * 100}%`}}
                      ></div>
                    </div>

                    {/* Confiance */}
                    <div className="small text-white-50">
                      Confiance: {Math.round(confidence * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-white-50">
                <div className="mb-2">🤔</div>
                <div className="small">
                  Continuez la conversation pour<br/>
                  que je puisse mieux vous connaître !
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'interests' && (
          <div>
            <h6 className="text-white mb-3">Centres d'intérêt</h6>

            {profile.interests && profile.interests.length > 0 ? (
              <div className="d-flex flex-column gap-2">
                {profile.interests.map((interest, index) => (
                  <div key={index} className="border rounded p-2 bg-dark">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-white small fw-bold">
                        {interest.domain}
                      </span>
                      <div className="text-warning">
                        {'★'.repeat(interest.level || 3)}
                        {'☆'.repeat(5 - (interest.level || 3))}
                      </div>
                    </div>
                    {interest.context && (
                      <div className="small text-white-50 mt-1">
                        "{interest.context}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-white-50">
                <div className="mb-2">💭</div>
                <div className="small">
                  Parlez-moi de ce qui vous passionne<br/>
                  pour que je puisse l'analyser !
                </div>
              </div>
            )}

            {/* Valeurs */}
            {profile.values && profile.values.length > 0 && (
              <div className="mt-4">
                <h6 className="text-white mb-3">Valeurs importantes</h6>
                <div className="d-flex flex-wrap gap-2">
                  {profile.values.map((value, index) => (
                    <span key={index} className="badge bg-success">
                      {value.value}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'info' && (
          <div>
            <h6 className="text-white mb-3">Informations conversation</h6>

            <div className="d-flex flex-column gap-3">
              {/* Phase actuelle */}
              <div className="border rounded p-2 bg-dark">
                <div className="small text-white-50">Phase actuelle</div>
                <div className="text-white fw-bold">
                  {conversation.currentPhase?.name || 'intro'}
                </div>
                <div className="progress mt-1" style={{height: '3px'}}>
                  <div
                    className="progress-bar bg-primary"
                    style={{width: `${(conversation.currentPhase?.progress || 0) * 100}%`}}
                  ></div>
                </div>
              </div>

              {/* Métriques */}
              <div className="border rounded p-2 bg-dark">
                <div className="small text-white-50">Métriques de qualité</div>
                <div className="row g-2 mt-1">
                  <div className="col-6">
                    <div className="text-white small">Engagement</div>
                    <div className="text-info">
                      {Math.round((conversation.quality?.engagementScore || 0) * 100)}%
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-white small">Confiance</div>
                    <div className="text-success">
                      {Math.round((conversation.quality?.confidenceScore || 0) * 100)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Contraintes */}
              {profile.constraints && profile.constraints.length > 0 && (
                <div className="border rounded p-2 bg-dark">
                  <div className="small text-white-50">Contraintes mentionnées</div>
                  <div className="mt-1">
                    {profile.constraints.map((constraint, index) => (
                      <div key={index} className="small text-warning">
                        • {constraint.type}: {constraint.description}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Statistiques */}
              <div className="border rounded p-2 bg-dark">
                <div className="small text-white-50">Statistiques</div>
                <div className="row g-2 mt-1 small text-white">
                  <div className="col-6">
                    Messages: {conversation.messages?.length || 0}
                  </div>
                  <div className="col-6">
                    Questions: {conversation.currentPhase?.questionsAsked || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer avec recommandations si disponibles */}
      {conversation.jobRecommendations && conversation.jobRecommendations.length > 0 && (
        <div className="border-top p-3">
          <div className="small text-white-50 mb-2">
            🎯 {conversation.jobRecommendations.length} recommandation(s) générée(s)
          </div>
          <div className="small text-success">
            Continuez la conversation pour finaliser vos résultats !
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePreview;
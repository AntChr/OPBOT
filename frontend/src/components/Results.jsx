import { useState } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import Navbar from './Navbar';

const Results = ({ results, user, onRestart, onLogout, onShowAdmin }) => {
  const [showVectors, setShowVectors] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    if (!user?._id && !user?.id) return;

    setIsResetting(true);
    try {
      await axios.post(API_ENDPOINTS.CONVERSATIONS_RESET, {
        userId: user._id || user.id
      });
      onRestart();
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
      alert('Erreur lors de la réinitialisation');
    } finally {
      setIsResetting(false);
    }
  };

  const renderVectorComparison = () => {
    if (!results?.userTraitVector || !results?.bestMatch?.job?.traitVector) {
      return (
        <div className="alert alert-warning">
          <h5>⚠️ Données manquantes</h5>
          <p>Les vecteurs de traits ne sont pas disponibles pour cette recommandation.</p>
          <small>Générées par la conversation avec l'assistant IA</small>
        </div>
      );
    }

    const traitDimensions = [
      "analytical", "problem-solving", "creativity", "innovation",
      "detail-oriented", "independent", "teamwork", "leadership",
      "communication", "organizational", "empathy", "design", "service",
      "teaching", "collaborative"
    ];

    return (
      <div className="mt-4">
        <h4 className="fw-semibold text-white mb-3">Comparaison des vecteurs de traits :</h4>
        <div className="border bg-#303030 rounded p-4">
          <div className="row g-3">
            <div className="col-md-6">
              <h5 className="text-white mb-3">Votre profil :</h5>
              <div className="small">
                {traitDimensions.map(trait => {
                  const userValue = results.userTraitVector[trait] || 0;
                  return (
                    <div key={trait} className="d-flex justify-content-between mb-2">
                      <span className="text-white">{trait}:</span>
                      <span className={userValue > 0 ? "text-success fw-bold" : "text-white"}>
                        {userValue}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="col-md-6">
              <h5 className="text-white mb-3">Métier requis :</h5>
              <div className="small">
                {traitDimensions.map(trait => {
                  // Le vecteur du job peut être dans plusieurs endroits selon la version API
                  const jobTraitVector = results.bestMatch.jobTraitVector ||
                                        results.bestMatch.job?.traitVector ||
                                        {};

                  // Fallback: utiliser les traits legacy si pas de vecteur
                  const legacyTraits = results.bestMatch.job?.traits || [];
                  const jobValue = jobTraitVector[trait] || (legacyTraits.includes(trait) ? 1 : 0);

                  const userValue = results.userTraitVector[trait] || 0;
                  const isMatch = userValue > 0 && jobValue > 0;

                  return (
                    <div key={trait} className="d-flex justify-content-between mb-2">
                      <span className="text-white">{trait}:</span>
                      <span className={jobValue > 0 ? (isMatch ? "text-success fw-bold" : "text-warning fw-bold") : "text-white"}>
                        {jobValue}
                        {isMatch && " ✓"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="d-flex flex-column min-vh-100 vw-100" style={{background: '#212121', paddingTop: '90px', paddingBottom: '2rem'}}>
      <Navbar
        user={user}
        onLogout={onLogout}
        onShowAdmin={onShowAdmin}
      />

      <div className="container mt-4">
        <div className="bg-#181818 rounded shadow-lg p-4">
          <div className="text-center mb-4">
            <h1 className="h3 fw-bold text-white">
              Vos Résultats
            </h1>
            <div className="small text-white">
              {user.firstName} {user.lastName} • Score: {user.scoring}
            </div>
          </div>

          <div>
            <h2 className="h4 fw-semibold text-white mb-3">Vos 3 métiers recommandés :</h2>

            {/* Top 3 des métiers */}
            {results?.topMatches && results.topMatches.length > 0 ? (
              results.topMatches.map((match, index) => (
                <div key={index} className={`border bg-#303030 rounded p-4 ${index > 0 ? 'mt-3' : ''}`}>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="d-flex align-items-center gap-3">
                      <span className="badge bg-primary fs-5">{index + 1}</span>
                      <h3 className="h4 fw-bold text-white mb-0">{match?.job?.title || 'Métier recommandé'}</h3>
                    </div>
                    <div className="h5 fw-semibold text-white">
                      {match?.matchPercentage || 0}% de correspondance
                    </div>
                  </div>

                  <p className="text-white mb-4 lead">{match?.job?.description || 'Description non disponible'}</p>

                  {/* Raisons du match (générées par Claude AI) */}
                  {match?.reasonsFor && match.reasonsFor.length > 0 && (
                    <div className="mb-3">
                      <h5 className="fw-semibold text-success mb-2">Pourquoi ce métier vous correspond :</h5>
                      <ul className="text-white">
                        {match.reasonsFor.map((reason, i) => (
                          <li key={i}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Points d'attention */}
                  {match?.concerns && match.concerns.length > 0 && (
                    <div className="mb-3">
                      <h5 className="fw-semibold text-warning mb-2">Points d'attention :</h5>
                      <ul className="text-white">
                        {match.concerns.map((concern, i) => (
                          <li key={i}>{concern}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Résumé Claude AI */}
                  {match?.summary && (
                    <div className="alert alert-info mb-3">
                      <strong>Analyse IA :</strong> {match.summary}
                    </div>
                  )}

                  {/* Potentiel de croissance */}
                  {match?.growthPotential && (
                    <div className="alert alert-success mb-3">
                      <strong>Potentiel :</strong> {match.growthPotential}
                    </div>
                  )}

                  <div className="row g-4">
                    <div className="col-md-6">
                      <h4 className="fw-semibold text-white mb-3">Compétences requises:</h4>
                      <div className="d-flex flex-wrap gap-2">
                        {(match?.job?.skills || []).map((skill, i) => (
                          <span key={i} className="badge bg-primary rounded-pill">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <h4 className="fw-semibold text-white mb-3">Traits correspondants:</h4>
                      <div className="d-flex flex-wrap gap-2">
                        {(match?.commonTraits || match?.job?.traits || []).map((trait, i) => (
                          <span key={i} className="badge bg-success rounded-pill">
                            {trait}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border bg-#303030 rounded p-3">
                    <div className="row g-3 small text-white">
                      <div className="col-md-4">
                        <strong className="text-white">Formation:</strong>
                        <p className="mb-0 text-white">{match?.job?.education || match?.job?.educationLevel || 'Non spécifié'}</p>
                      </div>
                      <div className="col-md-4">
                        <strong className="text-white">Environnement:</strong>
                        <p className="mb-0 text-white">{match?.job?.work_environment || 'Non spécifié'}</p>
                      </div>
                      <div className="col-md-4">
                        <strong className="text-white">Salaire junior:</strong>
                        <p className="mb-0 text-white">{match?.job?.salary?.junior || 'Non spécifié'}</p>
                      </div>
                    </div>

                    {/* Nouveaux champs enrichis */}
                    <div className="row g-3 small text-white mt-2">
                      {match?.job?.domain && (
                        <div className="col-md-4">
                          <strong className="text-white">Domaine:</strong>
                          <p className="mb-0 text-white">{match.job.domain}</p>
                        </div>
                      )}
                      {match?.job?.hiringRate && (
                        <div className="col-md-4">
                          <strong className="text-white">Taux d'embauche:</strong>
                          <p className="mb-0 text-white">{match.job.hiringRate}%</p>
                        </div>
                      )}
                      {match?.job?.remoteWorkCompatibility && (
                        <div className="col-md-4">
                          <strong className="text-white">Télétravail:</strong>
                          <p className="mb-0 text-white">{match.job.remoteWorkCompatibility}</p>
                        </div>
                      )}
                    </div>

                    {match?.job?.career_path && match.job.career_path.length > 0 && (
                      <div className="mt-3">
                        <strong className="text-white">Évolution de carrière:</strong>
                        <div className="d-flex flex-wrap gap-2 mt-2">
                          {match.job.career_path.map((step, i) => (
                            <span key={i} className="badge text-bg-secondary">
                              {step}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="alert alert-warning">
                Aucune recommandation disponible pour le moment.
              </div>
            )}
          </div>

          {/* Section Vecteurs */}
          <div className="mt-4">
            <div className="text-center mb-3">
              <button
                onClick={() => setShowVectors(!showVectors)}
                className="btn btn-outline-light"
              >
                {showVectors ? 'Masquer' : 'Afficher'} la comparaison des vecteurs
              </button>
            </div>
            {showVectors && renderVectorComparison()}
          </div>

          {/* Boutons d'action */}
          <div className="text-center mt-4">
            <div className="d-flex gap-3 justify-content-center">
              <button
                onClick={onRestart}
                className="btn bg-white px-4 py-2"
              >
                Recommencer le test
              </button>
              <button
                onClick={handleReset}
                disabled={isResetting}
                className="btn btn-warning px-4 py-2"
              >
                {isResetting ? 'Réinitialisation...' : '🔄 Rewind (Reset)'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;
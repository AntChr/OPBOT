import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../../config/api';
import './QuestionnaireAnalytics.css';

const QuestionnaireAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(API_ENDPOINTS.QUESTIONNAIRE_ANALYTICS, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="stars-display">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={`star ${star <= rating ? 'filled' : ''}`}>
            ★
          </span>
        ))}
        <span className="rating-value">({rating}/5)</span>
      </div>
    );
  };

  const renderAverageCard = (title, value, icon) => (
    <div className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div className="metric-content">
        <div className="metric-title">{title}</div>
        <div className="metric-value">{value}</div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="analytics-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
        <p className="mt-3">Chargement des analytics...</p>
      </div>
    );
  }

  if (!analytics || analytics.totalResponses === 0) {
    return (
      <div className="analytics-empty">
        <div className="empty-icon">📊</div>
        <h3>Aucune réponse pour le moment</h3>
        <p>Les questionnaires soumis par les utilisateurs apparaîtront ici.</p>
      </div>
    );
  }

  return (
    <div className="questionnaire-analytics">
      <div className="analytics-header">
        <h2 className="analytics-title">📊 Analytics des Questionnaires</h2>
        <div className="total-responses">
          <span className="badge bg-primary">
            {analytics.totalResponses} réponse{analytics.totalResponses > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Métriques globales */}
      <div className="metrics-grid">
        {renderAverageCard('Clarté du résultat', analytics.averages.resultClarity, '🎯')}
        {renderAverageCard('Pertinence du métier', analytics.averages.jobRelevance, '💼')}
        {renderAverageCard('Qualité de la conversation', analytics.averages.conversationQuality, '💬')}
        {renderAverageCard('Utilité globale', analytics.averages.overallUsefulness, '⭐')}
      </div>

      {/* Note moyenne globale */}
      <div className="global-average">
        <h3 className="global-average-title">Note moyenne globale</h3>
        <div className="global-average-value">{analytics.averages.global} / 5</div>
        <div className="progress" style={{ height: '30px' }}>
          <div
            className="progress-bar bg-success"
            role="progressbar"
            style={{ width: `${(analytics.averages.global / 5) * 100}%` }}
          >
            {((analytics.averages.global / 5) * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Intention de suivi */}
      <div className="will-follow-stats">
        <h3 className="stats-title">📈 Intention de suivi</h3>
        <div className="stats-content">
          <div className="stat-item">
            <span className="stat-label">Vont explorer le métier :</span>
            <span className="stat-value success">
              {analytics.willFollowCount} ({analytics.willFollowPercentage}%)
            </span>
          </div>
        </div>
      </div>

      {/* Liste des questionnaires */}
      <div className="questionnaires-list">
        <h3 className="list-title">📋 Détail des réponses</h3>
        {analytics.questionnaires.map((q, index) => (
          <div key={q._id} className="questionnaire-item">
            <div className="questionnaire-header-item" onClick={() => setSelectedQuestionnaire(selectedQuestionnaire === q._id ? null : q._id)}>
              <div className="user-info">
                <div className="user-badge">#{index + 1}</div>
                <div className="user-details">
                  <div className="user-name">{q.user?.firstName} {q.user?.lastName}</div>
                  <div className="user-email">{q.user?.email}</div>
                  <div className="job-title">{q.jobTitle}</div>
                </div>
              </div>
              <div className="questionnaire-meta">
                <div className="average-rating">
                  <span className="rating-badge">{q.averageRating} / 5</span>
                </div>
                <div className="date-submitted">
                  {new Date(q.createdAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <button className="expand-btn">
                  <i className={`fa-solid fa-chevron-${selectedQuestionnaire === q._id ? 'up' : 'down'}`}></i>
                </button>
              </div>
            </div>

            {selectedQuestionnaire === q._id && (
              <div className="questionnaire-details">
                {/* Ratings détaillés */}
                <div className="ratings-detail">
                  <h4>Notes détaillées</h4>
                  <div className="rating-item">
                    <span className="rating-label">Clarté du résultat :</span>
                    {renderStars(q.ratings.resultClarity)}
                  </div>
                  <div className="rating-item">
                    <span className="rating-label">Pertinence du métier :</span>
                    {renderStars(q.ratings.jobRelevance)}
                  </div>
                  <div className="rating-item">
                    <span className="rating-label">Qualité de la conversation :</span>
                    {renderStars(q.ratings.conversationQuality)}
                  </div>
                  <div className="rating-item">
                    <span className="rating-label">Utilité globale :</span>
                    {renderStars(q.ratings.overallUsefulness)}
                  </div>
                </div>

                {/* Intention de suivi */}
                {q.willFollow !== null && (
                  <div className="will-follow-detail">
                    <h4>Intention de suivi</h4>
                    <span className={`badge ${q.willFollow ? 'bg-success' : 'bg-secondary'}`}>
                      {q.willFollow ? '✓ Va explorer le métier' : '✗ Ne va pas explorer pour le moment'}
                    </span>
                  </div>
                )}

                {/* Commentaires */}
                {(q.comments.positives || q.comments.improvements || q.comments.general) && (
                  <div className="comments-detail">
                    <h4>Commentaires</h4>
                    {q.comments.positives && (
                      <div className="comment-block positive">
                        <div className="comment-header">
                          <i className="fa-solid fa-heart"></i>
                          <strong>Ce qui a plu</strong>
                        </div>
                        <p className="comment-text">{q.comments.positives}</p>
                      </div>
                    )}
                    {q.comments.improvements && (
                      <div className="comment-block improvement">
                        <div className="comment-header">
                          <i className="fa-solid fa-wrench"></i>
                          <strong>Points d'amélioration</strong>
                        </div>
                        <p className="comment-text">{q.comments.improvements}</p>
                      </div>
                    )}
                    {q.comments.general && (
                      <div className="comment-block general">
                        <div className="comment-header">
                          <i className="fa-solid fa-comment"></i>
                          <strong>Commentaire général</strong>
                        </div>
                        <p className="comment-text">{q.comments.general}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuestionnaireAnalytics;

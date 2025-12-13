import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import Navbar from './Navbar';
import './Questionnaire.css';

const Questionnaire = ({ conversation, user, onLogout, onShowAdmin, onRestart }) => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const jobTitle = conversation?.milestones?.specific_job_identified?.jobTitle || '';

  const [formData, setFormData] = useState({
    ratings: {
      resultClarity: 0,
      jobRelevance: 0,
      conversationQuality: 0,
      overallUsefulness: 0
    },
    comments: {
      positives: '',
      improvements: '',
      general: ''
    },
    willFollow: null
  });

  const questions = [
    {
      key: 'resultClarity',
      label: 'Clarté du résultat',
      description: 'Le métier proposé était-il clairement présenté ?'
    },
    {
      key: 'jobRelevance',
      label: 'Pertinence du métier',
      description: 'Le métier proposé correspond-il à vos attentes et profil ?'
    },
    {
      key: 'conversationQuality',
      label: 'Qualité de la conversation',
      description: 'L\'échange avec l\'assistant était-il fluide et pertinent ?'
    },
    {
      key: 'overallUsefulness',
      label: 'Utilité globale',
      description: 'Cette expérience vous a-t-elle été utile pour votre orientation ?'
    }
  ];

  const handleRatingChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      ratings: {
        ...prev.ratings,
        [key]: value
      }
    }));
  };

  const handleCommentChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      comments: {
        ...prev.comments,
        [key]: value
      }
    }));
  };

  const handleWillFollowChange = (value) => {
    setFormData(prev => ({
      ...prev,
      willFollow: value
    }));
  };

  const isFormValid = () => {
    // Vérifier que toutes les notes sont remplies (> 0)
    return Object.values(formData.ratings).every(rating => rating > 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isFormValid()) {
      alert('Veuillez répondre à toutes les questions de notation (1-5 étoiles)');
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.post(API_ENDPOINTS.QUESTIONNAIRE_SUBMIT, {
        conversationId: conversation?._id,
        jobTitle,
        ratings: formData.ratings,
        comments: formData.comments,
        willFollow: formData.willFollow
      });

      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting questionnaire:', error);
      alert('Erreur lors de l\'envoi du questionnaire. Veuillez réessayer.');
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="questionnaire-container">
        <Navbar
          user={user}
          onLogout={onLogout}
          onShowAdmin={onShowAdmin}
          showAdminButton={true}
          showResetButton={false}
          title="🎯 Merci !"
        />
        <div className="questionnaire-content">
          <div className="questionnaire-card success-card">
            <div className="success-icon">✅</div>
            <h1 className="success-title">Merci pour votre retour !</h1>
            <p className="success-message">
              Vos réponses ont été enregistrées avec succès. Elles nous aideront à améliorer l'expérience pour les prochains utilisateurs.
            </p>
            <div className="success-actions">
              <p style={{
                color: '#666',
                fontSize: '0.9rem',
                textAlign: 'center',
                marginTop: '1.5rem',
                padding: '1rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                borderLeft: '4px solid #007bff'
              }}>
                <i className="fa-solid fa-flask"></i> <strong>Phase Alpha</strong><br/>
                Cette première expérience était un test. Merci d'avoir participé à l'amélioration de notre assistant d'orientation !
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="questionnaire-container">
      <Navbar
        user={user}
        onLogout={onLogout}
        onShowAdmin={onShowAdmin}
        showAdminButton={true}
        showResetButton={false}
        title="📋 Questionnaire de satisfaction"
      />

      <div className="questionnaire-content">
        <div className="questionnaire-card">
          <div className="questionnaire-header">
            <h1 className="questionnaire-title">Votre avis nous intéresse !</h1>
            <p className="questionnaire-subtitle">
              Vous avez découvert le métier : <strong>{jobTitle}</strong>
            </p>
            <p className="questionnaire-description">
              Aidez-nous à améliorer cette expérience en répondant à quelques questions rapides.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="questionnaire-form">
            {/* Questions avec notation 1-5 */}
            <div className="rating-section">
              <h2 className="section-title">Évaluez votre expérience</h2>
              {questions.map((question) => (
                <div key={question.key} className="rating-question">
                  <div className="question-header">
                    <label className="question-label">{question.label}</label>
                    <p className="question-description">{question.description}</p>
                  </div>
                  <div className="star-rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`star ${formData.ratings[question.key] >= star ? 'active' : ''}`}
                        onClick={() => handleRatingChange(question.key, star)}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Section intention de suivi */}
            <div className="will-follow-section">
              <h2 className="section-title">Allez-vous explorer ce métier plus en détail ?</h2>
              <div className="will-follow-options">
                <button
                  type="button"
                  className={`will-follow-btn ${formData.willFollow === true ? 'active yes' : ''}`}
                  onClick={() => handleWillFollowChange(true)}
                >
                  <i className="fa-solid fa-check"></i> Oui, je vais l'explorer
                </button>
                <button
                  type="button"
                  className={`will-follow-btn ${formData.willFollow === false ? 'active no' : ''}`}
                  onClick={() => handleWillFollowChange(false)}
                >
                  <i className="fa-solid fa-times"></i> Non, pas pour le moment
                </button>
              </div>
            </div>

            {/* Commentaires */}
            <div className="comments-section">
              <h2 className="section-title">Vos commentaires (optionnel)</h2>

              <div className="comment-group">
                <label className="comment-label">
                  <i className="fa-solid fa-heart"></i> Ce qui vous a plu
                </label>
                <textarea
                  className="comment-textarea"
                  rows="3"
                  placeholder="Qu'avez-vous apprécié dans cette expérience ?"
                  value={formData.comments.positives}
                  onChange={(e) => handleCommentChange('positives', e.target.value)}
                />
              </div>

              <div className="comment-group">
                <label className="comment-label">
                  <i className="fa-solid fa-wrench"></i> Points d'amélioration
                </label>
                <textarea
                  className="comment-textarea"
                  rows="3"
                  placeholder="Que pourrions-nous améliorer ?"
                  value={formData.comments.improvements}
                  onChange={(e) => handleCommentChange('improvements', e.target.value)}
                />
              </div>

              <div className="comment-group">
                <label className="comment-label">
                  <i className="fa-solid fa-comment"></i> Commentaire général
                </label>
                <textarea
                  className="comment-textarea"
                  rows="3"
                  placeholder="Autres remarques ou suggestions..."
                  value={formData.comments.general}
                  onChange={(e) => handleCommentChange('general', e.target.value)}
                />
              </div>
            </div>

            {/* Bouton de soumission */}
            <div className="submit-section">
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={!isFormValid() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Envoi en cours...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane"></i> Envoyer mes réponses
                  </>
                )}
              </button>
              {!isFormValid() && (
                <p className="validation-hint">
                  * Veuillez noter toutes les questions (étoiles) avant d'envoyer
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Questionnaire;

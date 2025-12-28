import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_ENDPOINTS } from '../config/api'

function TrainingModule({ training, moduleNumber, onComplete, onBack }) {
  const [module, setModule] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expandedLessonId, setExpandedLessonId] = useState(null)
  const [exerciseSubmission, setExerciseSubmission] = useState('')
  const [isSubmittingExercise, setIsSubmittingExercise] = useState(false)

  useEffect(() => {
    fetchModuleDetails()
  }, [training.id, moduleNumber])

  const fetchModuleDetails = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      const response = await axios.get(
        API_ENDPOINTS.TRAINING_MODULE_DETAIL(training.id, moduleNumber),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      setModule(response.data.module)
    } catch (error) {
      console.error('Erreur chargement module:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLessonComplete = async (lessonNumber) => {
    try {
      const token = localStorage.getItem('token')
      await axios.put(
        API_ENDPOINTS.TRAINING_LESSON_COMPLETE(training.id),
        { moduleNumber, lessonNumber },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      // Rafraîchir le module
      fetchModuleDetails()
    } catch (error) {
      console.error('Erreur complétion leçon:', error)
    }
  }

  const handleSubmitExercise = async () => {
    if (!exerciseSubmission.trim()) {
      alert('Veuillez saisir votre réponse')
      return
    }

    try {
      setIsSubmittingExercise(true)
      const token = localStorage.getItem('token')
      await axios.post(
        API_ENDPOINTS.TRAINING_SUBMIT_EXERCISE,
        {
          trainingId: training.id,
          moduleNumber,
          userSubmission: exerciseSubmission
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      alert('Exercice soumis ! Vous recevrez un feedback sous peu.')
      setExerciseSubmission('')
      // Rafraîchir le module
      setTimeout(() => fetchModuleDetails(), 2000)
    } catch (error) {
      console.error('Erreur soumission exercice:', error)
      alert('Erreur lors de la soumission')
    } finally {
      setIsSubmittingExercise(false)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
      </div>
    )
  }

  if (!module) {
    return (
      <div className="card shadow-lg" style={{
        backgroundColor: '#303030',
        border: '1px solid #f44336',
        borderRadius: '12px'
      }}>
        <div className="card-body p-4">
          <p className="text-white mb-0">Module introuvable</p>
          <button onClick={onBack} className="btn btn-secondary mt-3">
            Retour
          </button>
        </div>
      </div>
    )
  }

  const allLessonsCompleted = module.lessons.every(l => l.completed)
  const exerciseCompleted = module.moduleExercise?.submitted && module.moduleExercise?.score !== null

  return (
    <div>
      {/* Module Header */}
      <div className="card shadow-lg mb-4" style={{
        backgroundColor: '#303030',
        border: '1px solid #444',
        borderRadius: '12px'
      }}>
        <div className="card-body p-4">
          <div className="d-flex align-items-center gap-3 mb-3">
            <button onClick={onBack} className="btn btn-secondary btn-sm">
              <i className="fa-solid fa-arrow-left me-2"></i>
              Retour
            </button>
            <h3 className="text-white mb-0">Module {module.moduleNumber}: {module.title}</h3>
          </div>

          <div className="mb-3">
            <div className="text-white-50 small mb-1">Objectif</div>
            <p className="text-white mb-0">{module.objective}</p>
          </div>

          {module.skillsTargeted && module.skillsTargeted.length > 0 && (
            <div className="mb-3">
              <div className="text-white-50 small mb-2">Compétences travaillées</div>
              <div className="d-flex flex-wrap gap-2">
                {module.skillsTargeted.map((skill, index) => (
                  <span key={index} className="badge" style={{backgroundColor: '#2196f3', fontSize: '0.85rem'}}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="row">
            {module.keyConcepts && module.keyConcepts.length > 0 && (
              <div className="col-md-4">
                <details className="mb-3">
                  <summary className="text-white fw-semibold cursor-pointer">Concepts clés</summary>
                  <ul className="text-white-50 small mt-2">
                    {module.keyConcepts.map((concept, index) => (
                      <li key={index}>{concept}</li>
                    ))}
                  </ul>
                </details>
              </div>
            )}

            {module.bestPractices && module.bestPractices.length > 0 && (
              <div className="col-md-4">
                <details className="mb-3">
                  <summary className="text-white fw-semibold cursor-pointer">Bonnes pratiques</summary>
                  <ul className="text-white-50 small mt-2">
                    {module.bestPractices.map((practice, index) => (
                      <li key={index}>{practice}</li>
                    ))}
                  </ul>
                </details>
              </div>
            )}

            {module.commonMistakes && module.commonMistakes.length > 0 && (
              <div className="col-md-4">
                <details className="mb-3">
                  <summary className="text-white fw-semibold cursor-pointer">Erreurs fréquentes</summary>
                  <ul className="text-white-50 small mt-2">
                    {module.commonMistakes.map((mistake, index) => (
                      <li key={index}>{mistake}</li>
                    ))}
                  </ul>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lessons */}
      <div className="mb-4">
        <h4 className="text-white mb-3">
          <i className="fa-solid fa-book-open me-2"></i>
          Leçons
        </h4>
        {module.lessons.map((lesson) => (
          <div
            key={lesson._id}
            className="card shadow-lg mb-3"
            style={{
              backgroundColor: '#303030',
              border: `1px solid ${lesson.completed ? '#4caf50' : '#444'}`,
              borderRadius: '12px'
            }}
          >
            <div className="card-body p-4">
              <div
                className="d-flex align-items-center justify-content-between cursor-pointer"
                onClick={() => setExpandedLessonId(expandedLessonId === lesson._id ? null : lesson._id)}
              >
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: lesson.completed ? '#4caf50' : '#2196f3',
                      flexShrink: 0
                    }}
                  >
                    {lesson.completed ? (
                      <i className="fa-solid fa-check text-white"></i>
                    ) : (
                      <span className="text-white fw-bold">{lesson.lessonNumber}</span>
                    )}
                  </div>
                  <div>
                    <h5 className="text-white mb-1">{lesson.title}</h5>
                    <p className="text-white-50 mb-0 small">{lesson.keyConcept}</p>
                  </div>
                </div>
                <i className={`fa-solid fa-chevron-${expandedLessonId === lesson._id ? 'up' : 'down'} text-white-50`}></i>
              </div>

              {expandedLessonId === lesson._id && (
                <div className="mt-4">
                  {lesson.context && (
                    <div className="alert alert-info mb-3" style={{backgroundColor: '#1e3a5f', border: 'none'}}>
                      <i className="fa-solid fa-lightbulb me-2"></i>
                      {lesson.context}
                    </div>
                  )}

                  <div className="text-white mb-4" style={{lineHeight: '1.8'}}>
                    {lesson.content.split('\n').map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>

                  {lesson.miniExercise && (
                    <div className="p-3 mb-3" style={{backgroundColor: '#404040', borderRadius: '8px'}}>
                      <div className="text-white fw-semibold mb-2">
                        <i className="fa-solid fa-pencil me-2"></i>
                        Mini-exercice
                      </div>
                      <p className="text-white-50 mb-2">{lesson.miniExercise.question}</p>
                      <small className="text-white-50">
                        Attendu : {lesson.miniExercise.expectedOutcome}
                      </small>
                    </div>
                  )}

                  {!lesson.completed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLessonComplete(lesson.lessonNumber)
                      }}
                      className="btn btn-success"
                    >
                      <i className="fa-solid fa-check me-2"></i>
                      Marquer comme terminé
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Module Exercise */}
      {module.moduleExercise && (
        <div className="card shadow-lg mb-4" style={{
          backgroundColor: '#303030',
          border: '1px solid #ff9800',
          borderRadius: '12px'
        }}>
          <div className="card-body p-4">
            <h4 className="text-white mb-3">
              <i className="fa-solid fa-clipboard-check me-2"></i>
              Exercice d'évaluation
            </h4>

            <p className="text-white mb-4">{module.moduleExercise.description}</p>

            {module.moduleExercise.evaluationCriteria && module.moduleExercise.evaluationCriteria.length > 0 && (
              <div className="mb-4">
                <div className="text-white-50 small mb-2">Critères d'évaluation</div>
                <ul className="text-white-50">
                  {module.moduleExercise.evaluationCriteria.map((criterion, index) => (
                    <li key={index}>
                      {criterion.criterion} ({criterion.weight}%)
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!module.moduleExercise.submitted ? (
              <div>
                <textarea
                  className="form-control mb-3"
                  rows="8"
                  placeholder="Saisissez votre réponse ici..."
                  value={exerciseSubmission}
                  onChange={(e) => setExerciseSubmission(e.target.value)}
                  style={{
                    backgroundColor: '#404040',
                    border: '1px solid #555',
                    color: 'white'
                  }}
                  disabled={!allLessonsCompleted}
                />
                <button
                  onClick={handleSubmitExercise}
                  className="btn btn-primary"
                  disabled={isSubmittingExercise || !allLessonsCompleted}
                >
                  {isSubmittingExercise ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane me-2"></i>
                      Soumettre pour évaluation
                    </>
                  )}
                </button>
                {!allLessonsCompleted && (
                  <p className="text-white-50 small mt-2">
                    Terminez toutes les leçons pour soumettre l'exercice
                  </p>
                )}
              </div>
            ) : (
              <div>
                <div className="alert alert-success mb-3">
                  <i className="fa-solid fa-check-circle me-2"></i>
                  Exercice soumis !
                  {module.moduleExercise.score !== null && (
                    <strong className="ms-2">Score : {module.moduleExercise.score}/100</strong>
                  )}
                </div>

                {module.moduleExercise.llmFeedback && (
                  <div className="p-3 mb-3" style={{backgroundColor: '#404040', borderRadius: '8px'}}>
                    <h5 className="text-white mb-3">Feedback</h5>
                    <div className="text-white-50">
                      {JSON.parse(module.moduleExercise.llmFeedback).encouragement || module.moduleExercise.llmFeedback}
                    </div>
                  </div>
                )}

                {exerciseCompleted && allLessonsCompleted && module.status !== 'completed' && (
                  <button
                    onClick={() => onComplete(module.moduleNumber)}
                    className="btn btn-success"
                  >
                    <i className="fa-solid fa-trophy me-2"></i>
                    Terminer le module
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resources */}
      {module.resources && module.resources.length > 0 && (
        <div className="card shadow-lg" style={{
          backgroundColor: '#303030',
          border: '1px solid #444',
          borderRadius: '12px'
        }}>
          <div className="card-body p-4">
            <h4 className="text-white mb-3">
              <i className="fa-solid fa-link me-2"></i>
              Ressources complémentaires
            </h4>
            <div className="list-group">
              {module.resources.map((resource, index) => (
                <a
                  key={index}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="list-group-item list-group-item-action"
                  style={{
                    backgroundColor: '#404040',
                    border: '1px solid #555',
                    color: 'white',
                    marginBottom: '0.5rem',
                    borderRadius: '8px'
                  }}
                >
                  <div className="d-flex w-100 justify-content-between align-items-center">
                    <h6 className="mb-1">{resource.title}</h6>
                    <span className="badge" style={{backgroundColor: '#2196f3'}}>
                      {resource.type}
                    </span>
                  </div>
                  {resource.description && (
                    <p className="mb-0 small text-white-50">{resource.description}</p>
                  )}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TrainingModule

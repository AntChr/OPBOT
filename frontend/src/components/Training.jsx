import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_ENDPOINTS } from '../config/api'
import Navbar from './Navbar'
import TrainingModule from './TrainingModule'

function Training({ onBackToQuiz, user }) {
  const navigate = useNavigate()
  const [training, setTraining] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedModuleNumber, setSelectedModuleNumber] = useState(null)

  // Étapes de génération de la formation
  const generationSteps = [
    { label: 'Récupération de votre profil...', duration: 2000 },
    { label: 'Analyse de vos compétences actuelles...', duration: 3000 },
    { label: 'Génération de la vue d\'ensemble...', duration: 8000 },
    { label: 'Création du Module 1 - Fondations...', duration: 12000 },
    { label: 'Création du Module 2 - Pratique guidée...', duration: 12000 },
    { label: 'Création du Module 3 - Autonomie...', duration: 12000 },
    { label: 'Génération du projet fil rouge...', duration: 8000 },
    { label: 'Sauvegarde de votre formation...', duration: 3000 },
    { label: 'Finalisation...', duration: 2000 }
  ]

  useEffect(() => {
    fetchTraining()
  }, [user])

  const fetchTraining = async () => {
    try {
      setIsLoading(true)
      setError('')
      const token = localStorage.getItem('token')
      const response = await axios.get(API_ENDPOINTS.TRAINING_GET(user._id), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      setTraining(response.data.training)

      // Si la formation est en cours de génération, démarrer le polling
      if (response.data.training.status === 'generating') {
        startPolling()
      }

      // Si la génération a échoué, afficher une erreur
      if (response.data.training.status === 'generation_failed') {
        setError('La génération précédente a échoué. Cliquez sur "Régénérer" pour réessayer.')
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la formation:', error)
      if (error.response?.status === 404) {
        setError('Aucune formation disponible. Cliquez sur "Générer ma formation" pour commencer.')
      } else {
        setError('Erreur lors du chargement de la formation')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const startPolling = () => {
    const pollInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get(API_ENDPOINTS.TRAINING_GET(user._id), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.data.training.status === 'active') {
          clearInterval(pollInterval)
          setTraining(response.data.training)
          setIsGenerating(false)
        } else if (response.data.training.status === 'generation_failed') {
          clearInterval(pollInterval)
          setIsGenerating(false)
          setError('Échec de la génération. Veuillez réessayer.')
        }
      } catch (error) {
        console.error('Erreur polling:', error)
      }
    }, 5000) // Poll toutes les 5 secondes

    // Arrêter le polling après 3 minutes max
    setTimeout(() => {
      clearInterval(pollInterval)
      if (isGenerating) {
        setIsGenerating(false)
        setError('La génération prend plus de temps que prévu. Rafraîchissez la page dans quelques instants.')
      }
    }, 180000)
  }

  const generateTraining = async () => {
    try {
      setIsGenerating(true)
      setCurrentStep(0)
      setError('')

      // Simuler la progression des étapes
      let stepIndex = 0
      const stepInterval = setInterval(() => {
        stepIndex++
        if (stepIndex < generationSteps.length) {
          setCurrentStep(stepIndex)
        } else {
          clearInterval(stepInterval)
        }
      }, 7000) // Changer d'étape toutes les 7 secondes

      const token = localStorage.getItem('token')
      const targetJob = user.recommendedJob || 'Votre métier idéal'

      console.log('🎓 Génération formation:', {
        userId: user._id,
        targetJob
      })

      const response = await axios.post(
        API_ENDPOINTS.TRAINING_GENERATE,
        {
          userId: user._id,
          targetJob,
          careerId: null,
          constraints: {},
          skillsAssessmentId: null
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 10000 // 10 secondes pour le déclenchement
        }
      )

      clearInterval(stepInterval)

      if (response.data.success) {
        // Démarrer le polling pour vérifier quand la génération est terminée
        startPolling()
      }

    } catch (error) {
      console.error('Erreur lors de la génération:', error)
      setIsGenerating(false)

      if (error.code === 'ECONNABORTED') {
        setError('La génération a pris trop de temps. Veuillez réessayer.')
      } else if (error.response?.status === 400) {
        // Afficher le message exact du backend
        const errorMessage = error.response?.data?.error || 'Une formation est déjà active'
        setError(errorMessage)
        fetchTraining()
      } else {
        setError('Erreur lors de la génération de la formation')
      }
    }
  }

  const handleModuleSelect = (moduleNumber) => {
    setSelectedModuleNumber(moduleNumber)
  }

  const handleModuleComplete = async (moduleNumber) => {
    try {
      const token = localStorage.getItem('token')
      await axios.put(
        API_ENDPOINTS.TRAINING_MODULE_COMPLETE(training.id),
        { moduleNumber },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      // Rafraîchir la formation
      fetchTraining()
    } catch (error) {
      console.error('Erreur lors de la complétion du module:', error)
    }
  }

  const getProgressPercentage = () => {
    if (!training) return 0
    return training.progress?.overallCompletionPercentage || 0
  }

  const getModuleStatus = (module) => {
    if (module.status === 'completed') return 'Terminé'
    if (module.status === 'in_progress') return 'En cours'
    if (module.status === 'available') return 'Disponible'
    return 'Verrouillé'
  }

  const getModuleStatusColor = (module) => {
    if (module.status === 'completed') return '#4caf50'
    if (module.status === 'in_progress') return '#2196f3'
    if (module.status === 'available') return '#ff9800'
    return '#757575'
  }

  return (
    <div className="min-vh-100 vw-100" style={{background: '#212121', paddingTop: '90px', paddingBottom: '2rem'}}>
      <Navbar
        user={user}
        onLogout={() => {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.reload()
        }}
        onBackToChat={onBackToQuiz}
        showAdminButton={user?.role === 'admin'}
        showActionPlanButton={true}
        onShowActionPlan={() => navigate('/action-plan')}
      />

      <div className="container-fluid px-4" style={{maxWidth: '100%'}}>
        <div className="d-flex gap-4">
          {/* Sidebar Navigation - Sticky */}
          <div style={{
            width: '280px',
            position: 'sticky',
            top: '100px',
            height: 'fit-content'
          }}>
            <div className="card shadow-lg" style={{
              backgroundColor: '#303030',
              border: 'none',
              borderRadius: '12px'
            }}>
              <div className="card-body p-3">
                <div className="d-flex align-items-center gap-2 mb-4">
                  <button
                    onClick={onBackToQuiz}
                    className="btn btn-secondary"
                    title="Retour au Chat"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      padding: '0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <i className="fa-solid fa-arrow-left"></i>
                  </button>
                  <h5 className="fw-bold text-white mb-0">Ma Formation</h5>
                </div>

                {training && (
                  <>
                    <div className="mb-3 p-3" style={{
                      backgroundColor: '#404040',
                      borderRadius: '8px',
                      border: '1px solid #555'
                    }}>
                      <div className="text-white small mb-2">
                        <strong>Métier cible :</strong>
                      </div>
                      <div className="text-white fw-semibold mb-3">
                        {training.targetJob}
                      </div>
                      <div className="text-white small mb-2">
                        <strong>Progression :</strong>
                      </div>
                      <div className="progress mb-2" style={{height: '8px', backgroundColor: '#555'}}>
                        <div
                          className="progress-bar"
                          role="progressbar"
                          style={{
                            width: `${getProgressPercentage()}%`,
                            backgroundColor: '#4caf50'
                          }}
                          aria-valuenow={getProgressPercentage()}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        ></div>
                      </div>
                      <div className="text-white-50 small">
                        {getProgressPercentage()}% complété
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="text-white small mb-2 fw-semibold">Modules</div>
                      {training.modules?.map(module => (
                        <button
                          key={module.moduleNumber}
                          onClick={() => module.status !== 'locked' && handleModuleSelect(module.moduleNumber)}
                          disabled={module.status === 'locked'}
                          className="w-100 btn text-start mb-2"
                          style={{
                            backgroundColor: selectedModuleNumber === module.moduleNumber ? '#404040' : '#2a2a2a',
                            border: `1px solid ${getModuleStatusColor(module)}`,
                            borderRadius: '8px',
                            opacity: module.status === 'locked' ? 0.5 : 1
                          }}
                        >
                          <div className="d-flex align-items-center gap-2 p-2">
                            <div
                              className="rounded-circle d-flex align-items-center justify-content-center"
                              style={{
                                width: '32px',
                                height: '32px',
                                backgroundColor: getModuleStatusColor(module),
                                flexShrink: 0
                              }}
                            >
                              {module.status === 'completed' ? (
                                <i className="fa-solid fa-check text-white"></i>
                              ) : module.status === 'locked' ? (
                                <i className="fa-solid fa-lock text-white"></i>
                              ) : (
                                <span className="text-white fw-bold">{module.moduleNumber}</span>
                              )}
                            </div>
                            <div className="flex-grow-1">
                              <div className="text-white fw-semibold small">{module.title}</div>
                              <div className="text-white-50" style={{fontSize: '0.75rem'}}>
                                {getModuleStatus(module)}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-grow-1" style={{minWidth: 0}}>
            {/* Generating State */}
            {isGenerating && (
              <div className="card shadow-lg mb-4" style={{
                backgroundColor: '#303030',
                border: '1px solid #444',
                borderRadius: '12px'
              }}>
                <div className="card-body p-5">
                  <div className="text-center">
                    <div className="spinner-border text-primary mb-4" role="status" style={{width: '4rem', height: '4rem'}}>
                      <span className="visually-hidden">Génération en cours...</span>
                    </div>
                    <h4 className="text-white mb-4">Génération de votre formation personnalisée</h4>
                    <div className="text-white-50 mb-4">
                      {generationSteps[currentStep]?.label || 'En cours...'}
                    </div>
                    <div className="progress mb-3" style={{height: '8px', backgroundColor: '#555'}}>
                      <div
                        className="progress-bar progress-bar-striped progress-bar-animated"
                        role="progressbar"
                        style={{width: `${((currentStep + 1) / generationSteps.length) * 100}%`}}
                      ></div>
                    </div>
                    <p className="text-white-50 small">
                      Cela peut prendre 2-3 minutes. Votre formation sera unique et adaptée à votre profil.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && !isGenerating && (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Chargement...</span>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !isGenerating && (
              <div className="card shadow-lg mb-4" style={{
                backgroundColor: '#303030',
                border: '1px solid #f44336',
                borderRadius: '12px'
              }}>
                <div className="card-body p-4">
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <i className="fa-solid fa-exclamation-circle text-danger" style={{fontSize: '2rem'}}></i>
                    <div>
                      <h5 className="text-white mb-1">Aucune formation disponible</h5>
                      <p className="text-white-50 mb-0">{error}</p>
                    </div>
                  </div>
                  <button
                    onClick={generateTraining}
                    className="btn btn-primary w-100"
                    disabled={isGenerating}
                  >
                    <i className="fa-solid fa-graduation-cap me-2"></i>
                    Générer ma formation personnalisée
                  </button>
                </div>
              </div>
            )}

            {/* Training Content */}
            {training && !isLoading && !isGenerating && (
              <>
                {/* Overview */}
                {!selectedModuleNumber && (
                  <div className="card shadow-lg mb-4" style={{
                    backgroundColor: '#303030',
                    border: '1px solid #444',
                    borderRadius: '12px'
                  }}>
                    <div className="card-body p-4">
                      <h3 className="text-white mb-4">
                        <i className="fa-solid fa-graduation-cap me-2"></i>
                        {training.targetJob}
                      </h3>

                      <div className="row mb-4">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <div className="text-white-50 small mb-1">Objectif</div>
                            <div className="text-white">{training.trainingObjective}</div>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="mb-3">
                            <div className="text-white-50 small mb-1">Durée estimée</div>
                            <div className="text-white">{training.estimatedDuration}</div>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="mb-3">
                            <div className="text-white-50 small mb-1">Niveau</div>
                            <div className="text-white">
                              {training.entryLevel === 'beginner' ? 'Débutant' :
                               training.entryLevel === 'intermediate' ? 'Intermédiaire' : 'Avancé'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {training.finalSkills && training.finalSkills.length > 0 && (
                        <div className="mb-4">
                          <div className="text-white-50 small mb-2">Compétences visées</div>
                          <div className="d-flex flex-wrap gap-2">
                            {training.finalSkills.map((skill, index) => (
                              <span key={index} className="badge" style={{backgroundColor: '#4caf50', fontSize: '0.9rem'}}>
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="alert alert-info mb-3" style={{backgroundColor: '#1e3a5f', border: 'none'}}>
                        <i className="fa-solid fa-info-circle me-2"></i>
                        Sélectionnez un module dans le menu latéral pour commencer votre formation.
                      </div>

                      <button
                        onClick={generateTraining}
                        className="btn btn-outline-warning w-100"
                        disabled={isGenerating}
                      >
                        <i className="fa-solid fa-rotate me-2"></i>
                        Régénérer la formation
                      </button>
                    </div>
                  </div>
                )}

                {/* Module Detail */}
                {selectedModuleNumber && (
                  <TrainingModule
                    training={training}
                    moduleNumber={selectedModuleNumber}
                    onComplete={handleModuleComplete}
                    onBack={() => setSelectedModuleNumber(null)}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Training

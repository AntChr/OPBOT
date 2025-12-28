import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_ENDPOINTS } from '../config/api'
import Navbar from './Navbar'
import ObotChatBubble from './ObotChatBubble'

function ActionPlanPanel({ onBackToQuiz, user }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [actionPlan, setActionPlan] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  // Étapes du workflow n8n
  const workflowSteps = [
    { label: 'Préparation des données...', duration: 2000 },
    { label: 'Recherche d\'offres Pôle Emploi...', duration: 5000 },
    { label: 'Recherche d\'offres web (Linkup Jobs)...', duration: 8000 },
    { label: 'Recherche de formations (France Compétences)...', duration: 4000 },
    { label: 'Recherche de formations web (Linkup Training)...', duration: 8000 },
    { label: 'Consolidation des données (Claude AI)...', duration: 15000 },
    { label: 'Analyse du marché de l\'emploi...', duration: 5000 },
    { label: 'Sauvegarde du plan d\'action...', duration: 3000 },
    { label: 'Finalisation...', duration: 2000 }
  ]

  useEffect(() => {
    fetchActionPlan()
  }, [user])

  const fetchActionPlan = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      const response = await axios.get(API_ENDPOINTS.ACTION_PLAN_GET(user._id), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      setActionPlan(response.data.actionPlan)
    } catch (error) {
      console.error('Erreur lors du chargement du plan d\'action:', error)
      if (error.response?.status === 404) {
        setError('Aucun plan d\'action disponible. Cliquez sur "Générer mon plan" pour en créer un.')
      } else {
        setError('Erreur lors du chargement du plan d\'action')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const generateActionPlan = async () => {
    try {
      setIsGenerating(true)
      setCurrentStep(0)
      setError('')

      // Simuler la progression des étapes
      let stepIndex = 0
      const stepInterval = setInterval(() => {
        stepIndex++
        if (stepIndex < workflowSteps.length) {
          setCurrentStep(stepIndex)
        } else {
          clearInterval(stepInterval)
        }
      }, 6000) // Changer d'étape toutes les 6 secondes en moyenne

      const token = localStorage.getItem('token')

      // Utiliser le métier recommandé par Obot, sinon le métier actuel, sinon demander
      const jobTitle = user.recommendedJob || user.currentJob || 'Votre métier idéal'

      console.log('📋 Génération plan d\'action:', {
        userId: user._id,
        recommendedJob: user.recommendedJob,
        currentJob: user.currentJob,
        jobTitleUsed: jobTitle
      })

      const response = await axios.post(
        API_ENDPOINTS.ACTION_PLAN_GENERATE,
        {
          userId: user._id,
          jobTitle,
          userProfile: {
            location: user.location || 'Paris',
            region: user.region || 'Île-de-France',
            age: user.age || 25,
            education: user.education || 'bac'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 90000 // 90 secondes timeout
        }
      )

      clearInterval(stepInterval)

      if (response.data.success) {
        setCurrentStep(workflowSteps.length - 1)

        // Attendre 1 seconde avant de recharger le plan
        setTimeout(() => {
          setIsGenerating(false)
          fetchActionPlan()
        }, 1000)
      }

    } catch (error) {
      console.error('Erreur lors de la génération:', error)
      setIsGenerating(false)

      if (error.code === 'ECONNABORTED') {
        setError('La génération a pris trop de temps. Veuillez réessayer.')
      } else if (error.response?.status === 503) {
        setError('Service de génération indisponible. Vérifiez que n8n est configuré.')
      } else {
        setError('Erreur lors de la génération du plan d\'action')
      }
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getDaysRemaining = (expiresAt) => {
    const days = Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
    return days > 0 ? days : 0
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
                  <h5 className="fw-bold text-white mb-0">Plan d'Action</h5>
                </div>

                {actionPlan && (
                  <div className="mb-3 p-3" style={{
                    backgroundColor: '#404040',
                    borderRadius: '8px',
                    border: '1px solid #555'
                  }}>
                    <div className="text-white small mb-2">
                      <strong>Métier :</strong>
                    </div>
                    <div className="text-white fw-semibold mb-3">
                      {actionPlan.jobTitle}
                    </div>
                    <div className="text-white small">
                      Expire dans <strong>{getDaysRemaining(actionPlan.expiresAt)} jours</strong>
                    </div>
                    <div className="progress mt-2" style={{height: '6px'}}>
                      <div
                        className="progress-bar bg-primary"
                        style={{width: `${(getDaysRemaining(actionPlan.expiresAt) / 7) * 100}%`}}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Bouton pour générer/régénérer un plan */}
                <div className="mb-3">
                  <button
                    onClick={generateActionPlan}
                    className="btn btn-primary w-100"
                    disabled={isGenerating}
                  >
                    <i className="fa-solid fa-magic me-2"></i>
                    {actionPlan ? 'Régénérer le plan' : 'Générer mon plan'}
                  </button>
                </div>

                <nav className="d-flex flex-column gap-2">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`btn text-start d-flex align-items-center gap-2 ${
                      activeTab === 'overview'
                        ? 'btn-primary'
                        : 'btn-outline-secondary text-white'
                    }`}
                    style={{
                      border: activeTab === 'overview' ? 'none' : '1px solid #555',
                      transition: 'all 0.2s'
                    }}
                  >
                    <i className="fa-solid fa-home"></i>
                    <span>Vue d'ensemble</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('market')}
                    className={`btn text-start d-flex align-items-center gap-2 ${
                      activeTab === 'market'
                        ? 'btn-primary'
                        : 'btn-outline-secondary text-white'
                    }`}
                    style={{
                      border: activeTab === 'market' ? 'none' : '1px solid #555',
                      transition: 'all 0.2s'
                    }}
                  >
                    <i className="fa-solid fa-chart-line"></i>
                    <span>Marché de l'Emploi</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('training')}
                    className={`btn text-start d-flex align-items-center gap-2 ${
                      activeTab === 'training'
                        ? 'btn-primary'
                        : 'btn-outline-secondary text-white'
                    }`}
                    style={{
                      border: activeTab === 'training' ? 'none' : '1px solid #555',
                      transition: 'all 0.2s'
                    }}
                  >
                    <i className="fa-solid fa-graduation-cap"></i>
                    <span>Formations</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('jobs')}
                    className={`btn text-start d-flex align-items-center gap-2 ${
                      activeTab === 'jobs'
                        ? 'btn-primary'
                        : 'btn-outline-secondary text-white'
                    }`}
                    style={{
                      border: activeTab === 'jobs' ? 'none' : '1px solid #555',
                      transition: 'all 0.2s'
                    }}
                  >
                    <i className="fa-solid fa-briefcase"></i>
                    <span>Offres d'Emploi</span>
                  </button>
                </nav>

                {actionPlan && (
                  <div className="mt-3">
                    <div className="d-flex align-items-center gap-2 p-2" style={{
                      backgroundColor: '#404040',
                      borderRadius: '6px'
                    }}>
                      <i className="fa-solid fa-shield-halved text-primary"></i>
                      <div className="flex-fill">
                        <div className="text-white small">Fiabilité</div>
                        <strong className="text-white">{actionPlan.reliabilityScore}%</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div style={{flex: 1}}>
            {isGenerating ? (
              <div className="card shadow-lg" style={{
                backgroundColor: '#303030',
                border: 'none',
                borderRadius: '12px'
              }}>
                <div className="card-body p-5">
                  <div className="text-center mb-4">
                    <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}} role="status">
                      <span className="visually-hidden">Génération en cours...</span>
                    </div>
                    <h3 className="h4 fw-bold text-white mb-2">Génération de votre plan d'action</h3>
                    <p className="text-white opacity-75">Cette opération peut prendre jusqu'à 60 secondes...</p>
                  </div>

                  {/* Progress bar */}
                  <div className="progress mb-4" style={{height: '8px', backgroundColor: '#404040'}}>
                    <div
                      className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                      style={{width: `${((currentStep + 1) / workflowSteps.length) * 100}%`}}
                    ></div>
                  </div>

                  {/* Étapes du workflow */}
                  <div className="d-flex flex-column gap-3">
                    {workflowSteps.map((step, index) => (
                      <div
                        key={index}
                        className={`d-flex align-items-center gap-3 p-3 rounded ${
                          index < currentStep
                            ? 'bg-success bg-opacity-10'
                            : index === currentStep
                            ? 'bg-primary bg-opacity-25'
                            : 'bg-dark bg-opacity-25'
                        }`}
                        style={{
                          transition: 'all 0.3s ease',
                          border: index === currentStep ? '2px solid #0d6efd' : '1px solid #404040'
                        }}
                      >
                        {index < currentStep ? (
                          <i className="fa-solid fa-check-circle text-success" style={{fontSize: '24px'}}></i>
                        ) : index === currentStep ? (
                          <div className="spinner-border spinner-border-sm text-primary"></div>
                        ) : (
                          <i className="fa-regular fa-circle text-white opacity-25" style={{fontSize: '24px'}}></i>
                        )}
                        <div className="flex-fill">
                          <div className={`fw-semibold ${
                            index <= currentStep ? 'text-white' : 'text-white opacity-50'
                          }`}>
                            {step.label}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="alert alert-info mt-4" role="alert">
                    <i className="fa-solid fa-info-circle me-2"></i>
                    <small>
                      Nous interrogeons 4 sources de données (Pôle Emploi, Linkup, France Compétences)
                      et utilisons l'intelligence artificielle pour vous proposer le meilleur plan d'action.
                    </small>
                  </div>
                </div>
              </div>
            ) : isLoading ? (
              <div className="card shadow-lg" style={{
                backgroundColor: '#303030',
                border: 'none',
                borderRadius: '12px'
              }}>
                <div className="card-body p-4 text-center py-5">
                  <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">Chargement...</span>
                  </div>
                  <div className="text-white">Chargement de votre plan d'action...</div>
                </div>
              </div>
            ) : error ? (
              <div className="card shadow-lg" style={{
                backgroundColor: '#303030',
                border: 'none',
                borderRadius: '12px'
              }}>
                <div className="card-body p-4">
                  <div className="alert alert-warning" role="alert">
                    <i className="fa-solid fa-exclamation-triangle me-2"></i>
                    {error}
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      onClick={generateActionPlan}
                      className="btn btn-primary"
                      disabled={isGenerating}
                    >
                      <i className="fa-solid fa-magic me-2"></i>
                      Générer mon plan d'action
                    </button>
                    {user?.role !== 'admin' && (
                      <button
                        onClick={onBackToQuiz}
                        className="btn btn-secondary"
                      >
                        Retour à la conversation
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : actionPlan ? (
              <>
                {/* Vue d'ensemble */}
                {activeTab === 'overview' && (
                  <div className="card shadow-lg mb-4" style={{
                    backgroundColor: '#303030',
                    border: 'none',
                    borderRadius: '12px'
                  }}>
                    <div className="card-body p-4">
                      <h2 className="h3 fw-bold text-white mb-4">
                        Votre Plan d'Action Personnalisé
                      </h2>

                      {/* Parcours Recommandé - Timeline */}
                      <div className="mb-5">
                        <h3 className="h5 fw-semibold text-white mb-4 d-flex align-items-center gap-2">
                          <i className="fa-solid fa-route text-primary"></i>
                          Votre Parcours Recommandé
                        </h3>

                        {/* Timeline visuelle */}
                        <div className="card" style={{
                          backgroundColor: '#404040',
                          border: '2px solid #0d6efd',
                          borderRadius: '12px'
                        }}>
                          <div className="card-body p-4">
                            <div className="d-flex align-items-center gap-4 flex-wrap">
                              {/* Étape 1 : Formation */}
                              <div className="flex-fill" style={{minWidth: '200px'}}>
                                <div className="d-flex align-items-start gap-3">
                                  <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    backgroundColor: '#0d6efd',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    <i className="fa-solid fa-graduation-cap text-white"></i>
                                  </div>
                                  <div className="flex-fill">
                                    <div className="text-white small opacity-75 mb-1">Étape 1</div>
                                    <h5 className="h6 fw-bold text-white mb-1">Formation</h5>
                                    <div className="text-white small mb-2">
                                      {actionPlan.trainingPath?.name || 'Formation recommandée'}
                                    </div>
                                    <div className="d-flex gap-2 align-items-center">
                                      <span className="badge bg-primary">
                                        {actionPlan.trainingPath?.duration || '12 mois'}
                                      </span>
                                      {actionPlan.trainingPath?.cpfEligible && (
                                        <span className="badge bg-success">CPF</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Flèche */}
                              <div className="text-primary" style={{fontSize: '24px'}}>
                                <i className="fa-solid fa-arrow-right"></i>
                              </div>

                              {/* Étape 2 : Durée totale */}
                              <div className="flex-fill" style={{minWidth: '150px'}}>
                                <div className="d-flex align-items-start gap-3">
                                  <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    backgroundColor: '#198754',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    <i className="fa-solid fa-clock text-white"></i>
                                  </div>
                                  <div className="flex-fill">
                                    <div className="text-white small opacity-75 mb-1">Durée</div>
                                    <h5 className="h6 fw-bold text-white mb-1">
                                      {actionPlan.trainingPath?.duration || '12 mois'}
                                    </h5>
                                    <div className="text-white small">
                                      de formation
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Flèche */}
                              <div className="text-primary" style={{fontSize: '24px'}}>
                                <i className="fa-solid fa-arrow-right"></i>
                              </div>

                              {/* Étape 3 : Objectif Emploi */}
                              <div className="flex-fill" style={{minWidth: '200px'}}>
                                <div className="d-flex align-items-start gap-3">
                                  <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    backgroundColor: '#ffc107',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    <i className="fa-solid fa-briefcase text-dark"></i>
                                  </div>
                                  <div className="flex-fill">
                                    <div className="text-white small opacity-75 mb-1">Objectif</div>
                                    <h5 className="h6 fw-bold text-white mb-1">
                                      {actionPlan.jobTitle}
                                    </h5>
                                    {actionPlan.jobOffers[0] && (
                                      <>
                                        <div className="text-white small mb-1">
                                          {actionPlan.jobOffers[0].company}
                                        </div>
                                        <span className="badge bg-warning text-dark">
                                          {actionPlan.jobOffers[0].contract}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Bouton CTA */}
                            {actionPlan.trainingPath?.url && (
                              <div className="mt-4 pt-3" style={{borderTop: '1px solid #555'}}>
                                <a
                                  href={actionPlan.trainingPath.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-primary"
                                >
                                  <i className="fa-solid fa-rocket me-2"></i>
                                  Commencer la formation
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Note explicative */}
                        <div className="alert alert-info mt-3" role="alert">
                          <i className="fa-solid fa-info-circle me-2"></i>
                          <small>
                            Ce parcours vous mène de la formation à votre objectif professionnel.
                            L'offre d'emploi représente le type de poste visé après formation.
                          </small>
                        </div>
                      </div>

                      {/* Aperçu Marché */}
                      <div className="row g-4">
                        <div className="col-md-4">
                          <div className="card h-100" style={{
                            backgroundColor: '#404040',
                            border: 'none',
                            borderRadius: '12px'
                          }}>
                            <div className="card-body p-3">
                              <div className="d-flex align-items-center gap-2 mb-2">
                                <i className="fa-solid fa-chart-line text-primary"></i>
                                <h5 className="h6 fw-semibold text-white mb-0">Marché de l'Emploi</h5>
                              </div>
                              <div className="mt-3">
                                <div className="h2 fw-bold text-primary mb-1">
                                  {actionPlan.marketAnalysis.jobCount}
                                </div>
                                <div className="text-white small">
                                  Offres dans un rayon de {actionPlan.marketAnalysis.radius}km
                                </div>
                                {actionPlan.marketAnalysis.recruiting && (
                                  <span className="badge bg-success mt-2">
                                    <i className="fa-solid fa-check me-1"></i>
                                    Secteur qui recrute
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="col-md-4">
                          <div className="card h-100" style={{
                            backgroundColor: '#404040',
                            border: 'none',
                            borderRadius: '12px'
                          }}>
                            <div className="card-body p-3">
                              <div className="d-flex align-items-center gap-2 mb-2">
                                <i className="fa-solid fa-euro-sign text-success"></i>
                                <h5 className="h6 fw-semibold text-white mb-0">Salaire Moyen</h5>
                              </div>
                              <div className="mt-3">
                                <div className="h2 fw-bold text-success mb-1">
                                  {actionPlan.marketAnalysis.avgSalary || 'N/A'}
                                </div>
                                <div className="text-white small">
                                  Salaire annuel brut
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="col-md-4">
                          <div className="card h-100" style={{
                            backgroundColor: '#404040',
                            border: 'none',
                            borderRadius: '12px'
                          }}>
                            <div className="card-body p-3">
                              <div className="d-flex align-items-center gap-2 mb-2">
                                <i className="fa-solid fa-briefcase text-warning"></i>
                                <h5 className="h6 fw-semibold text-white mb-0">Offres Disponibles</h5>
                              </div>
                              <div className="mt-3">
                                <div className="h2 fw-bold text-warning mb-1">
                                  {actionPlan.jobOffers.length}
                                </div>
                                <div className="text-white small">
                                  Opportunités actuelles
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Marché de l'Emploi */}
                {activeTab === 'market' && (
                  <div className="card shadow-lg" style={{
                    backgroundColor: '#303030',
                    border: 'none',
                    borderRadius: '12px'
                  }}>
                    <div className="card-body p-4">
                      <h2 className="h4 fw-bold text-white mb-4">
                        Analyse du Marché de l'Emploi
                      </h2>

                      <div className="row g-4 mb-4">
                        <div className="col-md-6">
                          <div className="p-3" style={{
                            backgroundColor: '#404040',
                            borderRadius: '8px'
                          }}>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="text-white small">État du marché</span>
                              {actionPlan.marketAnalysis.recruiting ? (
                                <span className="badge bg-success">Recrutement actif</span>
                              ) : (
                                <span className="badge bg-warning">Peu d'offres</span>
                              )}
                            </div>
                            <div className="text-white fw-semibold h5 mb-0">
                              {actionPlan.marketAnalysis.jobCount} offres
                            </div>
                            <div className="text-white small opacity-75">
                              dans un rayon de {actionPlan.marketAnalysis.radius}km autour de {actionPlan.marketAnalysis.region}
                            </div>
                          </div>
                        </div>

                        <div className="col-md-6">
                          <div className="p-3" style={{
                            backgroundColor: '#404040',
                            borderRadius: '8px'
                          }}>
                            <div className="text-white small mb-2">Tendance du secteur</div>
                            <div className="d-flex align-items-center gap-2">
                              <div className="flex-fill">
                                <div className="progress" style={{height: '8px'}}>
                                  <div
                                    className={`progress-bar ${
                                      actionPlan.marketAnalysis.trend === 'high' ? 'bg-success' :
                                      actionPlan.marketAnalysis.trend === 'medium' ? 'bg-warning' : 'bg-danger'
                                    }`}
                                    style={{
                                      width: actionPlan.marketAnalysis.trend === 'high' ? '100%' :
                                             actionPlan.marketAnalysis.trend === 'medium' ? '66%' : '33%'
                                    }}
                                  ></div>
                                </div>
                              </div>
                              <span className={`badge ${
                                actionPlan.marketAnalysis.trend === 'high' ? 'bg-success' :
                                actionPlan.marketAnalysis.trend === 'medium' ? 'bg-warning' : 'bg-danger'
                              }`}>
                                {actionPlan.marketAnalysis.trend === 'high' ? 'Forte' :
                                 actionPlan.marketAnalysis.trend === 'medium' ? 'Moyenne' : 'Faible'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {actionPlan.marketAnalysis.avgSalary && (
                        <div className="alert alert-info" role="alert">
                          <i className="fa-solid fa-info-circle me-2"></i>
                          <strong>Salaire moyen :</strong> {actionPlan.marketAnalysis.avgSalary}
                        </div>
                      )}

                      <div className="text-white small opacity-75">
                        Dernière mise à jour : {formatDate(actionPlan.marketAnalysis.lastUpdated)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Formations */}
                {activeTab === 'training' && (
                  <div className="card shadow-lg" style={{
                    backgroundColor: '#303030',
                    border: 'none',
                    borderRadius: '12px'
                  }}>
                    <div className="card-body p-4">
                      <h2 className="h4 fw-bold text-white mb-4">
                        Parcours de Formation
                      </h2>

                      {actionPlan.trainingPath ? (
                        <div className="card" style={{
                          backgroundColor: '#404040',
                          border: 'none',
                          borderRadius: '12px'
                        }}>
                          <div className="card-body p-4">
                            <div className="d-flex justify-content-between align-items-start mb-3">
                              <div>
                                <span className="badge bg-primary mb-2">Recommandé</span>
                                <h3 className="h5 fw-bold text-white mb-2">
                                  {actionPlan.trainingPath.name}
                                </h3>
                                <div className="text-white mb-3">
                                  <i className="fa-solid fa-building me-2"></i>
                                  {actionPlan.trainingPath.provider}
                                </div>
                              </div>
                              <div className="text-end">
                                <div className="text-primary fw-bold h4 mb-1">
                                  {actionPlan.trainingPath.cost ? `${actionPlan.trainingPath.cost}€` : 'Gratuit'}
                                </div>
                                {actionPlan.trainingPath.cpfEligible && (
                                  <span className="badge bg-success">Éligible CPF</span>
                                )}
                              </div>
                            </div>

                            <div className="row g-3 mb-4">
                              <div className="col-md-4">
                                <div className="text-white small opacity-75 mb-1">Durée</div>
                                <div className="text-white fw-semibold">
                                  <i className="fa-solid fa-clock me-1"></i>
                                  {actionPlan.trainingPath.duration}
                                </div>
                              </div>
                              <div className="col-md-4">
                                <div className="text-white small opacity-75 mb-1">Format</div>
                                <div className="text-white fw-semibold">
                                  <i className="fa-solid fa-location-dot me-1"></i>
                                  {actionPlan.trainingPath.format === 'online' ? 'En ligne' :
                                   actionPlan.trainingPath.format === 'onsite' ? 'Présentiel' : 'Hybride'}
                                </div>
                              </div>
                              {actionPlan.trainingPath.rating && (
                                <div className="col-md-4">
                                  <div className="text-white small opacity-75 mb-1">Note qualité/coût</div>
                                  <div className="text-white fw-semibold">
                                    <i className="fa-solid fa-star text-warning me-1"></i>
                                    {actionPlan.trainingPath.rating}/10
                                  </div>
                                </div>
                              )}
                            </div>

                            {actionPlan.trainingPath.url && (
                              <a
                                href={actionPlan.trainingPath.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary"
                              >
                                Accéder à la formation
                                <i className="fa-solid fa-external-link-alt ms-2"></i>
                              </a>
                            )}

                            <div className="mt-3 pt-3" style={{borderTop: '1px solid #555'}}>
                              <div className="text-white small opacity-75">
                                <i className="fa-solid fa-database me-1"></i>
                                Source : {actionPlan.trainingPath.source}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="alert alert-warning" role="alert">
                          Aucune formation disponible pour le moment.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Offres d'Emploi */}
                {activeTab === 'jobs' && (
                  <div className="card shadow-lg" style={{
                    backgroundColor: '#303030',
                    border: 'none',
                    borderRadius: '12px'
                  }}>
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2 className="h4 fw-bold text-white mb-0">
                          Offres d'Emploi
                        </h2>
                        <span className="badge bg-primary">
                          {actionPlan.jobOffers.length} offres
                        </span>
                      </div>

                      {actionPlan.jobOffers.length > 0 ? (
                        <div className="d-flex flex-column gap-3">
                          {actionPlan.jobOffers.map((offer, index) => (
                            <div key={index} className="card" style={{
                              backgroundColor: '#404040',
                              border: 'none',
                              borderRadius: '12px'
                            }}>
                              <div className="card-body p-3">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                  <div className="flex-fill">
                                    <h5 className="h6 fw-bold text-white mb-1">
                                      {offer.title}
                                    </h5>
                                    <div className="text-white small mb-2">
                                      <i className="fa-solid fa-building me-1"></i>
                                      {offer.company}
                                    </div>
                                  </div>
                                  <span className="badge bg-primary">
                                    {offer.contract}
                                  </span>
                                </div>

                                <div className="d-flex flex-wrap gap-3 mb-2">
                                  <div className="text-white small">
                                    <i className="fa-solid fa-location-dot me-1"></i>
                                    {offer.location} ({offer.distance}km)
                                  </div>
                                  {offer.salary && (
                                    <div className="text-white small">
                                      <i className="fa-solid fa-euro-sign me-1"></i>
                                      {offer.salary}
                                    </div>
                                  )}
                                  <div className="text-white small">
                                    <i className="fa-solid fa-calendar me-1"></i>
                                    {formatDate(offer.postedDate)}
                                  </div>
                                </div>

                                {offer.url && (
                                  <a
                                    href={offer.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-sm btn-outline-primary"
                                  >
                                    Voir l'offre
                                    <i className="fa-solid fa-external-link-alt ms-1"></i>
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="alert alert-warning" role="alert">
                          <i className="fa-solid fa-exclamation-triangle me-2"></i>
                          Aucune offre d'emploi disponible pour le moment.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Obot Chat Bubble - Floating assistant */}
      {actionPlan && <ObotChatBubble user={user} actionPlan={actionPlan} />}
    </div>
  )
}

export default ActionPlanPanel

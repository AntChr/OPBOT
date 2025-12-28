import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import axios from 'axios'
import Landing from './components/Landing'
import AdminPanel from './components/AdminPanel'
import Auth from './components/Auth'
import Results from './components/Results'
import Conclusion from './components/Conclusion'
import ActionPlanPanel from './components/ActionPlanPanel'
import Training from './components/Training'
import Questionnaire from './components/Questionnaire'
import ChatWrapper from './components/ChatWrapper'
import './App.css'

function App() {
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState(null)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showConclusion, setShowConclusion] = useState(false)
  const [conversation, setConversation] = useState(null)
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [showChat, setShowChat] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing authentication
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')

    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
      // Set default authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`
    }

    // Authentification vérifiée, on peut afficher l'app
    setIsLoading(false)
  }, [])

  const handleChatComplete = (chatResults) => {
    setResults(chatResults)
    setShowResults(true)
    setShowChat(false)
  }

  const restartChat = () => {
    setShowResults(false)
    setResults(null)
    setShowChat(true)
  }

  const handleResetConversation = () => {
    // Reset la conversation et recharge la page chat
    setShowResults(false)
    setResults(null)
    setShowChat(true)
    // Force un refresh du ChatInterface en changeant une clé
    setShowChat(false)
    setTimeout(() => setShowChat(true), 100)
  }

  const handleLogin = (userData, userToken) => {
    setUser(userData)
    setToken(userToken)
    axios.defaults.headers.common['Authorization'] = `Bearer ${userToken}`
  }

  const handleLogout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete axios.defaults.headers.common['Authorization']
    restartChat()
  }

  // Attendre la vérification de l'authentification avant d'afficher quoi que ce soit
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'var(--dark-bg)'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
          <p>Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        {/* Landing page - Public */}
        <Route path="/" element={<Landing />} />

        {/* Auth page - Public */}
        <Route path="/auth" element={<Auth onLogin={handleLogin} />} />

        {/* Test route for Conclusion page preview - Public */}
        <Route
          path="/test-conclusion"
          element={
            <Conclusion
              conversation={{
                milestones: {
                  specific_job_identified: {
                    jobTitle: '🥐 Manager de Boulangerie',
                    conclusionMessage: `Vous avez ce leadership naturel, cette passion pour les gens et cette créativité qu'il faut pour diriger. Manager une boulangerie vous permettra de créer une ambiance unique, de diriger une équipe bienveillante, et de voir l'impact direct de votre travail chaque jour. C'est LA synthèse parfaite entre votre besoin de diriger, votre amour pour les interactions humaines, et cette créativité que vous avez exprimée. On a peut-être trouvé votre voie. 🎯`
                  }
                }
              }}
              user={user}
              onLogout={handleLogout}
              onShowAdmin={() => setShowAdmin(true)}
              onRestart={restartChat}
            />
          }
        />

        {/* Test route for ActionPlan page preview - Public */}
        <Route
          path="/test-action-plan"
          element={
            <ActionPlanPanel
              onBackToQuiz={() => setShowChat(true)}
              user={user || { _id: 'test-user-id', firstName: 'Test', lastName: 'User', role: 'admin' }}
            />
          }
        />

        {/* Test route for Questionnaire page preview - Public */}
        <Route
          path="/test-questionnaire"
          element={
            <Questionnaire
              conversation={{
                _id: 'test-conversation-id',
                milestones: {
                  specific_job_identified: {
                    jobTitle: '🥐 Manager de Boulangerie',
                    conclusionMessage: `Vous avez ce leadership naturel, cette passion pour les gens et cette créativité qu'il faut pour diriger.`
                  }
                }
              }}
              user={{ _id: 'test-user-id', firstName: 'Test', lastName: 'User' }}
              onLogout={() => {}}
              onShowAdmin={() => {}}
              onRestart={() => {}}
            />
          }
        />

        {/* Protected routes - Requires authentication */}
        {user && token ? (
          <>

            {/* Admin panel - Restricted to admin users only */}
            <Route
              path="/admin"
              element={
                user?.role === 'admin' ? (
                  <AdminPanel
                    onBackToQuiz={() => {
                      setShowAdmin(false)
                      setShowChat(true)
                    }}
                    user={user}
                  />
                ) : (
                  <Navigate to="/chat" replace />
                )
              }
            />

            {/* Chat interface and results */}
            <Route
              path="/chat"
              element={
                <>
                  {showAdmin ? (
                    <Navigate to="/admin" replace />
                  ) : showConclusion && conversation ? (
                    <Conclusion
                      conversation={conversation}
                      user={user}
                      onLogout={handleLogout}
                      onShowAdmin={() => setShowAdmin(true)}
                      onRestart={restartChat}
                    />
                  ) : showResults && results ? (
                    <Results
                      results={results}
                      user={user}
                      onRestart={restartChat}
                      onLogout={handleLogout}
                      onShowAdmin={() => setShowAdmin(true)}
                    />
                  ) : showChat ? (
                    <ChatWrapper
                      user={user}
                      onLogout={handleLogout}
                      onShowAdmin={() => setShowAdmin(true)}
                      onReset={handleResetConversation}
                      showResetButton={user?.role === 'admin'}
                      onComplete={handleChatComplete}
                      onMilestoneComplete={(conv) => {
                        setConversation(conv)
                        setShowConclusion(true)
                        setShowChat(false)
                      }}
                    />
                  ) : null}
                </>
              }
            />

            {/* Action Plan page */}
            <Route
              path="/action-plan"
              element={
                <ActionPlanPanel
                  onBackToQuiz={() => {
                    setShowAdmin(false)
                    setShowChat(true)
                  }}
                  user={user}
                />
              }
            />

            {/* Training page (Formation personnalisée) */}
            <Route
              path="/training"
              element={
                <Training
                  onBackToQuiz={() => {
                    setShowAdmin(false)
                    setShowChat(true)
                  }}
                  user={user}
                />
              }
            />

            {/* Questionnaire page */}
            <Route
              path="/questionnaire"
              element={
                <Questionnaire
                  conversation={conversation}
                  user={user}
                  onLogout={handleLogout}
                  onShowAdmin={() => setShowAdmin(true)}
                  onRestart={restartChat}
                />
              }
            />

            {/* Default redirect for authenticated users */}
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </>
        ) : (
          /* Default redirect to landing for unauthenticated users */
          <Route path="*" element={<Navigate to="/" replace />} />
        )}
      </Routes>
    </Router>
  )
}

export default App

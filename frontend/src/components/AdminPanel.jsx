import { useState } from 'react'
import axios from 'axios'
import { API_ENDPOINTS } from '../config/api'
import Navbar from './Navbar'
import QuestionnaireAnalytics from './Admin/QuestionnaireAnalytics'
import ConversationLogs from './Admin/ConversationLogs'

function AdminPanel({ onBackToQuiz, user }) {
  const [activeTab, setActiveTab] = useState('users')
  const [allUsers, setAllUsers] = useState([])
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [message, setMessage] = useState('')

  const fetchAllUsers = async () => {
    try {
      setIsLoadingData(true)
      const token = localStorage.getItem('token')
      const response = await axios.get(API_ENDPOINTS.ADMIN_USERS, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      setAllUsers(response.data.users)
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error)
      if (error.response?.status === 403) {
        setMessage('Accès refusé - droits administrateur requis')
      }
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleImpersonate = async (targetUser) => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(
        API_ENDPOINTS.ADMIN_IMPERSONATE(targetUser._id),
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.data.success) {
        // Save new token and user to localStorage
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))

        // Reload page to update context
        setMessage(`Connecté en tant que ${targetUser.firstName} ${targetUser.lastName}`)
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
    } catch (error) {
      console.error('Erreur lors de l\'impersonate:', error)
      setMessage('Erreur lors de la connexion en tant qu\'utilisateur')
    }
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setMessage('')
    if (tab === 'users') {
      fetchAllUsers()
    }
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
        showAdminButton={false}
        isAdmin={true}
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
                  <h5 className="fw-bold text-white mb-0">Administration</h5>
                </div>

                <nav className="d-flex flex-column gap-2">
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => handleTabChange('users')}
                      className={`btn text-start d-flex align-items-center gap-2 ${
                        activeTab === 'users'
                          ? 'btn-primary'
                          : 'btn-outline-secondary text-white'
                      }`}
                      style={{
                        border: activeTab === 'users' ? 'none' : '1px solid #555',
                        transition: 'all 0.2s'
                      }}
                    >
                      <i className="fa-solid fa-users"></i>
                      <span>Utilisateurs</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleTabChange('analytics')}
                    className={`btn text-start d-flex align-items-center gap-2 ${
                      activeTab === 'analytics'
                        ? 'btn-primary'
                        : 'btn-outline-secondary text-white'
                    }`}
                    style={{
                      border: activeTab === 'analytics' ? 'none' : '1px solid #555',
                      transition: 'all 0.2s'
                    }}
                  >
                    <i className="fa-solid fa-chart-bar"></i>
                    <span>Analytics Questionnaires</span>
                  </button>

                  <button
                    onClick={() => handleTabChange('conversations')}
                    className={`btn text-start d-flex align-items-center gap-2 ${
                      activeTab === 'conversations'
                        ? 'btn-primary'
                        : 'btn-outline-secondary text-white'
                    }`}
                    style={{
                      border: activeTab === 'conversations' ? 'none' : '1px solid #555',
                      transition: 'all 0.2s'
                    }}
                  >
                    <i className="fa-solid fa-comments"></i>
                    <span>Logs Conversations</span>
                  </button>
                </nav>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div style={{flex: 1}}>
            <div className="card shadow-lg" style={{
              backgroundColor: '#303030',
              border: 'none',
              borderRadius: '12px'
            }}>
              <div className="card-body p-4">
                {message && (
                  <div className="alert alert-success alert-dismissible fade show" role="alert">
                    {message}
                    <button type="button" className="btn-close" aria-label="Close" onClick={() => setMessage('')}></button>
                  </div>
                )}

                {activeTab === 'users' && user?.role === 'admin' && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h2 className="h4 fw-semibold text-white">Gestion des utilisateurs</h2>
                  <div className="small text-white">
                    Total: {allUsers.length} utilisateur(s)
                  </div>
                </div>

                {isLoadingData && (
                  <div className="text-center py-5">
                    <div className="h5 text-white">Chargement des utilisateurs...</div>
                  </div>
                )}

                {!isLoadingData && allUsers.length > 0 && (
                  <div className="table-responsive">
                    <table className="table table-dark table-striped">
                      <thead>
                        <tr>
                          <th className="text-white">#</th>
                          <th className="text-white">Nom Prénom</th>
                          <th className="text-white">Email</th>
                          <th className="text-white">Score</th>
                          <th className="text-white">Rôle</th>
                          <th className="text-white">Inscrit le</th>
                          <th className="text-white">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers.map((targetUser, index) => (
                          <tr key={targetUser._id}>
                            <td className="text-white">
                              {index + 1}
                            </td>
                            <td>
                              <div className="text-white fw-medium">
                                {targetUser.firstName} {targetUser.lastName}
                              </div>
                              <div className="text-white small">
                                @{targetUser.username}
                              </div>
                            </td>
                            <td className="text-white">
                              {targetUser.email}
                            </td>
                            <td>
                              <span className="badge bg-success">
                                {targetUser.scoring} pts
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${
                                targetUser.role === 'admin'
                                  ? 'bg-danger'
                                  : 'bg-primary'
                              }`}>
                                {targetUser.role === 'admin' ? '👑 Admin' : '👤 User'}
                              </span>
                            </td>
                            <td className="text-white">
                              {new Date(targetUser.createdAt).toLocaleDateString('fr-FR')}
                            </td>
                            <td>
                              {targetUser._id !== user._id && (
                                <button
                                  onClick={() => handleImpersonate(targetUser)}
                                  className="btn btn-sm btn-outline-primary"
                                  title="Se connecter en tant que cet utilisateur"
                                >
                                  <i className="fa-solid fa-user-secret me-1"></i>
                                  Se connecter
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {!isLoadingData && allUsers.length === 0 && (
                  <div className="text-center py-5 text-white">
                    Aucun utilisateur en base de données
                  </div>
                )}
              </div>
            )}

                {activeTab === 'analytics' && (
                  <QuestionnaireAnalytics />
                )}

                {activeTab === 'conversations' && (
                  <ConversationLogs />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPanel
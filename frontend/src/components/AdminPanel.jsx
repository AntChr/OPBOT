import { useState } from 'react'
import axios from 'axios'
import Navbar from './Navbar'
import JobsList from './Admin/JobsList'
import QuestionnaireAnalytics from './Admin/QuestionnaireAnalytics'
import ConversationLogs from './Admin/ConversationLogs'

function AdminPanel({ onBackToQuiz, user }) {
  const [activeTab, setActiveTab] = useState('jobs')
  const [activeSubTab, setActiveSubTab] = useState('jobs-recap')
  const [message, setMessage] = useState('')
  const [allJobs, setAllJobs] = useState([])
  const [allQuestions, setAllQuestions] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [isLoadingData, setIsLoadingData] = useState(false)

  // État pour le formulaire métier
  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    skills: '',
    traits: '',
    education: '',
    salary: {
      junior: '',
      mid: '',
      senior: ''
    },
    work_environment: '',
    career_path: '',
    riasec: '',
    tags: ''
  })

  // État pour le formulaire question
  const [questionForm, setQuestionForm] = useState({
    text: '',
    category: '',
    order: 1,
    options: [
      { text: '', score: 5, traits: '' },
      { text: '', score: 5, traits: '' },
      { text: '', score: 5, traits: '' },
      { text: '', score: 5, traits: '' }
    ]
  })

  const handleJobSubmit = async (e) => {
    e.preventDefault()
    try {
      const jobData = {
        ...jobForm,
        skills: jobForm.skills.split(',').map(s => s.trim()),
        traits: jobForm.traits.split(',').map(s => s.trim()),
        career_path: jobForm.career_path.split(',').map(s => s.trim()),
        riasec: jobForm.riasec.split(',').map(s => s.trim()),
        tags: jobForm.tags.split(',').map(s => s.trim())
      }

      await axios.post('http://localhost:5000/api/results/create-job', jobData)
      setMessage('Métier créé avec succès !')

      // Reset form
      setJobForm({
        title: '', description: '', skills: '', traits: '', education: '',
        salary: { junior: '', mid: '', senior: '' },
        work_environment: '', career_path: '', riasec: '', tags: ''
      })
    } catch (error) {
      setMessage('Erreur lors de la création du métier')
      console.error(error)
    }
  }

  const handleQuestionSubmit = async (e) => {
    e.preventDefault()
    try {
      const questionData = {
        ...questionForm,
        options: questionForm.options.map(opt => ({
          ...opt,
          traits: opt.traits.split(',').map(s => s.trim()),
          score: parseInt(opt.score)
        }))
      }

      await axios.post('http://localhost:5000/api/questions', questionData)
      setMessage('Question créée avec succès !')

      // Reset form
      setQuestionForm({
        text: '', category: '', order: 1,
        options: [
          { text: '', score: 5, traits: '' },
          { text: '', score: 5, traits: '' },
          { text: '', score: 5, traits: '' },
          { text: '', score: 5, traits: '' }
        ]
      })
    } catch (error) {
      setMessage('Erreur lors de la création de la question')
      console.error(error)
    }
  }

  const updateJobForm = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setJobForm(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
    } else {
      setJobForm(prev => ({ ...prev, [field]: value }))
    }
  }

  const updateQuestionOption = (index, field, value) => {
    setQuestionForm(prev => ({
      ...prev,
      options: prev.options.map((opt, i) =>
        i === index ? { ...opt, [field]: value } : opt
      )
    }))
  }

  const fetchAllJobs = async () => {
    try {
      setIsLoadingData(true)
      const response = await axios.get('http://localhost:5000/api/results/jobs')
      setAllJobs(response.data)
    } catch (error) {
      console.error('Erreur lors du chargement des métiers:', error)
    } finally {
      setIsLoadingData(false)
    }
  }

  const fetchAllQuestions = async () => {
    try {
      setIsLoadingData(true)
      const response = await axios.get('http://localhost:5000/api/questions')
      setAllQuestions(response.data)
    } catch (error) {
      console.error('Erreur lors du chargement des questions:', error)
    } finally {
      setIsLoadingData(false)
    }
  }

  const fetchAllUsers = async () => {
    try {
      setIsLoadingData(true)
      const token = localStorage.getItem('token')
      const response = await axios.get('http://localhost:5000/api/auth/users', {
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

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setMessage('')
    if (tab === 'recap') {
      setActiveSubTab('jobs-recap')
      fetchAllJobs()
      fetchAllQuestions()
    } else if (tab === 'users') {
      fetchAllUsers()
    }
  }

  const handleSubTabChange = (subTab) => {
    setActiveSubTab(subTab)
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

      <div className="container" style={{maxWidth: '72rem'}}>
        <div className="bg-#303030 rounded shadow-lg">
          <div className="border-bottom">
            <div className="d-flex justify-content-between align-items-center p-4">
              <h1 className="h3 fw-bold text-white">Administration</h1>
              <button
                onClick={onBackToQuiz}
                className="btn btn-secondary"
              >
                <i className="fa-solid fa-arrow-left me-2"></i>
                Retour au Quiz
              </button>
            </div>

            <ul className="nav nav-tabs">
              <li className="nav-item">
                <button
                  onClick={() => handleTabChange('jobs-list')}
                  className={`nav-link ${
                    activeTab === 'jobs-list' ? 'active' : 'text-white'
                  }`}
                >
                  📊 Gestion des Métiers
                </button>
              </li>
              <li className="nav-item">
                <button
                  onClick={() => handleTabChange('jobs')}
                  className={`nav-link ${
                    activeTab === 'jobs' ? 'active' : 'text-white'
                  }`}
                >
                  ➕ Ajouter un Métier
                </button>
              </li>
              <li className="nav-item">
                <button
                  onClick={() => handleTabChange('questions')}
                  className={`nav-link ${
                    activeTab === 'questions' ? 'active' : 'text-white'
                  }`}
                >
                  ❓ Ajouter une Question
                </button>
              </li>
              <li className="nav-item">
                <button
                  onClick={() => handleTabChange('recap')}
                  className={`nav-link ${
                    activeTab === 'recap' ? 'active' : 'text-white'
                  }`}
                >
                  📋 Récapitulatif
                </button>
              </li>
              {user?.role === 'admin' && (
                <li className="nav-item">
                  <button
                    onClick={() => handleTabChange('users')}
                    className={`nav-link ${
                      activeTab === 'users' ? 'active' : 'text-white'
                    }`}
                  >
                    👥 Utilisateurs
                  </button>
                </li>
              )}
              <li className="nav-item">
                <button
                  onClick={() => handleTabChange('analytics')}
                  className={`nav-link ${
                    activeTab === 'analytics' ? 'active' : 'text-white'
                  }`}
                >
                  📊 Analytics Questionnaires
                </button>
              </li>
              <li className="nav-item">
                <button
                  onClick={() => handleTabChange('conversations')}
                  className={`nav-link ${
                    activeTab === 'conversations' ? 'active' : 'text-white'
                  }`}
                >
                  💬 Logs Conversations
                </button>
              </li>
            </ul>
          </div>

          <div className="p-4">
            {message && (
              <div className="alert alert-success alert-dismissible fade show" role="alert">
                {message}
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setMessage('')}></button>
              </div>
            )}

            {activeTab === 'jobs-list' && (
              <div style={{backgroundColor: '#212121', padding: '0', margin: '-16px'}}>
                <div style={{backgroundColor: '#212121', padding: '16px'}}>
                  <JobsList />
                </div>
              </div>
            )}

            {activeTab === 'jobs' && (
              <form onSubmit={handleJobSubmit}>
                <h2 className="h4 fw-semibold text-white mb-4">Ajouter un nouveau métier</h2>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label text-white">
                      Titre du métier *
                    </label>
                    <input
                      type="text"
                      required
                      value={jobForm.title}
                      onChange={(e) => updateJobForm('title', e.target.value)}
                      className="form-control"
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-white">
                      Catégorie
                    </label>
                    <input
                      type="text"
                      value={jobForm.category}
                      onChange={(e) => updateJobForm('category', e.target.value)}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label text-white">
                    Description *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={jobForm.description}
                    onChange={(e) => updateJobForm('description', e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label text-white">
                      Compétences (séparées par des virgules) *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={jobForm.skills}
                      onChange={(e) => updateJobForm('skills', e.target.value)}
                      placeholder="JavaScript, HTML, CSS, React"
                      className="form-control"
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-white">
                      Traits (séparés par des virgules) *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={jobForm.traits}
                      onChange={(e) => updateJobForm('traits', e.target.value)}
                      placeholder="creativity, problem-solving, teamwork"
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label text-white">
                    Formation requise
                  </label>
                  <input
                    type="text"
                    value={jobForm.education}
                    onChange={(e) => updateJobForm('education', e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label text-white">
                    Salaires
                  </label>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label small text-white">Junior</label>
                      <input
                        type="text"
                        value={jobForm.salary.junior}
                        onChange={(e) => updateJobForm('salary.junior', e.target.value)}
                        placeholder="25000-35000€"
                        className="form-control"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small text-white">Mid</label>
                      <input
                        type="text"
                        value={jobForm.salary.mid}
                        onChange={(e) => updateJobForm('salary.mid', e.target.value)}
                        placeholder="35000-50000€"
                        className="form-control"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small text-white">Senior</label>
                      <input
                        type="text"
                        value={jobForm.salary.senior}
                        onChange={(e) => updateJobForm('salary.senior', e.target.value)}
                        placeholder="50000-70000€"
                        className="form-control"
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label text-white">
                    Environnement de travail
                  </label>
                  <input
                    type="text"
                    value={jobForm.work_environment}
                    onChange={(e) => updateJobForm('work_environment', e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label text-white">
                      Évolution de carrière (séparée par des virgules)
                    </label>
                    <input
                      type="text"
                      value={jobForm.career_path}
                      onChange={(e) => updateJobForm('career_path', e.target.value)}
                      placeholder="Junior, Senior, Lead, Manager"
                      className="form-control"
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-white">
                      RIASEC (séparé par des virgules)
                    </label>
                    <input
                      type="text"
                      value={jobForm.riasec}
                      onChange={(e) => updateJobForm('riasec', e.target.value)}
                      placeholder="I, A, C"
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label text-white">
                    Tags (séparés par des virgules)
                  </label>
                  <input
                    type="text"
                    value={jobForm.tags}
                    onChange={(e) => updateJobForm('tags', e.target.value)}
                    placeholder="technologie, créatif, analytique"
                    className="form-control"
                  />
                </div>

                <button
                  type="submit"
                  className="btn bg-white w-100 py-2"
                >
                  Créer le métier
                </button>
              </form>
            )}

            {activeTab === 'questions' && (
              <form onSubmit={handleQuestionSubmit}>
                <h2 className="h4 fw-semibold text-white mb-4">Ajouter une nouvelle question</h2>

                <div className="mb-3">
                  <label className="form-label text-white">
                    Texte de la question *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={questionForm.text}
                    onChange={(e) => setQuestionForm(prev => ({ ...prev, text: e.target.value }))}
                    className="form-control"
                  />
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label text-white">
                      Catégorie
                    </label>
                    <input
                      type="text"
                      value={questionForm.category}
                      onChange={(e) => setQuestionForm(prev => ({ ...prev, category: e.target.value }))}
                      className="form-control"
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label text-white">
                      Ordre
                    </label>
                    <input
                      type="number"
                      value={questionForm.order}
                      onChange={(e) => setQuestionForm(prev => ({ ...prev, order: parseInt(e.target.value) }))}
                      className="form-control"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Options de réponse</h3>
                  {questionForm.options.map((option, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-white mb-3">Option {index + 1}</h4>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="d-flex flex-column">
                          <label className="block text-sm text-white mb-1">
                            Texte de la réponse *
                          </label>
                          <input
                            type="text"
                            required
                            value={option.text}
                            onChange={(e) => updateQuestionOption(index, 'text', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="d-flex flex-column">
                          <label className="block text-sm text-white mb-1">
                            Score
                          </label>
                          <input
                            type="number"
                            value={option.score}
                            onChange={(e) => updateQuestionOption(index, 'score', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="d-flex flex-column">
                        <label className="block text-sm text-white mb-1">
                          Traits (séparés par des virgules) *
                        </label>
                        <input
                          type="text"
                          required
                          value={option.traits}
                          onChange={(e) => updateQuestionOption(index, 'traits', e.target.value)}
                          placeholder="creativity, problem-solving, teamwork"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 py-3 rounded-lg hover:bg-blue-700 font-medium"
                >
                  Créer la question
                </button>
              </form>
            )}

            {activeTab === 'recap' && (
              <div>
                <h2 className="h4 fw-semibold text-white mb-4">Récapitulatif des données</h2>

                {/* Sous-onglets */}
                <div className="border-bottom mb-4">
                  <ul className="nav nav-pills">
                    <li className="nav-item">
                      <button
                        onClick={() => handleSubTabChange('jobs-recap')}
                        className={`nav-link ${
                          activeSubTab === 'jobs-recap'
                            ? 'active'
                            : 'text-white'
                        }`}
                      >
                        Métiers ({allJobs.length})
                      </button>
                    </li>
                    <li className="nav-item">
                      <button
                        onClick={() => handleSubTabChange('questions-recap')}
                        className={`nav-link ${
                          activeSubTab === 'questions-recap'
                            ? 'active'
                            : 'text-white'
                        }`}
                      >
                        Questions ({allQuestions.length})
                      </button>
                    </li>
                  </ul>
                </div>

                {isLoadingData && (
                  <div className="text-center py-5">
                    <div className="h5 text-white">Chargement des données...</div>
                  </div>
                )}

                {!isLoadingData && activeSubTab === 'jobs-recap' && (
                  <div>
                    <div className="d-flex flex-column gap-3">
                      {allJobs.map((job, index) => (
                        <div key={job._id} className="border rounded p-3" style={{backgroundColor: '#404040', borderColor: '#555'}}>
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <h4 className="h5 fw-semibold text-white">{job.title}</h4>
                            <div className="small text-white">#{index + 1}</div>
                          </div>

                          <p className="text-white mb-3">{job.description}</p>

                          <div className="row g-3 small">
                            <div className="col-md-6">
                              <strong className="text-white">Compétences:</strong>
                              <div className="d-flex flex-wrap gap-1 mt-1">
                                {job.skills.map((skill, i) => (
                                  <span key={i} className="badge bg-primary">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="col-md-6">
                              <strong className="text-white">Traits:</strong>
                              <div className="d-flex flex-wrap gap-1 mt-1">
                                {job.traits.map((trait, i) => (
                                  <span key={i} className="badge bg-success">
                                    {trait}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="col-md-6">
                              <strong className="text-white">Salaire junior:</strong>
                              <span className="text-white"> {job.salary?.junior || 'Non renseigné'}</span>
                            </div>

                            <div className="col-md-6">
                              <strong className="text-white">Formation:</strong>
                              <span className="text-white"> {job.education || 'Non renseigné'}</span>
                            </div>
                          </div>

                          {job.career_path && job.career_path.length > 0 && (
                            <div className="mt-3">
                              <strong className="text-white small">Évolution de carrière:</strong>
                              <div className="d-flex flex-wrap gap-1 mt-1">
                                {job.career_path.map((step, i) => (
                                  <span key={i} className="badge bg-secondary">
                                    {step}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {allJobs.length === 0 && (
                        <div className="text-center py-5 text-white">
                          Aucun métier en base de données
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!isLoadingData && activeSubTab === 'questions-recap' && (
                  <div>
                    <div className="d-flex flex-column gap-3">
                      {allQuestions.map((question, index) => (
                        <div key={question._id} className="border rounded p-3" style={{backgroundColor: '#404040', borderColor: '#555'}}>
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <h4 className="h5 fw-semibold text-white">
                              Question {question.order || index + 1}
                            </h4>
                            <div className="small text-white">
                              Catégorie: {question.category || 'Non définie'}
                            </div>
                          </div>

                          <p className="text-white mb-3 fw-medium">{question.text}</p>

                          <div>
                            <strong className="text-white small">Options de réponse:</strong>
                            <div className="mt-2">
                              {question.options.map((option, optIndex) => (
                                <div key={optIndex} className="border-start border-primary border-3 ps-3 py-2 mb-2" style={{backgroundColor: '#505050'}}>
                                  <div className="d-flex justify-content-between align-items-start mb-1">
                                    <span className="text-white">{option.text}</span>
                                    <span className="small fw-medium text-primary">
                                      Score: {option.score}
                                    </span>
                                  </div>
                                  <div className="d-flex flex-wrap gap-1">
                                    {option.traits.map((trait, i) => (
                                      <span key={i} className="badge bg-warning text-dark">
                                        {trait}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                      {allQuestions.length === 0 && (
                        <div className="text-center py-5 text-white">
                          Aucune question en base de données
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers.map((user, index) => (
                          <tr key={user._id}>
                            <td className="text-white">
                              {index + 1}
                            </td>
                            <td>
                              <div className="text-white fw-medium">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-white small">
                                @{user.username}
                              </div>
                            </td>
                            <td className="text-white">
                              {user.email}
                            </td>
                            <td>
                              <span className="badge bg-success">
                                {user.scoring} pts
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${
                                user.role === 'admin'
                                  ? 'bg-danger'
                                  : 'bg-primary'
                              }`}>
                                {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                              </span>
                            </td>
                            <td className="text-white">
                              {new Date(user.createdAt).toLocaleDateString('fr-FR')}
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
              <div style={{backgroundColor: '#212121', padding: '0', margin: '-16px'}}>
                <ConversationLogs />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPanel
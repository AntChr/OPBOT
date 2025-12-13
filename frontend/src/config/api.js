/**
 * Configuration centralisée de l'API
 * Utilise les variables d'environnement Vite
 */

// TEMPORARY: Hard-coded for testing
export const API_URL = 'https://opbot-production.up.railway.app';

/**
 * Endpoints de l'API
 */
export const API_ENDPOINTS = {
  // Authentication
  LOGIN: `${API_URL}/api/auth/login`,
  REGISTER: `${API_URL}/api/auth/register`,
  ME: `${API_URL}/api/auth/me`,
  UPDATE_PROFILE: `${API_URL}/api/auth/update-profile`,

  // Conversations
  CONVERSATIONS_START: `${API_URL}/api/conversations/start`,
  CONVERSATIONS_MESSAGES: (conversationId) => `${API_URL}/api/conversations/${conversationId}/messages`,
  CONVERSATIONS_GET: (conversationId) => `${API_URL}/api/conversations/${conversationId}`,
  CONVERSATIONS_RESET: `${API_URL}/api/conversations/reset`,

  // Jobs
  JOBS_SEARCH: `${API_URL}/api/jobs/search`,
  JOBS_GET: (jobId) => `${API_URL}/api/jobs/${jobId}`,

  // Questionnaire
  QUESTIONNAIRE_SUBMIT: `${API_URL}/api/questionnaire`,
  QUESTIONNAIRE_ANALYTICS: `${API_URL}/api/questionnaire/analytics`,

  // Questions
  QUESTIONS_LIST: `${API_URL}/api/questions`,
  QUESTIONS_CREATE: `${API_URL}/api/questions`,

  // Results/Jobs
  RESULTS_JOBS_LIST: `${API_URL}/api/results/jobs`,
  RESULTS_JOBS_CREATE: `${API_URL}/api/results/create-job`,

  // Admin
  ADMIN_USERS: `${API_URL}/api/auth/users`,
  ADMIN_USERS_ALT: `${API_URL}/api/auth/admin/users`,
  ADMIN_CONVERSATIONS: `${API_URL}/api/conversations/admin/all`,
  ADMIN_CONVERSATIONS_DETAILS: (conversationId) => `${API_URL}/api/conversations/admin/${conversationId}/details`,
};

export default API_URL;

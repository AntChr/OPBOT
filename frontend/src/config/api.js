/**
 * Configuration centralisée de l'API
 * Utilise les variables d'environnement Vite
 */

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

  // Admin
  ADMIN_USERS: `${API_URL}/api/auth/admin/users`,
  ADMIN_CONVERSATIONS: `${API_URL}/api/conversations/all`,
};

export default API_URL;

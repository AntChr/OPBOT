/**
 * Configuration centralisée de l'API
 * Détecte automatiquement l'environnement (local vs production)
 */

// Détection automatique : localhost = backend local, sinon = Railway
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
export const API_URL = isLocalhost
  ? 'http://localhost:5000'
  : 'https://opbot-production.up.railway.app';

/**
 * Endpoints de l'API
 */
export const API_ENDPOINTS = {
  // Authentication
  LOGIN: `${API_URL}/api/auth/login`,
  REGISTER: `${API_URL}/api/auth/register`,
  ME: `${API_URL}/api/auth/me`,
  UPDATE_PROFILE: `${API_URL}/api/auth/update-profile`,
  FORGOT_PASSWORD: `${API_URL}/api/auth/forgot-password`,

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
  ADMIN_USERS: `${API_URL}/api/auth/users`,
  ADMIN_USERS_ALT: `${API_URL}/api/auth/admin/users`,
  ADMIN_IMPERSONATE: (userId) => `${API_URL}/api/auth/impersonate/${userId}`,
  ADMIN_CONVERSATIONS: `${API_URL}/api/conversations/admin/all`,
  ADMIN_CONVERSATIONS_DETAILS: (conversationId) => `${API_URL}/api/conversations/admin/${conversationId}/details`,
  ADMIN_CONVERSATIONS_DELETE: (conversationId) => `${API_URL}/api/conversations/admin/${conversationId}`,

  // Action Plan
  ACTION_PLAN_GET: (userId) => `${API_URL}/api/action-plan/${userId}`,
  ACTION_PLAN_GENERATE: `${API_URL}/api/action-plan/generate`,
  ACTION_PLAN_ADMIN_ALL: `${API_URL}/api/action-plan/admin/all`,
  ACTION_PLAN_DELETE: (planId) => `${API_URL}/api/action-plan/${planId}`,
};

export default API_URL;

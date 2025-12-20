const rateLimit = require("express-rate-limit");

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard'
});

// Stricter rate limiting for auth endpoints (login/register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Trop de tentatives de connexion, veuillez réessayer plus tard'
});

// Moderate rate limiting for password reset
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 requests per hour
  message: 'Trop de tentatives de réinitialisation de mot de passe. Veuillez réessayer dans une heure.'
});

module.exports = {
  apiLimiter,
  authLimiter,
  forgotPasswordLimiter
};

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import './Auth.css';

const Auth = ({ onLogin }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    firstName: '',
    lastName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordData, setForgotPasswordData] = useState({
    email: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? API_ENDPOINTS.LOGIN : API_ENDPOINTS.REGISTER;
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(endpoint, payload);

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        onLogin(response.data.user, response.data.token);
        // Rediriger vers le chat après un login réussi
        navigate('/chat');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      username: '',
      password: '',
      firstName: '',
      lastName: ''
    });
    setError('');
  };

  const handleForgotPasswordChange = (e) => {
    setForgotPasswordData({
      ...forgotPasswordData,
      [e.target.name]: e.target.value
    });
    setForgotPasswordError('');
    setForgotPasswordSuccess('');
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotPasswordError('');
    setForgotPasswordSuccess('');

    // Validation
    if (forgotPasswordData.newPassword !== forgotPasswordData.confirmPassword) {
      setForgotPasswordError('Les mots de passe ne correspondent pas');
      return;
    }

    if (forgotPasswordData.newPassword.length < 8) {
      setForgotPasswordError('Le mot de passe doit contenir au minimum 8 caractères');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(API_ENDPOINTS.FORGOT_PASSWORD, {
        email: forgotPasswordData.email,
        newPassword: forgotPasswordData.newPassword
      });

      if (response.data.success) {
        setForgotPasswordSuccess('Mot de passe réinitialisé avec succès !');
        setTimeout(() => {
          setShowForgotPassword(false);
          setForgotPasswordData({ email: '', newPassword: '', confirmPassword: '' });
          setForgotPasswordSuccess('');
        }, 2000);
      }
    } catch (err) {
      setForgotPasswordError(err.response?.data?.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const openForgotPasswordModal = () => {
    setShowForgotPassword(true);
    setForgotPasswordError('');
    setForgotPasswordSuccess('');
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPassword(false);
    setForgotPasswordData({ email: '', newPassword: '', confirmPassword: '' });
    setForgotPasswordError('');
    setForgotPasswordSuccess('');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>{isLogin ? 'Connexion' : 'Créer un compte'}</h1>
          <p>
            {isLogin
              ? 'Connectez-vous à votre compte pour continuer'
              : 'Rejoignez-nous pour découvrir votre carrière idéale'}
          </p>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">Prénom</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Votre prénom"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Nom</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Votre nom"
                  required
                />
              </div>
            </div>
          )}

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="username">Nom d'utilisateur</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choisissez un nom d'utilisateur"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="votre.email@exemple.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Saisissez votre mot de passe"
              required
              minLength="8"
            />
            {!isLogin && (
              <span className="form-help">Minimum 8 caractères</span>
            )}
          </div>

          {isLogin && (
            <div className="forgot-password-link">
              <a href="#" onClick={(e) => { e.preventDefault(); openForgotPasswordModal(); }}>
                Mot de passe oublié ?
              </a>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="submit-button"
          >
            {loading ? 'Chargement...' : isLogin ? 'Se connecter' : 'Créer le compte'}
          </button>
        </form>

        <div className="auth-toggle">
          <button onClick={toggleMode}>
            {isLogin
              ? "Pas encore de compte ? S'inscrire"
              : "Déjà un compte ? Se connecter"
            }
          </button>
        </div>
      </div>

      {/* Modal Mot de passe oublié */}
      {showForgotPassword && (
        <div className="modal-overlay" onClick={closeForgotPasswordModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Réinitialiser le mot de passe</h2>
              <button className="modal-close" onClick={closeForgotPasswordModal}>
                &times;
              </button>
            </div>

            {forgotPasswordError && (
              <div className="auth-error" role="alert">
                {forgotPasswordError}
              </div>
            )}

            {forgotPasswordSuccess && (
              <div className="auth-success" role="alert">
                {forgotPasswordSuccess}
              </div>
            )}

            <form onSubmit={handleForgotPasswordSubmit}>
              <div className="form-group">
                <label htmlFor="forgot-email">Email</label>
                <input
                  type="email"
                  id="forgot-email"
                  name="email"
                  value={forgotPasswordData.email}
                  onChange={handleForgotPasswordChange}
                  placeholder="votre.email@exemple.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="new-password">Nouveau mot de passe</label>
                <input
                  type="password"
                  id="new-password"
                  name="newPassword"
                  value={forgotPasswordData.newPassword}
                  onChange={handleForgotPasswordChange}
                  placeholder="Nouveau mot de passe"
                  required
                  minLength="8"
                />
                <span className="form-help">Minimum 8 caractères</span>
              </div>

              <div className="form-group">
                <label htmlFor="confirm-password">Confirmer le mot de passe</label>
                <input
                  type="password"
                  id="confirm-password"
                  name="confirmPassword"
                  value={forgotPasswordData.confirmPassword}
                  onChange={handleForgotPasswordChange}
                  placeholder="Confirmer le mot de passe"
                  required
                  minLength="8"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={closeForgotPasswordModal}
                  className="cancel-button"
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="submit-button"
                  disabled={loading}
                >
                  {loading ? 'Réinitialisation...' : 'Réinitialiser'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import './Landing.css';

const Landing = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Récupérer l'utilisateur depuis le localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleContinueChat = () => {
    if (user) {
      navigate('/chat');
    }
  };
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const steps = [
    {
      number: 1,
      title: 'Conversez naturellement',
      description: 'Répondez à des questions qui vous ressemblent sur vos passions et ce qui vous anime vraiment',
    },
    {
      number: 2,
      title: 'Construisez votre profil',
      description: 'Notre IA comprend vos talents, vos valeurs et vos aspirations profondes',
    },
    {
      number: 3,
      title: 'Découvrez vos métiers',
      description: 'Recevez des recommandations personnalisées alignées avec qui vous êtes vraiment',
    },
    {
      number: 4,
      title: 'Trouvez votre passion',
      description: 'Explorez en détail les carrières qui correspondent à votre essence',
    },
  ];

  const features = [
    {
      icon: '✨',
      title: 'Découverte authentique',
      description: 'Comprenez vos vraies forces, valeurs et ce qui vous passionne réellement dans un métier',
    },
    {
      icon: '🎯',
      title: 'Matching intelligent',
      description: 'Notre IA analyse votre profil unique pour vous proposer vos meilleures options',
    },
    {
      icon: '🚀',
      title: 'Feuille de route personnalisée',
      description: 'Obtenez des conseils concrets pour construire votre carrière idéale',
    },
  ];

  return (
    <div className="landing-page">
      {/* Decorative gradient shapes */}
      <div className="gradient-shape"></div>
      <div className="gradient-shape-2"></div>

      {/* Navigation */}
      <nav className="landing-nav">
        <div className="container">
          <div className="nav-content">
            <div className="logo">🚀 Orientation+</div>
            <div className="nav-links">
              <a href="#features">Pourquoi nous</a>
              <a href="#how-it-works">Comment ça marche</a>
              {user ? (
                <div className="user-connected">
                  <i className="fa-solid fa-check-circle" style={{ color: '#10B981' }}></i>
                  <span>{user.firstName} connecté</span>
                </div>
              ) : (
                <a href="#cta">Commencer</a>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <motion.div
            className="hero-content"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.h1 variants={itemVariants} className="hero-title">
              Découvrez votre <span className="highlight">carrière idéale</span>
            </motion.h1>
            <motion.p variants={itemVariants} className="hero-subtitle">
              Laissez l'IA vous guider vers le métier de vos rêves. Répondez à des questions authentiques et découvrez des opportunités alignées avec vos vraies passions.
            </motion.p>
            <motion.div variants={itemVariants} className="hero-cta">
              {user ? (
                <button onClick={handleContinueChat} className="cta-button">
                  Continuer vers le chat
                </button>
              ) : (
                <Link to="/auth" className="cta-button">
                  Commencer l'exploration
                </Link>
              )}
              <p className="cta-secondary">Aucun engagement. ~5 minutes de conversation.</p>
            </motion.div>
          </motion.div>

          {/* Hero Illustration */}
          <motion.div
            className="hero-illustration"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="gradient-shape"></div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <motion.div
            className="section-header"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2>Pourquoi nous choisir ?</h2>
            <p>Une approche nouvelle de l'orientation professionnelle</p>
          </motion.div>

          <motion.div
            className="features-grid"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="feature-card"
                variants={itemVariants}
                whileHover={{ y: -5 }}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works-section">
        <div className="container">
          <motion.div
            className="section-header"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2>Comment ça marche</h2>
            <p>4 étapes simples pour trouver votre voie</p>
          </motion.div>

          <motion.div
            className="steps-container"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {steps.map((step, index) => (
              <motion.div key={index} className="step" variants={itemVariants}>
                <div className="step-number">{step.number}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                {index < steps.length - 1 && <div className="step-arrow">→</div>}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="cta-section">
        <motion.div
          className="container"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <h2>Prêt à explorer votre futur ?</h2>
          <p>Rejoignez des milliers de personnes qui ont trouvé leur passion</p>
          {user ? (
            <button onClick={handleContinueChat} className="cta-button cta-button-large">
              Continuer vers le chat
            </button>
          ) : (
            <Link to="/auth" className="cta-button cta-button-large">
              Commencer maintenant
            </Link>
          )}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Orientation+</h4>
              <p>Votre assistant IA pour découvrir votre carrière idéale</p>
            </div>
            <div className="footer-section">
              <h4>Navigation</h4>
              <ul>
                <li><a href="#features">Pourquoi nous</a></li>
                <li><a href="#how-it-works">Comment ça marche</a></li>
                <li><a href="#cta">Commencer</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Légal</h4>
              <ul>
                <li><a href="#privacy">Politique de confidentialité</a></li>
                <li><a href="#terms">Conditions d'utilisation</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Orientation+. Tous droits réservés.</p>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Landing;

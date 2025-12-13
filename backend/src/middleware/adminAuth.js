const adminAuth = (req, res, next) => {
  try {
    // Vérifier que l'utilisateur est connecté (le middleware auth a déjà vérifié le token)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié'
      });
    }

    // Vérifier que l'utilisateur a le rôle admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - droits administrateur requis'
      });
    }

    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

module.exports = adminAuth;
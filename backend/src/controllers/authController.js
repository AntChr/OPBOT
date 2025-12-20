const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Validate JWT_SECRET on module load
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters long');
}

const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: '7d'
  });
};

// Password validation function
const validatePassword = (password) => {
  if (!password) {
    return 'Le mot de passe est requis';
  }
  if (password.length < 8) {
    return 'Le mot de passe doit contenir au moins 8 caractères';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Le mot de passe doit contenir au moins une lettre majuscule';
  }
  if (!/[a-z]/.test(password)) {
    return 'Le mot de passe doit contenir au moins une lettre minuscule';
  }
  if (!/[0-9]/.test(password)) {
    return 'Le mot de passe doit contenir au moins un chiffre';
  }
  return null;
};

const authController = {
  // Register new user
  register: async (req, res) => {
    try {
      const { email, username, password, firstName, lastName } = req.body;

      // Validation
      if (!email || !username || !password || !firstName || !lastName) {
        return res.status(400).json({
          success: false,
          message: 'Tous les champs sont requis'
        });
      }

      // Validate password strength
      const passwordError = validatePassword(password);
      if (passwordError) {
        return res.status(400).json({
          success: false,
          message: passwordError
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Cet identifiant est déjà utilisé'
        });
      }

      // Create user
      const user = new User({
        email,
        username,
        password,
        firstName,
        lastName
      });

      await user.save();

      // Generate token
      const token = generateToken(user._id);

      res.status(201).json({
        success: true,
        message: 'Compte créé avec succès',
        token,
        user
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la création du compte'
      });
    }
  },

  // Login user
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email et mot de passe requis'
        });
      }

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect'
        });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect'
        });
      }

      // Generate token
      const token = generateToken(user._id);

      res.json({
        success: true,
        message: 'Connexion réussie',
        token,
        user
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la connexion'
      });
    }
  },

  // Get current user profile
  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      res.json({
        success: true,
        user
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  },

  // Update user scoring
  updateScoring: async (req, res) => {
    try {
      const { scoring } = req.body;
      const userId = req.userId;

      if (scoring < 0 || scoring > 100) {
        return res.status(400).json({
          success: false,
          message: 'Le score doit être entre 0 et 100'
        });
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { scoring },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      res.json({
        success: true,
        message: 'Score mis à jour',
        user
      });

    } catch (error) {
      console.error('Update scoring error:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la mise à jour du score'
      });
    }
  },

  // Get all users (for admin/debug purposes)
  getAllUsers: async (req, res) => {
    try {
      const users = await User.find({}).sort({ createdAt: -1 });
      res.json({
        success: true,
        count: users.length,
        users
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  },

  // Promote user to admin (only for setup)
  promoteToAdmin: async (req, res) => {
    try {
      const { userId } = req.params;

      const user = await User.findByIdAndUpdate(
        userId,
        { role: 'admin' },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      res.json({
        success: true,
        message: 'Utilisateur promu en admin',
        user
      });

    } catch (error) {
      console.error('Promote to admin error:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur'
      });
    }
  },

  // Forgot password - reset password with email verification
  forgotPassword: async (req, res) => {
    try {
      const { email, newPassword } = req.body;

      // Validation
      if (!email || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Email et nouveau mot de passe requis'
        });
      }

      // Validate password strength
      const passwordError = validatePassword(newPassword);
      if (passwordError) {
        return res.status(400).json({
          success: false,
          message: passwordError
        });
      }

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Aucun utilisateur trouvé avec cet email'
        });
      }

      // Update password (will be hashed by the User model pre-save hook)
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Mot de passe réinitialisé avec succès'
      });

    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la réinitialisation du mot de passe'
      });
    }
  }
};

module.exports = authController;
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { TRAIT_DIMENSIONS } = require('./Job');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  scoring: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  // Profil utilisateur enrichi
  age: {
    type: Number,
    min: 14,
    max: 99
  },
  location: {
    type: String,
    trim: true
  },
  currentSituation: {
    type: String,
    enum: ['employed', 'student', 'unemployed', 'self-employed', 'other'],
    // employed = en poste, student = en formation, unemployed = au chômage, self-employed = indépendant
  },
  currentJob: {
    type: String,
    trim: true
  },
  currentJobFeeling: {
    type: String,
    enum: ['love', 'like', 'neutral', 'dislike', 'hate', 'burnout'],
    // love = adore mon métier, like = satisfait, neutral = ni bien ni mal,
    // dislike = insatisfait, hate = déteste, burnout = épuisé/en souffrance
  },
  education: {
    type: String,
    enum: ['middle_school', 'high_school', 'bac', 'bac_plus_2', 'bac_plus_3', 'bac_plus_5', 'phd', 'other'],
    // middle_school = collège, high_school = lycée, bac = baccalauréat, bac_plus_2 = BTS/DUT,
    // bac_plus_3 = Licence, bac_plus_5 = Master, phd = Doctorat
  },
  targetJob: {
    type: String,
    trim: true,
    default: null
  },
  traitVector: {
    type: Map,
    of: Number,
    default: () => {
      const vector = new Map();
      TRAIT_DIMENSIONS.forEach(trait => vector.set(trait, 0));
      return vector;
    },
    validate: {
      validator: function(vector) {
        return Array.from(vector.values()).every(val => val >= 0);
      },
      message: 'Trait vector values must be non-negative'
    }
  },
  responses: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    answer: String,
    traitsAwarded: [String],
    timestamp: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Transform output to exclude password
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
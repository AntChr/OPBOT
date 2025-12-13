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
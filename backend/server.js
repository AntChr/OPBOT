const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const { apiLimiter } = require('./src/middleware/rateLimiters');

dotenv.config();
const app = express();

// Security headers
app.use(helmet());

// Trust proxy for Railway deployment (needed for rate limiting)
app.set('trust proxy', 1);

// CORS configuration - restrictive
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Request size limits to prevent DoS attacks
app.use(express.json({ charset: 'utf-8', limit: '10kb' }));
app.use(express.urlencoded({ extended: true, charset: 'utf-8', limit: '10kb' }));

// General API rate limiting (100 req/15min)
app.use('/api/', apiLimiter);

// Connexion Mongo
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ Mongo error:", err));

// Routes
const authRoutes = require('./src/routes/auth.js');
const conversationRoutes = require('./src/routes/conversations.js');
const jobsRoutes = require('./src/routes/jobs.js');
const phase2Routes = require('./src/routes/phase2.js');
const questionnaireRoutes = require('./src/routes/questionnaire.js');
const actionPlanRoutes = require('./src/routes/actionPlan.js');

// Auth routes have their own specific rate limiters defined in auth.js
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/phase2', phase2Routes);
app.use('/api/questionnaire', questionnaireRoutes);
app.use('/api/action-plan', actionPlanRoutes);

// Routes test
app.get("/", (req, res) => res.send("API is working"));

// Route de test O*NET
app.get("/api/test/onet", async (req, res) => {
  try {
    const CareerApiService = require('./src/services/careerApiService');
    const apiService = new CareerApiService();

    const occupations = await apiService.getONetOccupations(5);

    res.json({
      success: true,
      message: 'O*NET API fonctionne!',
      occupationsCount: occupations.length,
      sample: occupations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

// Route pour vérifier les métiers importés dans MongoDB
app.get("/api/test/jobs", async (req, res) => {
  try {
    const Job = require('./src/models/Job');

    const totalJobs = await Job.countDocuments();
    const onetJobs = await Job.countDocuments({ source: 'onet' });
    const sampleJobs = await Job.find({ source: 'onet' }).limit(3);

    res.json({
      success: true,
      message: 'Métiers disponibles dans MongoDB',
      stats: {
        total: totalJobs,
        onet: onetJobs
      },
      sample: sampleJobs.map(job => ({
        title: job.title,
        description: job.description.substring(0, 100) + '...',
        skills: job.skills.slice(0, 3),
        traits: Array.from(job.traitVector.entries()).filter(([k, v]) => v > 0)
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});



const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => console.log(`🚀 Server running on ${HOST}:${PORT}`));
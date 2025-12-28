const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Job = require('../models/Job');
const NLPService = require('./NLPService');
const QuestionGenerator = require('./QuestionGenerator');
const VectorMatchingService = require('./matchingService');
const ClaudeService = require('./ClaudeService');
const { v4: uuidv4 } = require('uuid');

class ConversationService {
  constructor() {
    this.nlpService = new NLPService();
    this.questionGenerator = new QuestionGenerator();
    this.vectorMatcher = new VectorMatchingService();
    this.claudeService = new ClaudeService();

    // Vérifier si Claude AI est disponible
    this.useClaudeAI = this.claudeService.isAvailable();

    if (!this.useClaudeAI) {
      console.warn('⚠️ Claude AI non disponible, utilisation du système NLP de base');
    }
  }

  /**
   * Démarrer une nouvelle conversation (ferme l'ancienne si elle existe)
   */
  async startConversation(userId, metadata = {}) {
    try {
      // Fermer/abandonner toute conversation active existante
      const existingConversation = await Conversation.findActiveConversation(userId);

      if (existingConversation) {
        // Marquer l'ancienne comme abandonnée pour forcer une nouvelle
        existingConversation.status = 'abandoned';
        existingConversation.completedAt = new Date();
        await existingConversation.save();
      }

      // Créer une nouvelle conversation
      const conversation = new Conversation({
        userId,
        sessionId: uuidv4(),
        currentPhase: {
          name: 'intro',
          progress: 0.0,
          nextObjective: 'Faire connaissance et explorer les intérêts généraux',
          questionsAsked: 0,
          targetQuestions: 9999 // Pas de limite
        },
        metadata: {
          platform: metadata.platform || 'web',
          userAgent: metadata.userAgent,
          referrer: metadata.referrer
        },
        messages: [] // Initialiser le tableau de messages
      });

      // Générer le message de bienvenue
      const welcomeMessage = await this.generateWelcomeMessage();
      conversation.messages.push(welcomeMessage);
      conversation.lastActiveAt = new Date();

      return await conversation.save();

    } catch (error) {
      console.error('❌ ERREUR startConversation:', error.message);
      console.error('Stack:', error.stack);
      throw new Error(`Impossible de démarrer la conversation: ${error.message}`);
    }
  }

  /**
   * Traiter un message utilisateur
   */
  async processUserMessage(conversationId, userMessage, metadata = {}) {
    try {
      const conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        console.error('❌ Conversation non trouvée');
        throw new Error('Conversation non trouvée');
      }

      if (conversation.status !== 'active') {
        console.error(`❌ Conversation non active (status: ${conversation.status})`);
        throw new Error('La conversation n\'est plus active');
      }

      // Nettoyer les anciens messages qui pourraient avoir des données invalides
      conversation.messages.forEach((msg, index) => {
        if (msg.analysis) {
          // Si l'analyse a des données invalides, les nettoyer
          if (typeof msg.analysis.detectedConstraints === 'string') {
            try {
              msg.analysis.detectedConstraints = JSON.parse(msg.analysis.detectedConstraints);
            } catch (e) {
              msg.analysis.detectedConstraints = [];
            }
          }
          if (!Array.isArray(msg.analysis.detectedConstraints)) {
            msg.analysis.detectedConstraints = [];
          }
          if (!Array.isArray(msg.analysis.detectedInterests)) {
            msg.analysis.detectedInterests = [];
          }
          if (!Array.isArray(msg.analysis.detectedValues)) {
            msg.analysis.detectedValues = [];
          }
          if (!Array.isArray(msg.analysis.extractedTraits)) {
            msg.analysis.extractedTraits = [];
          }
          if (!Array.isArray(msg.analysis.keyTopics)) {
            msg.analysis.keyTopics = [];
          }
        }
      });

      // 1. Analyser le message (Claude AI ou NLP fallback)
      let analysis;
      let rawAnalysis;

      if (this.useClaudeAI) {
        try {
          // Claude AI analysera le message lors de la génération de la réponse
          // Pour l'instant, on utilise NLP comme analyse préliminaire
          rawAnalysis = await this.nlpService.analyzeUserMessage(
            userMessage,
            {
              phase: conversation.currentPhase.name,
              detectedTraits: conversation.buildingProfile.detectedTraits,
              questionsAsked: conversation.currentPhase.questionsAsked
            }
          );
          analysis = this.sanitizeAnalysis(rawAnalysis);
        } catch (error) {
          console.error('❌ Erreur analyse, fallback sur NLP de base:', error.message);
          this.useClaudeAI = false; // Désactiver temporairement
          rawAnalysis = await this.nlpService.analyzeUserMessage(userMessage, {});
          analysis = this.sanitizeAnalysis(rawAnalysis);
        }
      } else {
        // Fallback: utiliser NLP de base
        rawAnalysis = await this.nlpService.analyzeUserMessage(
          userMessage,
          {
            phase: conversation.currentPhase.name,
            detectedTraits: conversation.buildingProfile.detectedTraits,
            questionsAsked: conversation.currentPhase.questionsAsked
          }
        );
        analysis = this.sanitizeAnalysis(rawAnalysis);
      }

      // 3. Créer le message utilisateur avec l'analyse nettoyée
      const userMessageObj = {
        id: uuidv4(),
        role: 'user',
        content: userMessage.trim(),
        timestamp: new Date(),
        analysis: analysis
      };

      // 4. Ajouter le message à la conversation
      try {
        conversation.messages.push(userMessageObj);
      } catch (pushError) {
        console.error('❌ Erreur lors du push du message:', pushError);
        throw pushError;
      }

      conversation.lastActiveAt = new Date();

      // 5. Mettre à jour le profil utilisateur
      await this.updateBuildingProfile(conversation, analysis, userMessageObj.id);

      // 6. Mettre à jour les métriques de qualité
      await this.updateConversationQuality(conversation, analysis);

      // 7. Générer les recommandations SEULEMENT si assez d'informations collectées
      // Critères: au moins 8 messages OU phase de conclusion OU 3+ intérêts à niveau 3+
      const messageCount = conversation.messages.length;
      const strongInterests = conversation.buildingProfile.interests.filter(i => i.level >= 3);
      const shouldGenerateRecommendations =
        messageCount >= 8 ||
        conversation.currentPhase.phase === 'conclusion' ||
        strongInterests.length >= 3;

      if (shouldGenerateRecommendations && messageCount % 2 === 0) {
        // Générer recommandations tous les 2 messages seulement
        await this.generateJobRecommendations(conversation);
      }

      // 8. Générer la réponse de l'assistant
      const assistantResponse = await this.generateAssistantResponse(conversation);

      // 8.4 DÉTECTER LES CONFIRMATIONS UTILISATEUR
      // Si un milestone attend confirmation, analyser la réponse utilisateur
      const pendingMilestone = this.findPendingConfirmationMilestone(conversation.milestones);
      if (pendingMilestone) {
        const userConfirmed = this.detectUserConfirmation(userMessage);

        if (userConfirmed === true) {
          conversation.milestones[pendingMilestone.name].confirmed = true;
          conversation.milestones[pendingMilestone.name].needsConfirmation = false;
        } else if (userConfirmed === false) {
          conversation.milestones[pendingMilestone.name].needsConfirmation = false;
          conversation.milestones[pendingMilestone.name].confidence = Math.max(0, conversation.milestones[pendingMilestone.name].confidence - 20);
          // Ne pas marquer comme achieved si l'utilisateur a rejeté
          if (userConfirmed === false) {
            conversation.milestones[pendingMilestone.name].achieved = false;
          }
        }
      }

      // 8.5 TRAITER LES MILESTONES retournés par Claude
      if (assistantResponse.milestones) {
        await this.updateMilestones(conversation, assistantResponse.milestones);
      }

      // 9. Ajouter la réponse à la conversation (et incrémenter questionsAsked)
      conversation.messages.push(assistantResponse);
      conversation.currentPhase.questionsAsked += 1;
      conversation.lastActiveAt = new Date();

      // 10. Vérifier si Claude demande une transition de phase
      if (assistantResponse.metadata?.followUpPlan === 'transition' ||
          conversation.currentPhase.questionsAsked >= 12 ||
          (strongInterests.length >= 3 && conversation.currentPhase.questionsAsked >= 8)) {

        // Transition vers conclusion si pas déjà en conclusion
        if (conversation.currentPhase.phase !== 'conclusion') {
          conversation.currentPhase.phase = 'conclusion';
          conversation.currentPhase.questionsAsked = 0;
        } else {
          // Déjà en conclusion, on termine la conversation
          conversation.status = 'completed';
          conversation.completedAt = new Date();
        }
      }

      // 11. Mettre à jour la phase si nécessaire
      conversation.updateProgress();

      // 11. Sauvegarder
      conversation.lastActiveAt = new Date();
      await conversation.save();

      // 12. LOGS ESSENTIELS POUR TESTS UTILISATEUR
      this.logConversationMetrics(conversation);

      return conversation;

    } catch (error) {
      console.error('\n❌ ERREUR TRAITEMENT MESSAGE');
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      console.error('='.repeat(80) + '\n');
      throw new Error('Impossible de traiter le message');
    }
  }

  /**
   * Obtenir une conversation par ID
   */
  async getConversation(conversationId) {
    try {
      const conversation = await Conversation.findById(conversationId)
        .populate('userId', 'name email')
        .populate('jobRecommendations.jobId');

      return conversation;

    } catch (error) {
      console.error('Erreur lors de la récupération de conversation:', error);
      throw new Error('Impossible de récupérer la conversation');
    }
  }

  /**
   * Obtenir les conversations d'un utilisateur
   */
  async getUserConversations(userId, limit = 10) {
    try {
      const conversations = await Conversation.find({ userId })
        .sort({ lastActiveAt: -1 })
        .limit(limit)
        .select('sessionId currentPhase status startedAt lastActiveAt quality');

      return conversations;

    } catch (error) {
      console.error('Erreur lors de la récupération des conversations:', error);
      throw new Error('Impossible de récupérer les conversations');
    }
  }

  /**
   * Terminer une conversation
   */
  async completeConversation(conversationId, userFeedback = {}) {
    try {
      const conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        throw new Error('Conversation non trouvée');
      }

      // Calculer la durée totale
      const duration = Math.round((new Date() - conversation.startedAt) / 60000); // en minutes

      // Mettre à jour le statut et les métriques
      conversation.status = 'completed';
      conversation.completedAt = new Date();
      conversation.metadata.totalDuration = duration;
      conversation.quality.userSatisfaction = userFeedback.satisfaction || null;

      // Générer le résumé final si pas encore fait
      if (conversation.jobRecommendations.length === 0) {
        await this.generateJobRecommendations(conversation);
      }

      // Sauvegarder le profil final dans l'utilisateur
      await this.saveFinalProfileToUser(conversation);

      await conversation.save();

      // Log final de la session
      this.logConversationMetrics(conversation);

      return conversation;

    } catch (error) {
      console.error('Erreur lors de la finalisation de conversation:', error);
      throw new Error('Impossible de finaliser la conversation');
    }
  }

  /**
   * Mettre à jour les milestones en fonction de la détection de Claude
   */
  async updateMilestones(conversation, detectedMilestones) {
    try {
      if (!conversation.milestones) {
        conversation.milestones = {};
      }

      let newMilestonesCount = 0;

      // Ordre des milestones
      const milestoneOrder = [
        'passions_identified',
        'role_determined',
        'domain_identified',
        'format_determined',
        'specific_job_identified'
      ];

      // Trouver le dernier milestone confirmé
      let lastConfirmedIndex = -1;
      for (let i = 0; i < milestoneOrder.length; i++) {
        const milestoneName = milestoneOrder[i];
        if (conversation.milestones[milestoneName]?.confirmed) {
          lastConfirmedIndex = i;
        }
      }

      console.log(`   📍 Dernier milestone confirmé: ${lastConfirmedIndex >= 0 ? milestoneOrder[lastConfirmedIndex] : 'aucun'}`);

      // Mettre à jour chaque milestone détecté (dans l'ordre)
      for (let i = 0; i < milestoneOrder.length; i++) {
        const milestoneName = milestoneOrder[i];
        const detected = detectedMilestones[milestoneName];

        if (!detected) continue;

        // Vérifier l'ordre séquentiel ASSOUPLI
        // Milestones 1-3: strict (doivent être confirmés dans l'ordre)
        // Milestones 4-5: acceptés si milestone 3 est confirmé
        const requiresStrictOrder = i <= 2; // passions, role, domain

        if (requiresStrictOrder && i > lastConfirmedIndex + 1) {
          console.log(`   ⚠️ Milestone ${i + 1} (${milestoneName}) détecté mais milestone ${lastConfirmedIndex + 2} n'est pas encore confirmé. Ignoré.`);
          continue;
        }

        // Pour milestones 4-5, vérifier que milestone 3 (domain) est confirmé
        if (!requiresStrictOrder && lastConfirmedIndex < 2) {
          console.log(`   ⚠️ Milestone ${i + 1} (${milestoneName}) détecté mais milestone 3 (domain_identified) n'est pas encore confirmé. Ignoré.`);
          continue;
        }

        const current = conversation.milestones[milestoneName] || {};
        const confidence = detected.confidence || 0;
        const needsConfirmation = detected.needsConfirmation || false;

        // Cas 1: Milestone 1 (passions_identified)
        if (milestoneName === 'passions_identified') {
          if (detected.achieved !== undefined) {
            const isNew = !current.achieved;
            // Si needsConfirmation = false, auto-confirmer. Sinon, garder l'état actuel
            const autoConfirm = !needsConfirmation;
            conversation.milestones.passions_identified = {
              achieved: detected.achieved,
              achievedAt: isNew && detected.achieved ? new Date() : current.achievedAt,
              confidence,
              needsConfirmation,
              confirmed: autoConfirm ? true : (current.confirmed || false)
            };
            if (isNew && detected.achieved) {
              console.log(`   ✨ [NOUVEAU] Milestone 1: Passions identifiées (confiance: ${confidence}%)`);
              if (autoConfirm) {
                console.log(`   ✅ Auto-confirmé (needsConfirmation: false)`);
              }
              newMilestonesCount++;
            } else if (confidence !== current.confidence) {
              console.log(`   🔄 Milestone 1: Confiance mise à jour: ${current.confidence}% → ${confidence}%`);
            }
            if (needsConfirmation && !current.needsConfirmation) {
              console.log(`   ❓ Milestone 1: Demande de confirmation activée`);
            }
          }
        }

        // Cas 2-4: Milestones avec value
        else if (['role_determined', 'domain_identified', 'format_determined'].includes(milestoneName)) {
          if (detected.achieved !== undefined) {
            const isNew = !current.achieved;
            // Si needsConfirmation = false, auto-confirmer. Sinon, garder l'état actuel
            const autoConfirm = !needsConfirmation;
            conversation.milestones[milestoneName] = {
              achieved: detected.achieved,
              achievedAt: isNew && detected.achieved ? new Date() : current.achievedAt,
              value: detected.value || current.value,
              confidence,
              needsConfirmation,
              confirmed: autoConfirm ? true : (current.confirmed || false)
            };
            if (isNew && detected.achieved) {
              console.log(`   ✨ [NOUVEAU] Milestone ${i + 1}: ${milestoneName} - "${detected.value}" (confiance: ${confidence}%)`);
              if (autoConfirm) {
                console.log(`   ✅ Auto-confirmé (needsConfirmation: false)`);
              }
              newMilestonesCount++;
            } else if (confidence !== current.confidence) {
              console.log(`   🔄 Milestone ${i + 1}: Confiance mise à jour: ${current.confidence}% → ${confidence}%`);
            }
            if (needsConfirmation && !current.needsConfirmation) {
              console.log(`   ❓ Milestone ${i + 1}: Demande de confirmation activée`);
            }
          }
        }

        // Cas 5: specific_job_identified
        else if (milestoneName === 'specific_job_identified') {
          if (detected.achieved !== undefined) {
            const isNew = !current.achieved;
            // Si needsConfirmation = false, auto-confirmer. Sinon, garder l'état actuel
            const autoConfirm = !needsConfirmation;
            conversation.milestones.specific_job_identified = {
              achieved: detected.achieved,
              achievedAt: isNew && detected.achieved ? new Date() : current.achievedAt,
              jobTitle: detected.jobTitle || current.jobTitle,
              jobDescription: detected.description || current.jobDescription || '',
              conclusionMessage: detected.conclusionMessage || current.conclusionMessage,
              confidence,
              needsConfirmation,
              confirmed: autoConfirm ? true : (current.confirmed || false)
            };
            if (isNew && detected.achieved) {
              console.log(`\n🏆 [NOUVEAU] MILESTONE 5 FINAL ATTEINT!`);
              console.log(`   💼 Métier: "${detected.jobTitle}"`);
              console.log(`   📊 Confiance: ${confidence}%`);
              console.log(`   💬 Message épique: "${detected.conclusionMessage}"`);
              if (autoConfirm) {
                console.log(`   ✅ Auto-confirmé (needsConfirmation: false)`);
              }

              // Sauvegarder le métier cible dans le profil utilisateur
              if (detected.jobTitle) {
                await User.findByIdAndUpdate(
                  conversation.userId,
                  { $set: { targetJob: detected.jobTitle } },
                  { new: true }
                );
                console.log(`   💾 Métier cible sauvegardé dans le profil utilisateur`);
              }

              newMilestonesCount++;
            } else if (confidence !== current.confidence) {
              console.log(`   🔄 Milestone 5: Confiance mise à jour: ${current.confidence}% → ${confidence}%`);
            }
            if (needsConfirmation && !current.needsConfirmation) {
              console.log(`   ❓ Milestone 5: Demande de confirmation activée`);
            }
          }
        }
      }

      console.log(`\n   📊 Résumé: ${newMilestonesCount} nouveau(x) milestone(s) atteint(s)`);

      // Afficher l'état complet des milestones
      const totalAchieved = Object.values(conversation.milestones).filter(m => m.achieved).length;
      const totalConfirmed = Object.values(conversation.milestones).filter(m => m.confirmed).length;
      console.log(`   🎯 Total milestones: ${totalAchieved}/5 atteints | ${totalConfirmed}/5 confirmés`);

    } catch (error) {
      console.error('❌ Erreur mise à jour milestones:', error);
      console.error('   Stack:', error.stack);
    }
  }

  /**
   * Trouver le milestone en attente de confirmation
   */
  findPendingConfirmationMilestone(milestones) {
    if (!milestones) return null;

    const milestoneOrder = [
      'passions_identified',
      'role_determined',
      'domain_identified',
      'format_determined',
      'specific_job_identified'
    ];

    for (const name of milestoneOrder) {
      const m = milestones[name];
      if (m && m.needsConfirmation && !m.confirmed) {
        return { name, milestone: m };
      }
    }

    return null;
  }

  /**
   * Détecter si l'utilisateur confirme ou rejette dans sa réponse
   * @returns {boolean|null} true = confirmation, false = rejet, null = incertain
   */
  detectUserConfirmation(userMessage) {
    const msg = userMessage.toLowerCase().trim();

    // Patterns de confirmation
    const confirmationPatterns = [
      /^oui/,
      /^yes/,
      /^ouais/,
      /^exact/,
      /c'est ça/,
      /tout à fait/,
      /absolument/,
      /bien sûr/,
      /évidemment/,
      /parfait/,
      /correct/,
      /d'accord/,
      /ok/,
      /👍/,
      /✓/
    ];

    // Patterns de rejet
    const rejectionPatterns = [
      /^non/,
      /^pas vraiment/,
      /^pas exactement/,
      /je préfère/,
      /plutôt/,
      /en fait/,
      /pas tellement/,
      /pas du tout/,
      /je dirais plutôt/,
      /ça serait plus/
    ];

    // Vérifier les confirmations
    for (const pattern of confirmationPatterns) {
      if (pattern.test(msg)) {
        return true;
      }
    }

    // Vérifier les rejets
    for (const pattern of rejectionPatterns) {
      if (pattern.test(msg)) {
        return false;
      }
    }

    // Incertain
    return null;
  }

  /**
   * Logger les métriques essentielles pour les tests utilisateur
   */
  logConversationMetrics(conversation) {
    const duration = Math.round((new Date() - conversation.startedAt) / 1000); // en secondes
    const totalMessages = conversation.messages.length;
    const userMessages = conversation.messages.filter(m => m.role === 'user').length;
    const assistantMessages = conversation.messages.filter(m => m.role === 'assistant').length;

    // Calculer le total de tokens utilisés
    let totalTokens = { input: 0, output: 0, total: 0 };
    conversation.messages.forEach(msg => {
      if (msg.metadata?.tokensUsed) {
        totalTokens.input += msg.metadata.tokensUsed.input_tokens || 0;
        totalTokens.output += msg.metadata.tokensUsed.output_tokens || 0;
      }
    });
    totalTokens.total = totalTokens.input + totalTokens.output;

    // Compter les milestones confirmés
    let milestonesConfirmed = 0;
    let milestonesAchieved = 0;
    if (conversation.milestones) {
      Object.values(conversation.milestones).forEach(m => {
        if (m.confirmed) milestonesConfirmed++;
        if (m.achieved) milestonesAchieved++;
      });
    }

    console.log(`\n📊 MÉTRIQUES SESSION`);
    console.log(`   ⏱️  Durée: ${Math.floor(duration / 60)}m ${duration % 60}s`);
    console.log(`   💬 Messages: ${totalMessages} total (${userMessages} user | ${assistantMessages} assistant)`);
    console.log(`   🎯 Milestones: ${milestonesAchieved}/5 atteints | ${milestonesConfirmed}/5 confirmés`);
    console.log(`   🪙 Tokens: ${totalTokens.total.toLocaleString()} total (${totalTokens.input.toLocaleString()} in | ${totalTokens.output.toLocaleString()} out)`);

    // Si milestone 5 atteint, noter le succès
    if (conversation.milestones?.specific_job_identified?.achieved) {
      console.log(`   🎉 SUCCÈS: Métier identifié "${conversation.milestones.specific_job_identified.jobTitle}"`);
    }
  }

  /**
   * Méthodes privées
   */

  sanitizeAnalysis(rawAnalysis) {
    console.log('🧹 Sanitizing analysis...');
    console.log('detectedConstraints type:', typeof rawAnalysis.detectedConstraints);
    console.log('detectedConstraints value:', rawAnalysis.detectedConstraints);

    const sanitized = {
      extractedTraits: [],
      detectedInterests: [],
      detectedValues: [],
      detectedConstraints: [],
      emotionalTone: rawAnalysis.emotionalTone || 'neutral',
      keyTopics: [],
      engagementLevel: rawAnalysis.engagementLevel || 3,
      responseLength: rawAnalysis.responseLength || 0,
      wordCount: rawAnalysis.wordCount || 0
    };

    // Nettoyer extractedTraits
    if (Array.isArray(rawAnalysis.extractedTraits)) {
      sanitized.extractedTraits = rawAnalysis.extractedTraits;
    } else if (typeof rawAnalysis.extractedTraits === 'string') {
      try {
        sanitized.extractedTraits = JSON.parse(rawAnalysis.extractedTraits);
      } catch (e) {
        console.warn('⚠️ extractedTraits parsing failed:', e.message);
      }
    }

    // Nettoyer detectedInterests
    if (Array.isArray(rawAnalysis.detectedInterests)) {
      sanitized.detectedInterests = rawAnalysis.detectedInterests;
    } else if (typeof rawAnalysis.detectedInterests === 'string') {
      try {
        sanitized.detectedInterests = JSON.parse(rawAnalysis.detectedInterests);
      } catch (e) {
        console.warn('⚠️ detectedInterests parsing failed:', e.message);
      }
    }

    // Nettoyer detectedValues
    if (Array.isArray(rawAnalysis.detectedValues)) {
      sanitized.detectedValues = rawAnalysis.detectedValues;
    } else if (typeof rawAnalysis.detectedValues === 'string') {
      try {
        sanitized.detectedValues = JSON.parse(rawAnalysis.detectedValues);
      } catch (e) {
        console.warn('⚠️ detectedValues parsing failed:', e.message);
      }
    }

    // Nettoyer detectedConstraints - LE PLUS IMPORTANT
    if (Array.isArray(rawAnalysis.detectedConstraints)) {
      sanitized.detectedConstraints = rawAnalysis.detectedConstraints;
      console.log('✅ detectedConstraints est un array valide');
    } else if (typeof rawAnalysis.detectedConstraints === 'string') {
      console.warn('⚠️ detectedConstraints est une string, tentative de parsing...');
      try {
        sanitized.detectedConstraints = JSON.parse(rawAnalysis.detectedConstraints);
        console.log('✅ Parsing réussi:', sanitized.detectedConstraints);
      } catch (e) {
        console.error('❌ detectedConstraints parsing failed:', e.message);
        sanitized.detectedConstraints = [];
      }
    } else {
      console.warn('⚠️ detectedConstraints type invalide:', typeof rawAnalysis.detectedConstraints);
    }

    // Nettoyer keyTopics
    if (Array.isArray(rawAnalysis.keyTopics)) {
      sanitized.keyTopics = rawAnalysis.keyTopics;
    } else if (typeof rawAnalysis.keyTopics === 'string') {
      try {
        sanitized.keyTopics = JSON.parse(rawAnalysis.keyTopics);
      } catch (e) {
        console.warn('⚠️ keyTopics parsing failed:', e.message);
      }
    }

    console.log('✅ Analysis sanitized successfully');
    return sanitized;
  }

  async generateWelcomeMessage() {
    // Nouveaux messages concrets et spécifiques (plus pas de "qu'est-ce qui vous passionne")
    const welcomeQuestions = [
      {
        text: "Salut ! 👋 Je suis ici pour vous aider à explorer les métiers qui pourraient vraiment vous convenir. Pour bien commencer : qu'est-ce qui vous plaît vraiment dans un travail ? Par exemple : travailler avec les gens, les animaux, vos mains, créer, résoudre des problèmes, diriger une équipe... Qu'est-ce qui vous attire le plus ?",
        type: 'discovery',
        strategy: 'specific',
        followUp: 'explore_passion',
        expectedResponse: 'general_interests'
      },
      {
        text: "Salut ! 👋 Bienvenue ! Je sais que trouver le bon métier peut être difficile. Commençons par ce que vous savez déjà : y a-t-il un domaine ou un type d'environnement qui vous attire ? Par exemple : la nature, les animaux, l'informatique, les gens, créer des choses, résoudre des problèmes, ou même quelque chose que vous faites déjà et qui vous plaît ?",
        type: 'discovery',
        strategy: 'specific',
        followUp: 'explore_domains',
        expectedResponse: 'domain_interests'
      },
      {
        text: "Salut ! 👋 Pas facile de savoir ce qu'on veut faire, je comprends ! Allons à l'inverse : y a-t-il un type de travail que vous seriez sûr de ne PAS vouloir ? Par exemple : rester assis toute la journée, travailler seul, avoir trop de responsabilités, horaires très fixes... Qu'est-ce que vous aimeriez vraiment éviter dans un futur métier ?",
        type: 'discovery',
        strategy: 'specific',
        followUp: 'explore_constraints',
        expectedResponse: 'constraints_dislikes'
      }
    ];

    const selected = welcomeQuestions[Math.floor(Math.random() * welcomeQuestions.length)];

    return {
      id: uuidv4(),
      role: 'assistant',
      content: selected.text,
      timestamp: new Date(),
      metadata: {
        questionType: selected.type,
        strategy: selected.strategy,
        followUpPlan: selected.followUp,
        expectedResponseType: selected.expectedResponse
      }
    };
  }

  async generateAssistantResponse(conversation) {
    try {
      const context = {
        phase: conversation.currentPhase,
        profile: conversation.buildingProfile,
        history: conversation.messages,
        jobRecommendations: conversation.jobRecommendations,
        questionsAsked: conversation.currentPhase.questionsAsked,
        milestones: conversation.milestones || {},
        lastUserMessage: conversation.messages
          .filter(m => m.role === 'user')
          .pop()
      };

      // Utiliser Claude AI si disponible
      if (this.useClaudeAI) {
        try {
          console.log('🤖 Génération de réponse avec Claude AI...');
          const claudeResponse = await this.claudeService.generateConversationalResponse(context);

          // Mettre à jour le profil avec les insights de Claude
          if (claudeResponse.extractedInsights) {
            await this.updateProfileFromClaudeInsights(conversation, claudeResponse.extractedInsights);
          }

          // Sauvegarder les données de profil utilisateur (âge, lieu, situation)
          if (claudeResponse.profileData) {
            await this.updateUserProfileData(conversation.userId, claudeResponse.profileData);
          }

          return {
            id: uuidv4(),
            role: 'assistant',
            content: claudeResponse.message,
            timestamp: new Date(),
            metadata: {
              questionType: 'claude_generated',
              strategy: 'ai_conversational',
              model: claudeResponse.metadata?.model || 'claude',
              tokensUsed: claudeResponse.metadata?.tokensUsed,
              confidence: claudeResponse.metadata?.confidence || 0.85,
              followUpPlan: claudeResponse.shouldTransitionPhase ? 'transition' : 'continue'
            },
            milestones: claudeResponse.milestones || {}
          };

        } catch (error) {
          console.error('❌ Erreur Claude AI, fallback sur QuestionGenerator:', error.message);
          this.useClaudeAI = false; // Désactiver temporairement
          return await this.questionGenerator.generateNext(context);
        }
      } else {
        // Fallback: utiliser le générateur de questions basé sur des règles
        return await this.questionGenerator.generateNext(context);
      }

    } catch (error) {
      console.error('Erreur lors de la génération de réponse:', error);

      // Réponse de fallback ultime
      return {
        id: uuidv4(),
        role: 'assistant',
        content: "C'est très intéressant ! Pouvez-vous m'en dire plus ?",
        timestamp: new Date(),
        metadata: {
          questionType: 'follow_up',
          strategy: 'fallback',
          followUpPlan: 'continue'
        }
      };
    }
  }

  /**
   * Met à jour le profil utilisateur à partir des insights de Claude AI
   */
  async updateProfileFromClaudeInsights(conversation, insights) {
    try {
      if (!insights) return;

      const profile = conversation.buildingProfile;

      // Traits détectés par Claude
      if (insights.traits && Array.isArray(insights.traits)) {
        for (const traitData of insights.traits) {
          conversation.updateTraitScore(
            traitData.name,
            traitData.confidence,
            traitData.confidence,
            'claude_ai'
          );
        }
      }

      // Intérêts détectés par Claude
      if (insights.interests && Array.isArray(insights.interests)) {
        for (const interest of insights.interests) {
          const existingInterest = profile.interests.find(i => i.domain === interest.domain);

          if (existingInterest) {
            const increment = interest.confidence > 0.7 ? 1.5 : 1;
            const oldLevel = existingInterest.level;
            existingInterest.level = Math.min(5, existingInterest.level + increment);
            console.log(`  📈 ${interest.domain}: niv ${oldLevel.toFixed(1)} → ${existingInterest.level.toFixed(1)}`);
          } else {
            const initialLevel = Math.max(2, Math.round(interest.confidence * 5));
            profile.interests.push({
              domain: interest.domain,
              level: initialLevel,
              context: interest.evidence || '',
              discoveredAt: new Date()
            });
            console.log(`  ✨ Nouvel intérêt détecté: ${interest.domain} (niv ${initialLevel})`);
          }
        }
      }

      // Valeurs détectées par Claude
      if (insights.values && Array.isArray(insights.values)) {
        for (const value of insights.values) {
          const existingValue = profile.values.find(v => v.value === value.value);

          if (!existingValue) {
            profile.values.push({
              value: value.value,
              importance: Math.round(value.confidence * 5),
              context: value.evidence || ''
            });
            console.log(`  ✨ Nouvelle valeur: ${value.value}`);
          }
        }
      }

      // Contraintes détectées par Claude
      if (insights.constraints && Array.isArray(insights.constraints)) {
        for (const constraint of insights.constraints) {
          // Vérifier si la contrainte est valide
          if (!constraint || typeof constraint !== 'object') {
            console.warn(`  ⚠️ Contrainte invalide:`, constraint);
            continue;
          }

          const constraintType = typeof constraint === 'string' ? constraint : constraint.type;
          const exists = profile.constraints.some(c => c.type === constraintType);

          if (!exists) {
            // Créer l'objet contrainte correct pour Mongoose
            const constraintObj = typeof constraint === 'string'
              ? { type: constraint, description: '', flexibility: 3 }
              : {
                  type: constraint.type || 'other',
                  description: constraint.description || '',
                  flexibility: constraint.flexibility || 3,
                  impact: constraint.impact || 'preferential'
                };

            profile.constraints.push(constraintObj);
            console.log(`  ✨ Nouvelle contrainte: ${constraintObj.type}`);
          }
        }
      }

    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du profil depuis Claude:', error);
    }
  }

  /**
   * Mettre à jour les données de profil utilisateur (âge, lieu, situation)
   */
  async updateUserProfileData(userId, profileData) {
    try {
      if (!profileData || Object.keys(profileData).length === 0) return;

      const updateFields = {};

      // Âge
      if (profileData.age && typeof profileData.age === 'number') {
        updateFields.age = profileData.age;
        console.log(`  👤 Âge détecté: ${profileData.age} ans`);
      }

      // Localisation
      if (profileData.location && typeof profileData.location === 'string') {
        updateFields.location = profileData.location.trim();
        console.log(`  📍 Localisation détectée: ${profileData.location}`);
      }

      // Situation actuelle
      if (profileData.currentSituation && typeof profileData.currentSituation === 'string') {
        const validSituations = ['employed', 'student', 'unemployed', 'self-employed', 'other'];
        if (validSituations.includes(profileData.currentSituation)) {
          updateFields.currentSituation = profileData.currentSituation;
          console.log(`  💼 Situation détectée: ${profileData.currentSituation}`);
        }
      }

      // Métier actuel (si en poste)
      if (profileData.currentJob && typeof profileData.currentJob === 'string') {
        updateFields.currentJob = profileData.currentJob.trim();
        console.log(`  🏢 Métier actuel détecté: ${profileData.currentJob}`);
      }

      // Ressenti métier actuel (si en poste)
      if (profileData.currentJobFeeling && typeof profileData.currentJobFeeling === 'string') {
        const validFeelings = ['love', 'like', 'neutral', 'dislike', 'hate', 'burnout'];
        if (validFeelings.includes(profileData.currentJobFeeling)) {
          updateFields.currentJobFeeling = profileData.currentJobFeeling;
          const emojis = {
            love: '😍',
            like: '😊',
            neutral: '😐',
            dislike: '😕',
            hate: '😠',
            burnout: '😰'
          };
          console.log(`  ${emojis[profileData.currentJobFeeling]} Ressenti métier détecté: ${profileData.currentJobFeeling}`);
        }
      }

      // Niveau d'études
      if (profileData.education && typeof profileData.education === 'string') {
        const validEducation = ['middle_school', 'high_school', 'bac', 'bac_plus_2', 'bac_plus_3', 'bac_plus_5', 'phd', 'other'];
        if (validEducation.includes(profileData.education)) {
          updateFields.education = profileData.education;
          console.log(`  🎓 Niveau d'études détecté: ${profileData.education}`);
        }
      }

      // Mettre à jour le user si on a des données
      if (Object.keys(updateFields).length > 0) {
        await User.findByIdAndUpdate(
          userId,
          { $set: updateFields },
          { new: true }
        );
        console.log(`  ✅ Profil utilisateur mis à jour`);
      }

    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du profil utilisateur:', error);
    }
  }

  async updateBuildingProfile(conversation, analysis, messageId) {
    try {
      const profile = conversation.buildingProfile;

      // Mettre à jour les traits détectés
      if (analysis.extractedTraits && analysis.extractedTraits.length > 0) {
        for (const traitData of analysis.extractedTraits) {
          conversation.updateTraitScore(
            traitData.trait,
            traitData.confidence,
            traitData.confidence,
            messageId
          );
        }
      }

      // Ajouter les nouveaux intérêts
      if (analysis.detectedInterests && analysis.detectedInterests.length > 0) {
        for (const interest of analysis.detectedInterests) {
          const existingInterest = profile.interests.find(i => i.domain === interest.domain);

          if (existingInterest) {
            // Augmenter progressivement le niveau à chaque mention
            const increment = interest.confidence > 0.5 ? 1 : 0.5;
            const oldLevel = existingInterest.level;
            existingInterest.level = Math.min(5, existingInterest.level + increment);
            console.log(`  📈 ${interest.domain}: niv ${oldLevel.toFixed(1)} → ${existingInterest.level.toFixed(1)}`);
          } else {
            // Ajouter nouvel intérêt
            const initialLevel = Math.max(2, Math.round(interest.confidence * 5));
            profile.interests.push({
              domain: interest.domain,
              level: initialLevel,
              context: interest.evidence ? interest.evidence.join(', ') : '',
              discoveredAt: new Date()
            });
            console.log(`  ✨ Nouvel intérêt: ${interest.domain} (niv ${initialLevel})`);
          }
        }
      }

      // Ajouter les nouvelles valeurs
      if (analysis.detectedValues && analysis.detectedValues.length > 0) {
        for (const value of analysis.detectedValues) {
          const existingValue = profile.values.find(v => v.value === value.value);

          if (!existingValue) {
            profile.values.push({
              value: value.value,
              importance: Math.round(value.confidence * 5),
              context: value.context || ''
            });
          }
        }
      }

      // Ajouter les nouvelles contraintes
      if (analysis.detectedConstraints && analysis.detectedConstraints.length > 0) {
        for (const constraint of analysis.detectedConstraints) {
          const existingConstraint = profile.constraints.find(c => c.type === constraint.type);

          if (!existingConstraint) {
            profile.constraints.push({
              type: constraint.type,
              description: constraint.evidence || '',
              flexibility: 3, // Neutre par défaut
              impact: constraint.impact || 'preferential'
            });
          }
        }
      }

      // Mettre à jour les insights de personnalité
      if (analysis.keyTopics && analysis.keyTopics.length > 0) {
        if (!profile.personalityInsights.motivators) {
          profile.personalityInsights.motivators = [];
        }

        // Ajouter les nouveaux topics comme motivateurs potentiels
        for (const topic of analysis.keyTopics) {
          if (!profile.personalityInsights.motivators.includes(topic)) {
            profile.personalityInsights.motivators.push(topic);
          }
        }
      }

    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
    }
  }

  async updateConversationQuality(conversation, analysis) {
    try {
      const quality = conversation.quality;

      // Engagement basé sur la longueur et la qualité des réponses
      const engagementScore = analysis.engagementLevel / 5;
      quality.engagementScore = (quality.engagementScore + engagementScore) / 2;

      // Complétude basée sur les informations collectées
      quality.completenessScore = conversation.calculateCompleteness();

      // Confiance basée sur la cohérence des réponses
      const avgTraitConfidence = analysis.extractedTraits.length > 0
        ? analysis.extractedTraits.reduce((sum, trait) => sum + trait.confidence, 0) / analysis.extractedTraits.length
        : quality.confidenceScore;

      quality.confidenceScore = (quality.confidenceScore + avgTraitConfidence) / 2;

      // Flow de conversation (simple pour l'instant)
      quality.conversationFlow = Math.min(1, conversation.messages.length / 20);

    } catch (error) {
      console.error('Erreur mise à jour qualité:', error);
    }
  }

  async generateJobRecommendations(conversation) {
    try {
      console.log('\n🎯 GÉNÉRATION RECOMMANDATIONS');
      console.log('📊 Profil actuel:');
      const topTraits = Array.from(conversation.buildingProfile.detectedTraits.entries())
        .filter(([k, v]) => v.score > 0)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 3)
        .map(([k, v]) => `${k} (${(v.score * 100).toFixed(0)}%)`);
      if (topTraits.length > 0) {
        console.log('  - Traits:', topTraits.join(', '));
      }
      const interests = conversation.buildingProfile.interests.map(i => `${i.domain} (niv ${i.level})`);
      if (interests.length > 0) {
        console.log('  - Intérêts:', interests.join(', '));
      }
      const values = conversation.buildingProfile.values.slice(0, 3).map(v => v.value);
      if (values.length > 0) {
        console.log('  - Valeurs:', values.join(', '));
      }

      // Créer un vecteur de traits basé sur le profil actuel
      const userTraitVector = new Map();
      const { TRAIT_DIMENSIONS } = require('../models/Job');

      // Initialiser tous les traits à 0
      TRAIT_DIMENSIONS.forEach(trait => {
        userTraitVector.set(trait, 0);
      });

      // Remplir avec les traits détectés
      for (const [trait, data] of conversation.buildingProfile.detectedTraits.entries()) {
        if (userTraitVector.has(trait)) {
          userTraitVector.set(trait, data.score * data.confidence);
        }
      }

      // Mapping des intérêts vers des traits pour enrichir le vecteur
      const interestToTraitMap = {
        'horticulture': ['creativity', 'design', 'independent', 'detail-oriented', 'service'],
        'agriculture': ['independent', 'detail-oriented', 'problem-solving'],
        'technology': ['analytical', 'problem-solving', 'innovation'],
        'health': ['empathy', 'service', 'communication', 'problem-solving'],
        'education': ['communication', 'teaching', 'empathy', 'organizational'],
        'art': ['creativity', 'design', 'innovation'],
        'business': ['leadership', 'communication', 'analytical', 'organizational'],
        'sports': ['teamwork', 'leadership', 'independent'],
        'science': ['analytical', 'problem-solving', 'innovation'],
        'construction': ['problem-solving', 'detail-oriented', 'independent'],
        'culinary': ['creativity', 'detail-oriented', 'service'],
        'mechanics': ['problem-solving', 'detail-oriented', 'analytical'],
        'beauty': ['creativity', 'service', 'communication'],
        'hospitality': ['service', 'communication', 'organizational'],
        'social': ['empathy', 'communication', 'service'],
        'law': ['analytical', 'communication', 'detail-oriented'],
        'communication': ['communication', 'creativity', 'collaborative'],
        'security': ['detail-oriented', 'problem-solving', 'independent']
      };

      // Enrichir le vecteur avec les intérêts (avec un poids important)
      for (const interest of conversation.buildingProfile.interests) {
        const mappedTraits = interestToTraitMap[interest.domain];
        if (mappedTraits) {
          for (const trait of mappedTraits) {
            if (userTraitVector.has(trait)) {
              // Ajouter le score de l'intérêt (niveau/5) au trait
              const currentValue = userTraitVector.get(trait);
              const interestBonus = interest.level / 5 * 0.8; // 80% de poids pour les intérêts
              const newValue = Math.min(1, currentValue + interestBonus);
              userTraitVector.set(trait, newValue);
            }
          }
        }
      }

      // IMPORTANT: On charge TOUS les jobs pour laisser Claude et le smart sampling faire leur travail
      // Au lieu de filtrer par intérêts (qui peut enlever des bons jobs si detection incomplète),
      // on envoie tous les jobs à Claude qui utilise le smart sampling pour sélectionner les meilleurs
      const allJobs = await Job.find({ source: { $in: ['manual', 'onet', 'ESCO'] } });
      const jobsToMatch = allJobs;

      console.log(`  ✓ ${jobsToMatch.length} métiers chargés (smart sampling en ClaudeService)`);

      if (jobsToMatch.length === 0) {
        console.warn('⚠️ Aucun métier trouvé, utilisation de tous les métiers');
        jobsToMatch = await Job.find({ source: { $in: ['manual', 'onet', 'ESCO'] } });
      }

      // Calculer les matches avec Claude AI si disponible, sinon fallback
      let recommendations;

      if (this.useClaudeAI && conversation.buildingProfile.interests.length > 2) {
        try {
          console.log('🤖 Matching avec Claude AI...');

          // Utiliser Claude pour un matching intelligent
          const claudeRecommendations = await this.claudeService.generateJobRecommendations(
            conversation.buildingProfile,
            jobsToMatch
          );

          // NOUVEAU: Matcher les recommendations Claude avec TOUS les jobs de la BDD
          // pour trouver le meilleur match (pas juste les 50 de l'échantillon)
          const allJobsForMatching = await Job.find({ source: { $in: ['manual', 'onet', 'ESCO'] } });
          const matchedRecommendations = await this.matchClaudeRecommendationsWithDatabase(
            claudeRecommendations,
            allJobsForMatching
          );

          // Transformer les matched recommendations en format de recommendation final
          recommendations = matchedRecommendations
            .filter(matched => matched.matchedJob !== null)
            .map(matched => ({
              jobId: matched.matchedJob._id,
              matchScore: matched.matchScore,
              reasonsFor: matched.claudeRecommendation.reasoning || [],
              concerns: matched.claudeRecommendation.concerns || [],
              growthPotential: matched.claudeRecommendation.growthPotential || 'Non spécifié',
              summary: matched.claudeRecommendation.summary || 'Métier recommandé',
              confidence: matched.matchScore,
              presentedAt: new Date(),
              claudeJobTitle: matched.claudeRecommendation.jobTitle,
              matchingConfidence: matched.confidence
            }));

          if (recommendations.length > 0) {
            const DEBUG_MATCHING = process.env.DEBUG_MATCHING === 'true';
            if (DEBUG_MATCHING) {
              console.log(`✨ Top ${recommendations.length} recommandations avec matching intelligent`);
            }
          } else {
            console.warn('⚠️ Aucune recommandation valide de Claude, fallback sur VectorMatching');
            recommendations = await this.generateVectorBasedRecommendations(
              userTraitVector,
              jobsToMatch,
              conversation.buildingProfile
            );
          }

        } catch (error) {
          console.error('❌ Erreur Claude AI, fallback sur VectorMatching:', error.message);
          // Fallback sur le système vectoriel
          recommendations = await this.generateVectorBasedRecommendations(
            userTraitVector,
            jobsToMatch,
            conversation.buildingProfile
          );
        }
      } else {
        // Fallback: utiliser le matching vectoriel
        console.log('📊 Matching avec VectorMatching (fallback)');
        recommendations = await this.generateVectorBasedRecommendations(
          userTraitVector,
          jobsToMatch,
          conversation.buildingProfile
        );
      }

      // Ajouter à la conversation (limiter au top 3)
      conversation.jobRecommendations = recommendations.slice(0, 3);

    } catch (error) {
      console.error('Erreur génération recommandations:', error);
    }
  }

  /**
   * Génère des recommandations basées sur le matching vectoriel (fallback)
   */
  async generateVectorBasedRecommendations(userTraitVector, jobsToMatch, profile) {
    const matches = await VectorMatchingService.findBestMatches(
      userTraitVector,
      jobsToMatch,
      Math.min(10, jobsToMatch.length)
    );

    if (matches.length > 0) {
      const DEBUG_MATCHING = process.env.DEBUG_MATCHING === 'true';
      if (DEBUG_MATCHING) {
        console.log(`  ✓ Top 3: ${matches.slice(0, 3).map((m, i) => `${m.job.title} (${m.matchPercentage}%)`).join(', ')}`);
      }
    }

    // Limiter au top 3 et convertir en recommandations
    return matches.slice(0, 3).map(match => ({
      jobId: match.job._id,
      matchScore: match.matchPercentage / 100,
      reasonsFor: this.generateMatchReasons(profile, match.job),
      concerns: this.generateMatchConcerns(profile, match.job),
      confidence: match.matchPercentage / 100,
      presentedAt: new Date()
    }));
  }

  generateMatchReasons(profile, job) {
    const reasons = [];

    // Analyser les traits compatibles
    const compatibleTraits = [];
    for (const [trait, data] of profile.detectedTraits.entries()) {
      if (data.score > 0.5 && job.traitVector.get(trait) > 0.5) {
        compatibleTraits.push(trait);
      }
    }

    if (compatibleTraits.length > 0) {
      reasons.push(`Votre profil ${compatibleTraits.slice(0, 3).join(', ')} correspond bien à ce métier`);
    }

    // Analyser les intérêts
    const matchingInterests = profile.interests.filter(interest =>
      job.tags.some(tag => tag.toLowerCase().includes(interest.domain.toLowerCase()))
    );

    if (matchingInterests.length > 0) {
      reasons.push(`Correspond à vos intérêts en ${matchingInterests[0].domain}`);
    }

    return reasons.slice(0, 3); // Limiter à 3 raisons
  }

  generateMatchConcerns(profile, job) {
    const concerns = [];

    // Vérifier les contraintes
    for (const constraint of profile.constraints) {
      if (constraint.impact === 'blocking') {
        if (constraint.type === 'geographic' && job.work_environment.includes('voyage')) {
          concerns.push('Ce métier pourrait nécessiter des déplacements');
        }
        if (constraint.type === 'schedule' && job.work_environment.includes('horaires variables')) {
          concerns.push('Les horaires pourraient être contraignants');
        }
      }
    }

    return concerns.slice(0, 2); // Limiter à 2 préoccupations
  }

  async saveFinalProfileToUser(conversation) {
    try {
      const user = await User.findById(conversation.userId);

      if (!user) {
        console.warn('Utilisateur non trouvé pour sauvegarde profil');
        return;
      }

      // Mettre à jour le vecteur de traits de l'utilisateur
      const finalTraitVector = new Map();
      for (const [trait, data] of conversation.buildingProfile.detectedTraits.entries()) {
        finalTraitVector.set(trait, data.score);
      }

      user.traitVector = finalTraitVector;

      // Ajouter l'historique de conversation
      user.conversationHistory.push({
        conversationId: conversation._id,
        completedAt: conversation.completedAt,
        finalProfile: conversation.buildingProfile,
        satisfaction: conversation.quality.userSatisfaction
      });

      await user.save();

    } catch (error) {
      console.error('Erreur sauvegarde profil utilisateur:', error);
    }
  }

  /**
   * Méthodes utilitaires
   */

  async pauseConversation(conversationId) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        conversation.status = 'paused';
        await conversation.save();
      }
      return conversation;
    } catch (error) {
      console.error('Erreur pause conversation:', error);
      throw error;
    }
  }

  async resumeConversation(conversationId) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (conversation && conversation.status === 'paused') {
        conversation.status = 'active';
        conversation.lastActiveAt = new Date();
        await conversation.save();
      }
      return conversation;
    } catch (error) {
      console.error('Erreur reprise conversation:', error);
      throw error;
    }
  }

  async getConversationStats() {
    try {
      return await Conversation.getConversationStats();
    } catch (error) {
      console.error('Erreur stats conversation:', error);
      throw error;
    }
  }

  /**
   * Matcher les recommendations de Claude avec les jobs de la BDD
   * Trouve le meilleur job qui correspond à chaque recommendation
   */
  async matchClaudeRecommendationsWithDatabase(claudeRecommendations, allJobs) {
    try {
      const DEBUG_MATCHING = process.env.DEBUG_MATCHING === 'true';
      if (DEBUG_MATCHING) {
        console.log('\n🔍 Matching recommendations Claude avec la BDD...');
      }

      return await Promise.all(
        claudeRecommendations.map(async (claudeRec) => {
          // Calculer un score de similarité pour chaque job de la BDD
          const scoredJobs = allJobs.map(dbJob => ({
            job: dbJob,
            score: this.calculateSimilarityScore(claudeRec, dbJob)
          }));

          // Trier par score descendant
          scoredJobs.sort((a, b) => b.score - a.score);

          // Prendre le meilleur match
          const bestMatch = scoredJobs[0];

          // Top 3 alternatives (toujours calculé pour le retour)
          const top3 = scoredJobs.slice(0, 3);

          // Logging (mode debug uniquement)
          const DEBUG_MATCHING = process.env.DEBUG_MATCHING === 'true';
          if (DEBUG_MATCHING) {
            console.log(`  📌 Claude: "${claudeRec.jobTitle}"`);
            console.log(`     ✅ Matché avec: "${bestMatch.job.title}" (score: ${(bestMatch.score * 100).toFixed(1)}%)`);
            console.log(`     🔄 Alternatives:`);
            top3.forEach((alt, idx) => {
              if (idx > 0) {
                console.log(`        ${idx}. "${alt.job.title}" (${(alt.score * 100).toFixed(1)}%)`);
              }
            });
          }

          return {
            claudeRecommendation: claudeRec,
            matchedJob: bestMatch.job,
            matchScore: bestMatch.score,
            confidence: bestMatch.score >= 0.75 ? 'high' : bestMatch.score >= 0.5 ? 'medium' : 'low',
            alternatives: top3.slice(1, 3).map(alt => ({
              job: alt.job,
              score: alt.score
            }))
          };
        })
      );

    } catch (error) {
      console.error('❌ Erreur matching recommendations:', error.message);
      return claudeRecommendations.map(rec => ({
        claudeRecommendation: rec,
        matchedJob: null,
        matchScore: 0,
        confidence: 'low'
      }));
    }
  }

  /**
   * Calcule un score de similarité entre une recommendation Claude et un job BDD
   * Retourne un score entre 0 et 1
   */
  calculateSimilarityScore(claudeRec, dbJob) {
    let score = 0;

    // OPTION 1: Exact keyword match - très haut score
    // Chercher si le titre Claude contient les mots-clés importants du titre DB
    const claudeTitle = claudeRec.jobTitle?.toLowerCase() || '';
    const dbTitle = dbJob.title?.toLowerCase() || '';

    // Keywords pour matching spécifiques
    const keywordMatches = {
      'soigneur': ['soigneur', 'caretaker', 'keeper'],
      'animal': ['animal', 'animaux', 'animales'],
      'vétérin': ['vétérin', 'veterinary', 'vet'],
      'élevage': ['élevage', 'breeder', 'breeding'],
      'refuge': ['refuge', 'shelter'],
    };

    let keywordMatchScore = 0;
    for (const [key, keywords] of Object.entries(keywordMatches)) {
      const claudeHasKeyword = keywords.some(kw => claudeTitle.includes(kw));
      const dbHasKeyword = keywords.some(kw => dbTitle.includes(kw));
      if (claudeHasKeyword && dbHasKeyword) {
        keywordMatchScore += 0.2; // Bonus fort pour chaque keyword en commun
      }
    }
    score += Math.min(keywordMatchScore, 0.5); // Max 50% du score initial

    // 1. Similarité du titre (30% du poids) - réduit car keywords handle better
    const titleSimilarity = this.stringSimilarity(claudeTitle, dbTitle);
    score += titleSimilarity * 0.3;

    // 2. Comparaison des skills/reasoning (35% du poids) - augmenté
    if (claudeRec.reasoning && Array.isArray(claudeRec.reasoning) && dbJob.skills) {
      const reasoningText = claudeRec.reasoning.join(' ').toLowerCase();
      const skillsText = (dbJob.skills || []).join(' ').toLowerCase();
      const skillsSimilarity = this.textSimilarity(reasoningText, skillsText);
      score += skillsSimilarity * 0.35;
    }

    // 3. Comparaison des descriptions (20% du poids)
    if (claudeRec.description && dbJob.description) {
      const descSimilarity = this.textSimilarity(
        claudeRec.description.toLowerCase(),
        dbJob.description.toLowerCase()
      );
      score += descSimilarity * 0.2;

      // Bonus si les descriptions ont du contenu similaire clé
      const keywordBonus = this.keywordMatchBonus(claudeRec.description, dbJob.description);
      score += keywordBonus * 0.1;
    } else if (claudeRec.description || dbJob.description) {
      // Pénalité si l'un des deux manque
      score -= 0.05;
    }

    // 4. Tags/sectors match (10% du poids)
    if (claudeRec.sector && dbJob.sector) {
      const sectorMatch = claudeRec.sector.toLowerCase() === dbJob.sector.toLowerCase() ? 1 : 0;
      score += sectorMatch * 0.1;
    }

    // Normaliser entre 0 et 1
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Similarité entre deux strings basée sur la distance de Levenshtein
   * Retourne un score entre 0 et 1
   */
  stringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Similarité textuelle basée sur Jaccard (mots en commun)
   * Retourne un score entre 0 et 1
   */
  textSimilarity(text1, text2) {
    // Tokenizer: split par espaces et caractères spéciaux
    const words1 = new Set(text1.split(/\s+|\W+/).filter(w => w.length > 2));
    const words2 = new Set(text2.split(/\s+|\W+/).filter(w => w.length > 2));

    if (words1.size === 0 && words2.size === 0) return 1.0;
    if (words1.size === 0 || words2.size === 0) return 0.0;

    // Jaccard similarity: intersection / union
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Bonus de matching pour les mots-clés importants
   */
  keywordMatchBonus(text1, text2) {
    const keywordPatterns = {
      animal: ['animal', 'chat', 'chien', 'bestiole', 'créature', 'beast'],
      soins: ['soin', 'care', 'traitement', 'nourrir', 'feed', 'health'],
      extérieur: ['extérieur', 'outdoor', 'plein air', 'nature', 'terrain', 'field'],
      équipe: ['équipe', 'team', 'groupe', 'collaboration', 'ensemble'],
      technique: ['technique', 'technical', 'technologi', 'skill', 'compéten'],
      management: ['manager', 'directeur', 'leader', 'responsable', 'chief']
    };

    let bonus = 0;
    const text1Lower = text1.toLowerCase();
    const text2Lower = text2.toLowerCase();

    for (const [keyword, aliases] of Object.entries(keywordPatterns)) {
      const allVariants = [keyword, ...aliases];
      const foundInBoth = allVariants.some(v =>
        text1Lower.includes(v) && text2Lower.includes(v)
      );
      if (foundInBoth) {
        bonus += 0.1; // 10% par mot-clé trouvé en commun
      }
    }

    return Math.min(1, bonus);
  }

  /**
   * Distance de Levenshtein entre deux strings
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    // Initialiser première colonne
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    // Initialiser première ligne
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    // Remplir la matrice
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,  // Substitution
            matrix[i][j - 1] + 1,      // Insertion
            matrix[i - 1][j] + 1       // Suppression
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

module.exports = ConversationService;
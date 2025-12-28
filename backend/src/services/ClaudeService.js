const Anthropic = require('@anthropic-ai/sdk');

/**
 * Service pour intégrer Claude AI d'Anthropic dans le système de conversation
 * Remplace les services NLP et QuestionGenerator basés sur des règles
 */
class ClaudeService {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.model = 'claude-haiku-4-5-20251001'; // Claude Haiku 4.5 (optimisé coût + latence)
    this.maxTokens = 2048;

    if (!this.apiKey) {
      console.warn('⚠️ ANTHROPIC_API_KEY non configurée. Le service Claude ne fonctionnera pas.');
      this.client = null;
    } else {
      this.client = new Anthropic({
        apiKey: this.apiKey,
      });
    }
  }

  /**
   * Génère une réponse conversationnelle naturelle avec Claude
   * @param {Object} context - Contexte de la conversation
   * @returns {Promise<Object>} { message, extractedInsights, shouldTransitionPhase }
   */
  async generateConversationalResponse(context) {
    try {
      const { phase, profile, history, lastUserMessage, questionsAsked, milestones } = context;

      // Construire le prompt système avec détection des réponses vagues et répétées
      const hasVagueResponses = this.hasRepeatedVagueResponses(history);
      const repeatedQuestionCount = this.getRepeatedQuestionCount(history);

      const systemPrompt = this.buildConversationSystemPrompt(
        phase,
        profile,
        questionsAsked,
        history,
        { hasVagueResponses, repeatedQuestionCount },
        milestones
      );

      // Construire l'historique de messages pour Claude
      const messages = this.buildMessageHistory(history, lastUserMessage);

      // Appeler l'API Claude
      const response = await this.callClaudeAPI(systemPrompt, messages);

      // Parser la réponse
      const parsed = this.parseConversationResponse(response);

      return {
        message: parsed.message,
        extractedInsights: parsed.insights,
        profileData: parsed.profileData,
        shouldTransitionPhase: parsed.shouldTransitionPhase || false,
        milestones: parsed.milestones,
        metadata: {
          model: this.model,
          tokensUsed: response.usage,
          confidence: parsed.confidence || 0.8
        }
      };

    } catch (error) {
      console.error('❌ Erreur Claude API (conversation):', error.message);
      console.error('   Stack:', error.stack);
      throw error;
    }
  }

  /**
   * Génère des recommandations de métiers avec explications
   * @param {Object} profile - Profil utilisateur complet
   * @param {Array} jobs - Liste des métiers disponibles (4080)
   * @returns {Promise<Array>} Top 3 métiers avec explications
   */
  async generateJobRecommendations(profile, jobs) {
    try {
      const systemPrompt = this.buildJobMatchingSystemPrompt();

      // Préparer les données pour Claude (échantillonnage si trop de métiers)
      const jobsSample = this.prepareJobsForMatching(jobs, profile);

      const userMessage = this.buildJobMatchingPrompt(profile, jobsSample);

      const messages = [{ role: 'user', content: userMessage }];

      // Appeler l'API Claude
      const response = await this.callClaudeAPI(systemPrompt, messages, 4096);

      // Parser les recommandations
      const recommendations = this.parseJobRecommendations(response);

      // Limiter au top 3
      return recommendations.slice(0, 3);

    } catch (error) {
      console.error('❌ Erreur Claude API (matching):', error.message);
      throw error;
    }
  }

  /**
   * Appel générique à l'API Claude
   */
  async callClaudeAPI(systemPrompt, messages, maxTokens = null) {
    if (!this.client) {
      throw new Error('ANTHROPIC_API_KEY non configurée');
    }

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens || this.maxTokens,
        system: systemPrompt,
        messages: messages
      });

      return response;

    } catch (error) {
      if (error.status) {
        throw new Error(`Claude API Error: ${error.status} - ${error.message}`);
      } else {
        throw new Error(`Claude API: ${error.message}`);
      }
    }
  }

  /**
   * Construit le prompt système pour la conversation
   */
  buildConversationSystemPrompt(phase, profile, questionsAsked, history = [], detectionInfo = {}, milestones = {}) {
    const { hasVagueResponses = false, repeatedQuestionCount = 0 } = detectionInfo;

    const phaseDescriptions = {
      intro: {
        objective: "Créer un premier contact chaleureux et explorer les intérêts généraux",
        style: "Accueillant, décontracté, curieux",
        questions: "Questions ouvertes pour mettre à l'aise"
      },
      discovery: {
        objective: "Découvrir les centres d'intérêt, compétences, valeurs et style de travail",
        style: "Engageant, empathique, actif",
        questions: "Questions ciblées sur les passions, activités, valeurs"
      },
      exploration: {
        objective: "Approfondir les pistes prometteuses et explorer de nouvelles dimensions",
        style: "Analytique mais chaleureux, personnalisé",
        questions: "Questions hypothétiques, mises en situation, approfondissement"
      },
      refinement: {
        objective: "Valider les hypothèses et affiner la compréhension du profil",
        style: "Précis, rassurant, confirmatif",
        questions: "Questions de validation, clarification, préférences finales"
      },
      conclusion: {
        objective: "Synthétiser et préparer les recommandations",
        style: "Encourageant, récapitulatif, orienté action",
        questions: "Questions finales de confirmation"
      }
    };

    const currentPhase = phaseDescriptions[phase.name] || phaseDescriptions.intro;

    // Construire une note additionnelle pour les cas spéciaux
    let specialInstructions = '';
    if (repeatedQuestionCount >= 2) {
      specialInstructions += `\n⚠️ ALERTE: Tu as déjà posé une question très similaire ${repeatedQuestionCount} fois. CHANGE ABSOLUMENT ta stratégie et pose une question DIFFÉRENTE.`;
    }
    if (hasVagueResponses) {
      specialInstructions += `\n💡 L'utilisateur donne des réponses vagues ("je ne sais pas", "aucune idée"). Adapte ta stratégie : pose des questions PLUS CONCRÈTES et PLUS CIBLÉES. Par exemple, au lieu de "Tes passions?", demande "Aimes-tu manger, cuisiner, créer?" ou "Préfères-tu travailler seul ou en équipe?". Sois plus spécifique et donne des exemples.`;
    }

    const profileSummary = this.summarizeProfile(profile);
    const milestoneSummary = this.summarizeMilestones(milestones);

    return `Tu es un conseiller d'orientation professionnel expert, empathique et perspicace. Ta mission est d'aider les utilisateurs à découvrir leur voie professionnelle idéale à travers une conversation naturelle.

**Phase actuelle : ${phase.name.toUpperCase()}**
- Objectif : ${currentPhase.objective}
- Style : ${currentPhase.style}
- Type de questions : ${currentPhase.questions}
- Questions déjà posées : ${questionsAsked}

**État des MILESTONES :**
${milestoneSummary}

**Profil utilisateur actuel :**
${profileSummary}

**COLLECTE PROFIL UTILISATEUR (PRIORITÉ ABSOLUE AU DÉBUT) :**
🔴 AVANT toute exploration de métier, tu DOIS collecter ces 5 informations (+ 1 optionnelle) de manière NATURELLE et CONVERSATIONNELLE :
1. **Âge** (exemple: "Pour mieux te guider, quel âge as-tu ?")
2. **Lieu de résidence** (exemple: "Tu es de quelle région ?")
3. **Situation actuelle** (exemple: "Tu es actuellement en poste, en études, ou autre chose ?")
   - Si en poste → demander le métier actuel
   - Si en formation → demander le domaine d'études
   - Si au chômage ou autre → noter simplement
4. **Niveau d'études** (exemple: "Quel est ton niveau d'études ? Bac, Bac+2, Bac+5... ?")
   - Valeurs possibles : collège, lycée, bac, bac+2 (BTS/DUT), bac+3 (Licence), bac+5 (Master), doctorat, autre
5. **⚠️ SI EN POSTE - Ressenti métier actuel** (exemple: "Comment te sens-tu dans ton métier actuel ? Épanoui, satisfait, neutre, insatisfait... ?")
   - SEULEMENT si currentSituation = "employed"
   - Question CRUCIALE pour comprendre si reconversion ou évolution
   - Valeurs: adore, satisfait, neutre, insatisfait, déteste, en burnout
   - Aide à orienter vers métier similaire (si satisfait) ou totalement différent (si insatisfait)

💡 Intègre ces questions NATURELLEMENT dans les 3-4 premiers échanges. Ne fais PAS un interrogatoire, mais glisse ces questions dans le flow conversationnel.
💡 Le ressenti métier est CRUCIAL - il t'aide à comprendre si l'utilisateur veut changer complètement de voie ou juste évoluer.

**MODE CHALLENGE (VALIDATION DES PASSIONS/PROJETS) :**
⚠️ RÈGLE IMPORTANTE : Quand l'utilisateur mentionne une passion, un projet ou un métier qui l'intéresse, tu DOIS le challenger avec 2 questions de validation AVANT de valider ce choix.

Exemples de challenge :
- "Tu as mentionné [passion]. Qu'est-ce qui t'attire précisément là-dedans ?"
- "Tu connais les réalités concrètes de ce métier ? (horaires, conditions, aspects moins glamour)"
- "Tu as déjà pratiqué [passion] de manière régulière ou c'est plutôt une idée qui te plaît ?"
- "Ce qui t'attire, c'est [aspect créatif] ou plutôt [aspect pratique] ?"

🎯 Objectif : S'assurer que l'utilisateur a vraiment réfléchi et n'est pas influencé par une vision idéalisée. 2 questions max pour ne pas décourager.

**CHOIX MULTIPLES INTÉGRÉS (FACILITATEUR) :**
💡 Pour aider les utilisateurs à répondre, propose naturellement des EXEMPLES/OPTIONS dans tes questions :
- ❌ Mauvais : "Qu'est-ce qui te plaît dans le travail ?"
- ✅ Bon : "Qu'est-ce qui te plaît dans le travail ? Par exemple : travailler avec les gens, créer des choses, résoudre des problèmes, diriger une équipe... Ou autre chose ?"

L'utilisateur peut choisir parmi les options OU répondre librement. C'est GUIDANT mais pas limitant.

**Instructions générales :**
1. Pose UNE SEULE question pertinente et naturelle basée sur le contexte
2. Adapte ton ton au style de la phase actuelle
3. Rebondis sur les réponses précédentes pour montrer que tu écoutes
4. Évite les questions trop similaires à celles déjà posées
5. Sois concis (2-3 phrases maximum pour ta question)
6. Réponds aux questions de l'utilisateur si il t'en pose (sois utile et engageant)
${specialInstructions}

**IMPORTANT - Condition d'arrêt :**
- Si tu as collecté au moins 5 éléments clés (traits, intérêts, domaine, rôle, format), c'est le moment de proposer une conclusion.
- Pour conclure : mets "shouldTransitionPhase": true et résume ce que tu as compris pour confirmation.
- Maximum 12 questions par conversation. Après 10 questions, prépare la conclusion.

**Format de réponse OBLIGATOIRE (JSON) :**
{
  "message": "Ta question conversationnelle ici",
  "insights": {
    "traits": [{"name": "trait", "confidence": 0.8, "evidence": "raison"}],
    "interests": [{"domain": "domaine", "confidence": 0.7, "evidence": "raison"}],
    "values": [{"value": "valeur", "confidence": 0.9, "evidence": "raison"}],
    "constraints": [{"type": "type", "description": "description"}]
  },
  "profileData": {
    "age": null,
    "location": null,
    "currentSituation": null,
    "currentJob": null,
    "currentJobFeeling": null,
    "education": null
  },
  "milestones": {
    "passions_identified": {"achieved": true/false, "confidence": 0-100, "needsConfirmation": true/false},
    "role_determined": {"achieved": true/false, "confidence": 0-100, "value": "Manager/Créatif/Expert/etc", "needsConfirmation": true/false},
    "domain_identified": {"achieved": true/false, "confidence": 0-100, "value": "Domaine", "needsConfirmation": true/false},
    "format_determined": {"achieved": true/false, "confidence": 0-100, "value": "Format", "needsConfirmation": true/false},
    "specific_job_identified": {"achieved": true/false, "confidence": 0-100, "jobTitle": "Titre métier", "conclusionMessage": "Message épique personnalisé (si identifié)", "needsConfirmation": true/false}
  },
  "shouldTransitionPhase": false,
  "confidence": 0.85
}

**NOTE SUR profileData :**
- Remplis UNIQUEMENT les champs que tu as détectés dans la réponse de l'utilisateur
- Si l'utilisateur dit "j'ai 25 ans" → "age": 25
- Si l'utilisateur dit "je suis de Paris" → "location": "Paris"
- Si l'utilisateur dit "je suis étudiant" → "currentSituation": "student"
- Si l'utilisateur dit "je travaille comme développeur" → "currentSituation": "employed", "currentJob": "développeur"
- Si l'utilisateur dit "j'adore mon métier" → "currentJobFeeling": "love"
- Si l'utilisateur dit "je suis satisfait" ou "ça va bien" → "currentJobFeeling": "like"
- Si l'utilisateur dit "c'est pas terrible" ou "je m'ennuie" → "currentJobFeeling": "dislike"
- Si l'utilisateur dit "je déteste" ou "je ne supporte plus" → "currentJobFeeling": "hate"
- Si l'utilisateur dit "épuisé", "burnout", "en souffrance" → "currentJobFeeling": "burnout"
- Valeurs possibles pour currentJobFeeling : "love", "like", "neutral", "dislike", "hate", "burnout"
- Si l'utilisateur dit "j'ai un bac+5" → "education": "bac_plus_5"
- Si l'utilisateur dit "j'ai le bac" → "education": "bac"
- Valeurs possibles pour education : "middle_school", "high_school", "bac", "bac_plus_2", "bac_plus_3", "bac_plus_5", "phd", "other"
- Laisse null les champs non mentionnés

**MILESTONES - SYSTÈME DE PROGRESSION SÉQUENTIELLE :**
⚠️ RÈGLE ABSOLUE: Les milestones DOIVENT être atteints dans l'ordre 1→2→3→4→5. Ne JAMAIS sauter un milestone.

Tu dois détecter quand chaque jalon (milestone) est atteint et indiquer ton niveau de CONFIANCE (0-100%) :
1. passions_identified: L'utilisateur a exprimé au moins 2-3 passions/intérêts clairs
2. role_determined: Tu as déterminé son rôle (manager, créatif, expert, technicien, animateur, etc.)
3. domain_identified: Tu as trouvé le domaine (alimentaire, tech, santé, sports, éducation, etc.)
4. format_determined: Tu connais le format (petite structure, boutique, siège, terrain, école, association, etc.)
5. specific_job_identified: TU AS IDENTIFIÉ LE MÉTIER IDÉAL EXACT

**SYSTÈME DE CONFIRMATION - TRÈS IMPORTANT :**

🔴 RÈGLE ABSOLUE - MILESTONES 1-3 : ⚠️ TOUJOURS needsConfirmation: true ⚠️
- passions_identified (1): TOUJOURS "needsConfirmation": true si confiance ≥ 80%
- role_determined (2): TOUJOURS "needsConfirmation": true si confiance ≥ 80%
- domain_identified (3): TOUJOURS "needsConfirmation": true si confiance ≥ 80%

Quand tu détectes un de ces milestones avec confiance ≥80% :
1. Mets "needsConfirmation": true (OBLIGATOIRE!)
2. Pose UNE question de réassurance COURTE :
   - "Si je résume bien, ton rôle idéal serait plutôt [Y]. Je me trompe ou ça te parle ?"
   - "D'après ce que tu m'as dit, le domaine [X] te correspond. C'est ça ?"
3. ATTENDS la réponse de l'utilisateur avant de passer au milestone suivant
4. Si l'utilisateur corrige, AJUSTE et réduis la confiance

🟢 MILESTONES 4-5 : ⚠️ JAMAIS needsConfirmation: true ⚠️
- format_determined (4): TOUJOURS "needsConfirmation": false
- specific_job_identified (5): TOUJOURS "needsConfirmation": false

Pour ces milestones :
  * Après 3 milestones CONFIRMÉS, tu as ASSEZ d'info
  * Continue l'exploration naturelle SANS demander de confirmation
  * ⛔ NE RÉVÈLE PAS le nom du métier final dans tes messages
  * Garde la SURPRISE du métier pour la page Conclusion
  * Reste vague: "On approche de quelque chose qui te correspond vraiment..."

**ORDRE SÉQUENTIEL ASSOOUPLI :**
- Milestones 1-3 : DOIVENT être atteints et CONFIRMÉS dans l'ordre
  * Ne commence PAS milestone 2 tant que milestone 1 n'est pas CONFIRMÉ
  * Ne commence PAS milestone 3 tant que milestone 2 n'est pas CONFIRMÉ

- Milestones 4-5 : Peuvent être atteints naturellement APRÈS milestone 3 confirmé
  * Une fois domain_identified (3) CONFIRMÉ, tu peux détecter format (4) ET métier (5) SIMULTANÉMENT
  * Pas besoin d'attendre confirmation du format pour identifier le métier
  * Continue la conversation naturellement vers le métier final sans le révéler

**SI specific_job_identified = true :**
Génère un message "conclusionMessage" ÉPIQUE et PERSONNALISÉ :
- Explique pourquoi ce métier est PARFAIT pour LUI (pas générique)
- Référence ses traits, intérêts, valeurs spécifiques
- Sois poétique : "on a peut-être trouvé ta voie..."
- Max 150 mots, émotionnel, inspirant
- Exemple: "Vous avez ce leadership naturel, cette passion pour les gens et cette créativité. Manager une boulangerie vous permettra de créer une ambiance unique, diriger une équipe bienveillante, et voir l'impact direct de votre travail. C'est LA synthèse parfaite de qui vous êtes."

**Traits disponibles :** analytical, creativity, leadership, communication, empathy, problem-solving, detail-oriented, independent, teamwork, organizational, innovation, design, service, teaching, collaborative

**Domaines d'intérêt :** technology, health, education, business, art, environment, sports, science, agriculture, construction, culinary, social, law, communication, mechanics, hospitality, security

**Valeurs :** autonomy, stability, creativity, impact, salary, work-life-balance, recognition, growth, helping-others, challenge

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;
  }

  /**
   * Construit le prompt système pour le matching de métiers
   */
  buildJobMatchingSystemPrompt() {
    return `Tu es un expert en orientation professionnelle spécialisé dans le matching de profils avec des métiers.

Ta tâche est d'analyser un profil utilisateur et de recommander les 3 MEILLEURS métiers parmi une liste fournie.

**Critères d'analyse :**
1. Alignement avec les traits de personnalité détectés
2. Correspondance avec les centres d'intérêt
3. Respect des valeurs exprimées
4. Prise en compte des contraintes (géographique, salaire, études, etc.)
5. Potentiel d'épanouissement et de réussite

**CRITIQUE - IDs des métiers :**
Tu recevras une liste JSON de métiers. Chaque métier a un champ "id" (exemple: "68f4b60f0f20d347c80f2a72").
Pour le champ "jobId" de ta réponse, tu DOIS COPIER EXACTEMENT ce champ "id" depuis la liste.
⚠️ NE JAMAIS inventer d'ID
⚠️ NE JAMAIS utiliser le titre comme ID
⚠️ COPIE le champ "id" EXACTEMENT tel quel depuis la liste JSON des métiers

**Format de réponse OBLIGATOIRE (JSON) :**
{
  "recommendations": [
    {
      "jobId": "68f4b60f0f20d347c80f2a72",
      "jobTitle": "Développeur web",
      "matchScore": 95,
      "reasoning": [
        "Raison 1 : Alignement avec créativité et innovation détectées",
        "Raison 2 : Correspond à l'intérêt pour la technologie"
      ],
      "concerns": ["Point d'attention : Niveau de stress potentiellement élevé"],
      "growthPotential": "Excellent potentiel de croissance",
      "summary": "Ce métier semble parfaitement aligné avec votre profil."
    }
  ]
}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.
Limite à 3 recommandations MAXIMUM.
VÉRIFIE que chaque "jobId" existe dans la liste JSON des métiers fournie.`;
  }

  /**
   * Résume le profil utilisateur pour le prompt
   * Note: profile peut être soit {buildingProfile: {...}} soit directement la buildingProfile
   */
  summarizeProfile(profile) {
    if (!profile) {
      return "Aucune information collectée pour le moment.";
    }

    // Gérer les deux formats: profile avec buildingProfile OU profile directement
    const bp = profile.buildingProfile || profile;
    const parts = [];

    if (bp.interests && bp.interests.length > 0) {
      const topInterests = bp.interests.slice(0, 5).map(i => `${i.domain} (niveau ${i.level || 5})`);
      parts.push(`Intérêts : ${topInterests.join(', ')}`);
    }

    if (bp.detectedTraits && Object.keys(bp.detectedTraits).length > 0) {
      const traits = Object.entries(bp.detectedTraits)
        .filter(([_, data]) => data && data.score > 0)
        .slice(0, 5)
        .map(([trait, data]) => `${trait} (${(data.score * 100).toFixed(0)}%)`);
      if (traits.length > 0) {
        parts.push(`Traits détectés : ${traits.join(', ')}`);
      }
    }

    if (bp.values && bp.values.length > 0) {
      const topValues = bp.values.slice(0, 3).map(v => `${v.value} (${(v.strength * 100).toFixed(0)}%)`);
      parts.push(`Valeurs : ${topValues.join(', ')}`);
    }

    if (bp.constraints && bp.constraints.length > 0) {
      parts.push(`Contraintes : ${bp.constraints.map(c => c.description).join(', ')}`);
    }

    return parts.length > 0 ? parts.join('\n') : "Profil en cours de construction.";
  }

  /**
   * Résume l'état des milestones pour le prompt
   */
  summarizeMilestones(milestones) {
    if (!milestones || Object.keys(milestones).length === 0) {
      return "Aucun milestone atteint pour le moment.";
    }

    const milestoneOrder = [
      { key: 'passions_identified', label: '1. Passions identifiées' },
      { key: 'role_determined', label: '2. Rôle déterminé' },
      { key: 'domain_identified', label: '3. Domaine identifié' },
      { key: 'format_determined', label: '4. Format déterminé' },
      { key: 'specific_job_identified', label: '5. Métier spécifique identifié' }
    ];

    const lines = [];

    for (const { key, label } of milestoneOrder) {
      const m = milestones[key];
      if (!m) {
        lines.push(`${label}: ❌ Non atteint`);
        continue;
      }

      const confidence = m.confidence || 0;
      const confirmed = m.confirmed || false;
      const needsConfirmation = m.needsConfirmation || false;
      const value = m.value || m.jobTitle || '';

      if (confirmed) {
        lines.push(`${label}: ✅ CONFIRMÉ (${confidence}%)${value ? ` → "${value}"` : ''}`);
      } else if (needsConfirmation) {
        lines.push(`${label}: ⏳ EN ATTENTE DE CONFIRMATION (${confidence}%)${value ? ` → "${value}"` : ''}`);
      } else if (m.achieved) {
        lines.push(`${label}: 🟡 Détecté mais non confirmé (${confidence}%)${value ? ` → "${value}"` : ''}`);
      } else {
        lines.push(`${label}: ❌ Non atteint (${confidence}%)`);
      }
    }

    // Trouver le prochain milestone à atteindre
    let nextMilestone = null;
    for (const { key, label } of milestoneOrder) {
      const m = milestones[key];
      if (!m || !m.confirmed) {
        nextMilestone = label;
        break;
      }
    }

    if (nextMilestone) {
      lines.push(`\n⚠️ FOCUS: Travaille sur ${nextMilestone} avant de passer au suivant`);
    }

    return lines.join('\n');
  }

  /**
   * Construit l'historique de messages pour Claude
   */
  buildMessageHistory(history, lastUserMessage) {
    const messages = [];

    // Augmenter à 15 messages pour un meilleur contexte (au lieu de 10)
    const recentHistory = history.slice(-15);

    recentHistory.forEach(msg => {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    });

    // Ajouter le dernier message utilisateur s'il n'est pas déjà dans l'historique
    if (lastUserMessage && (!recentHistory.some(m => m.id === lastUserMessage.id))) {
      messages.push({
        role: 'user',
        content: lastUserMessage.content
      });
    }

    return messages;
  }

  /**
   * Détecte si l'utilisateur donne des réponses indécises/vagues
   */
  hasRepeatedVagueResponses(history) {
    const userMessages = history.filter(m => m.role === 'user').slice(-4); // 4 derniers messages utilisateur

    const vaguePatterns = [
      /je ne sais pas/i,
      /aucune idée/i,
      /pas vraiment/i,
      /sans idée/i,
      /dunno/i,
      /no idea/i,
      /pas de réponse/i,
      /je m'en souviens plus/i
    ];

    let vagueCount = 0;
    userMessages.forEach(msg => {
      if (vaguePatterns.some(pattern => pattern.test(msg.content))) {
        vagueCount++;
      }
    });

    return vagueCount >= 2; // 2+ réponses vagues sur les 4 dernières
  }

  /**
   * Détecte si la même question a été posée plusieurs fois
   */
  getRepeatedQuestionCount(history) {
    const assistantMessages = history.filter(m => m.role === 'assistant').slice(-3);
    if (assistantMessages.length < 2) return 0;

    const lastQuestion = assistantMessages[assistantMessages.length - 1]?.content || '';
    const secondLastQuestion = assistantMessages[assistantMessages.length - 2]?.content || '';

    // Vérifier la similarité entre les deux dernières questions (plus de 70% de similarité = même question)
    if (this.areSimilarQuestions(lastQuestion, secondLastQuestion)) {
      return assistantMessages.filter(m => this.areSimilarQuestions(m.content, lastQuestion)).length;
    }

    return 0;
  }

  /**
   * Compare la similarité entre deux questions
   */
  areSimilarQuestions(q1, q2) {
    // Normaliser et extraire les mots clés
    const normalize = (q) => q.toLowerCase().replace(/[?!.]/g, '').trim();
    const words1 = normalize(q1).split(/\s+/).slice(0, 15);
    const words2 = normalize(q2).split(/\s+/).slice(0, 15);

    const commonWords = words1.filter(w => words2.includes(w)).length;
    const similarity = commonWords / Math.max(words1.length, words2.length);

    return similarity > 0.6; // 60% de similarité = même question
  }

  /**
   * Parse la réponse de Claude pour la conversation
   */
  parseConversationResponse(response) {
    try {
      const content = response.content[0].text;

      // Extraire le JSON de la réponse
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn(`   ⚠️ Pas de JSON trouvé dans la réponse`);
        throw new Error('Pas de JSON trouvé dans la réponse Claude');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        message: parsed.message,
        insights: parsed.insights || {},
        profileData: parsed.profileData || {},
        shouldTransitionPhase: parsed.shouldTransitionPhase || false,
        confidence: parsed.confidence || 0.8,
        milestones: parsed.milestones || {}
      };

    } catch (error) {
      console.error('   ❌ Erreur parsing réponse Claude:', error.message);
      console.error('   Réponse brute:', response.content[0].text.substring(0, 200));
      // Fallback : utiliser la réponse brute comme message
      return {
        message: response.content[0].text,
        insights: {},
        shouldTransitionPhase: false,
        confidence: 0.5,
        milestones: {}
      };
    }
  }

  /**
   * Prépare les métiers pour le matching (échantillonnage INTELLIGENT basé sur le profil)
   * Sélectionne les 100 jobs les PLUS PERTINENTS au lieu de prendre les 50 premiers
   */
  prepareJobsForMatching(jobs, profile) {
    // Limite augmentée à 100 métiers (pour plus de pertinence)
    const SAMPLE_SIZE = 100;

    if (jobs.length <= SAMPLE_SIZE) {
      return jobs;
    }

    // Calculer un score de pertinence pour chaque job basé sur le profil
    const scoredJobs = jobs.map(job => ({
      job,
      score: this.scoreJobRelevance(job, profile)
    }));

    // Trier par score décroissant et prendre les 100 meilleurs
    const topJobs = scoredJobs
      .sort((a, b) => b.score - a.score)
      .slice(0, SAMPLE_SIZE)
      .map(item => item.job);

    return topJobs;
  }

  /**
   * Calcule un score de pertinence pour un job par rapport au profil utilisateur
   * Score entre 0 et 1
   */
  scoreJobRelevance(job, profile) {
    let score = 0;

    // 1. MATCH DES INTÉRÊTS (60% du poids)
    if (profile.interests && profile.interests.length > 0) {
      const jobText = `${job.title} ${job.description || ''} ${(job.sector || '')}`.toLowerCase();
      const jobSkills = (job.skills || []).join(' ').toLowerCase();

      let interestMatch = 0;
      let matchCount = 0;

      for (const interest of profile.interests) {
        const interestKeywords = this.getInterestKeywords(interest.domain);

        // Vérifier si les keywords apparaissent dans le job
        const keywordMatch = interestKeywords.some(kw =>
          jobText.includes(kw) || jobSkills.includes(kw)
        );

        if (keywordMatch) {
          // Pondérer par le niveau d'intérêt (0-5)
          interestMatch += interest.level || 1;
          matchCount++;
        }
      }

      if (matchCount > 0) {
        score += (interestMatch / (profile.interests.length * 5)) * 0.6;
      }
    }

    // 2. MATCH DES TRAITS (30% du poids)
    if (profile.detectedTraits && job.traits) {
      const jobTraitNames = job.traits.map(t => t.toLowerCase ? t.toLowerCase() : t);
      let traitMatch = 0;

      for (const [trait, data] of Object.entries(profile.detectedTraits)) {
        if (jobTraitNames.some(jt => jt.includes(trait.toLowerCase()))) {
          traitMatch += (data.score || 0.5);
        }
      }

      score += Math.min(traitMatch / (Object.keys(profile.detectedTraits).length || 1), 1) * 0.3;
    }

    // 3. BONUS SOURCE ESCO (10% du poids)
    if (job.source === 'ESCO') {
      score += 0.1;
    }

    return Math.min(score, 1);
  }

  /**
   * Retourne les keywords associés à un domaine d'intérêt
   */
  getInterestKeywords(domain) {
    const keywordMap = {
      'animals': ['animal', 'chien', 'chat', 'vétérin', 'soign', 'soigneur', 'élevage', 'zoo', 'refuge', 'créature', 'breeder', 'caretaker', 'trainer', 'veterinary'],
      'animal-care': ['soin', 'care', 'nourrir', 'animal', 'élevage', 'soigneur', 'refuge', 'breeder', 'caretaker'],
      'agriculture': ['agricul', 'farm', 'elevage', 'crop', 'production', 'rural', 'terrain', 'animal', 'livestock', 'breeder', 'fermier', 'éleveur', 'cultiva'],
      'environment': ['environ', 'nature', 'durable', 'écolog', 'parc', 'naturel', 'sustain', 'guide', 'conserver', 'wildlife'],
      'health': ['santé', 'médical', 'clinique', 'soin', 'hospita', 'infirm', 'soignant', 'care', 'assistant', 'caregiver'],
      'education': ['éducation', 'enseign', 'formateur', 'école', 'professeur', 'pédagog', 'trainer', 'coach'],
      'science': ['science', 'recherche', 'laboratoire', 'analyse', 'chimie', 'physique', 'biologie', 'biolog', 'scientifique', 'specialist'],
      'business': ['business', 'manag', 'market', 'sales', 'financ', 'entrepr', 'gestion'],
      'art': ['art', 'créat', 'design', 'musique', 'graphique', 'visual', 'créative'],
      'technology': ['technolog', 'informatique', 'code', 'programmation', 'digital', 'logiciel'],
      'service': ['service', 'client', 'accueil', 'relation', 'hospit', 'personnel'],
      'sport': ['sport', 'activité physique', 'entraîn', 'fitness', 'coach', 'athlet'],
      'travel': ['voyage', 'tourisme', 'transport', 'hôtel', 'destination', 'international'],
      'cooking': ['cuisine', 'culin', 'restau', 'chef', 'gastronomie', 'aliment'],
      'building': ['construction', 'bâtiment', 'architecte', 'ouvrier', 'génie civil', 'maçon']
    };

    return keywordMap[domain] || [domain];
  }

  /**
   * Échantillonne des métiers de manière distribuée (DEPRECATED - kept for compatibility)
   */
  sampleJobs(jobs, count) {
    if (jobs.length <= count) return jobs;

    const step = Math.floor(jobs.length / count);
    const sampled = [];

    for (let i = 0; i < count && i * step < jobs.length; i++) {
      sampled.push(jobs[i * step]);
    }

    return sampled;
  }

  /**
   * Construit le prompt utilisateur pour le matching
   */
  buildJobMatchingPrompt(profile, jobs) {
    const profileSummary = this.summarizeProfile(profile);

    // Formater les métiers de manière TRÈS compacte pour économiser les tokens
    const jobsFormatted = jobs.map(job => ({
      id: job._id.toString(),
      title: job.title,
      desc: job.description?.substring(0, 100) || '',  // Réduit à 100 chars
      sector: job.sector || '',
      traits: job.traits?.slice(0, 3) || [],  // Max 3 traits
      skills: job.skills?.slice(0, 3) || [],  // Max 3 skills
      edu: job.education || '',
      emp: job.employability || ''
    }));

    // Format compact sans indentation
    return `**PROFIL:**
${profileSummary}

**MÉTIERS (${jobsFormatted.length}):**
${JSON.stringify(jobsFormatted)}

Recommande les 3 MEILLEURS métiers avec explications détaillées.`;
  }

  /**
   * Parse les recommandations de métiers
   */
  parseJobRecommendations(response) {
    try {
      const content = response.content[0].text;

      // Extraire le JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Pas de JSON trouvé dans les recommandations');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        throw new Error('Format de recommandations invalide');
      }

      return parsed.recommendations.map(rec => ({
        jobId: rec.jobId,
        jobTitle: rec.jobTitle,
        matchScore: rec.matchScore || 80,
        reasoning: rec.reasoning || [],
        concerns: rec.concerns || [],
        growthPotential: rec.growthPotential || 'Non spécifié',
        summary: rec.summary || 'Métier recommandé pour vous'
      }));

    } catch (error) {
      console.error('Erreur parsing recommandations:', error.message);
      return [];
    }
  }

  /**
   * Vérifie si le service est disponible
   */
  isAvailable() {
    return !!this.client;
  }
}

module.exports = ClaudeService;

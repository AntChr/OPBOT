/**
 * Script d'analyse des conversations pour identifier patterns et insights
 */

const fs = require('fs');
const path = require('path');

// Charger les données
const conversationsPath = path.join(__dirname, '..', 'exports', 'conversations_1766230106201.txt');
const conversationsData = fs.readFileSync(conversationsPath, 'utf-8');

// Parser le fichier (multiple JSON objects)
let conversations = [];
try {
  // Essayer de parser comme array JSON
  conversations = JSON.parse(conversationsData);
  if (!Array.isArray(conversations)) {
    conversations = [conversations];
  }
} catch (e) {
  // Si ça échoue, essayer de split par objets JSON
  const jsonObjects = conversationsData.split('}\n{');
  conversations = jsonObjects.map((obj, index) => {
    // Ajouter les accolades manquantes
    let fixedObj = obj;
    if (index > 0) fixedObj = '{' + fixedObj;
    if (index < jsonObjects.length - 1) fixedObj = fixedObj + '}';

    try {
      return JSON.parse(fixedObj);
    } catch (parseError) {
      console.error(`Erreur parsing objet ${index}:`, parseError.message);
      return null;
    }
  }).filter(Boolean);
}

console.log(`📊 Analyse de ${conversations.length} conversations\n`);
console.log('='.repeat(80) + '\n');

// === ANALYSE 1: Statistiques générales ===
console.log('📈 STATISTIQUES GÉNÉRALES');
console.log('-'.repeat(80));

const stats = {
  total: conversations.length,
  byStatus: {},
  messageCountDistribution: {},
  totalMessages: 0,
  totalTokens: 0,
  totalCost: 0,
  milestonesReached: {
    passions_identified: 0,
    role_determined: 0,
    domain_identified: 0,
    format_determined: 0,
    specific_job_identified: 0
  }
};

conversations.forEach(conv => {
  // Status
  stats.byStatus[conv.status] = (stats.byStatus[conv.status] || 0) + 1;

  // Messages
  const msgCount = conv.messages?.length || 0;
  stats.messageCountDistribution[msgCount] = (stats.messageCountDistribution[msgCount] || 0) + 1;
  stats.totalMessages += msgCount;

  // Tokens - calculer depuis les messages
  if (conv.messages) {
    conv.messages.forEach(msg => {
      if (msg.metadata?.tokensUsed) {
        const tokens = msg.metadata.tokensUsed;
        stats.totalTokens += (tokens.input_tokens || 0) + (tokens.output_tokens || 0);
      }
    });
  }

  // Cost - calculer depuis les tokens
  // Claude Haiku pricing: $0.80 per million input tokens, $4.00 per million output tokens
  if (conv.messages) {
    conv.messages.forEach(msg => {
      if (msg.metadata?.tokensUsed) {
        const tokens = msg.metadata.tokensUsed;
        const inputCost = (tokens.input_tokens || 0) * 0.80 / 1000000;
        const outputCost = (tokens.output_tokens || 0) * 4.00 / 1000000;
        stats.totalCost += inputCost + outputCost;
      }
    });
  }

  // Milestones
  if (conv.milestones) {
    Object.keys(stats.milestonesReached).forEach(key => {
      if (conv.milestones[key]?.achieved) {
        stats.milestonesReached[key]++;
      }
    });
  }
});

console.log(`Total conversations: ${stats.total}`);
console.log(`\nDistribution par statut:`);
Object.entries(stats.byStatus).forEach(([status, count]) => {
  const pct = ((count / stats.total) * 100).toFixed(1);
  console.log(`  ${status.padEnd(15)}: ${count.toString().padStart(4)} (${pct}%)`);
});

console.log(`\nMessages:`);
console.log(`  Total messages: ${stats.totalMessages}`);
console.log(`  Moyenne par conv: ${(stats.totalMessages / stats.total).toFixed(1)}`);

console.log(`\nDistribution messages par conversation:`);
Object.entries(stats.messageCountDistribution)
  .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
  .slice(0, 15)
  .forEach(([count, conv]) => {
    const pct = ((conv / stats.total) * 100).toFixed(1);
    console.log(`  ${count} msgs: ${conv.toString().padStart(4)} conversations (${pct}%)`);
  });

console.log(`\nTokens et coûts:`);
console.log(`  Total tokens: ${stats.totalTokens.toLocaleString()}`);
console.log(`  Coût total: $${stats.totalCost.toFixed(4)}`);
console.log(`  Coût moyen/conv: $${(stats.totalCost / stats.total).toFixed(4)}`);

console.log(`\nMilestones atteints:`);
Object.entries(stats.milestonesReached).forEach(([key, count]) => {
  const pct = ((count / stats.total) * 100).toFixed(1);
  console.log(`  ${key.padEnd(30)}: ${count.toString().padStart(4)} (${pct}%)`);
});

console.log('\n' + '='.repeat(80) + '\n');

// === ANALYSE 2: Problèmes d'engagement ===
console.log('⚠️  PROBLÈMES D\'ENGAGEMENT');
console.log('-'.repeat(80));

// Conversations abandonnées après 1-3 messages
const earlyAbandonment = conversations.filter(c =>
  (c.messages?.length || 0) <= 3 && c.status === 'abandoned'
);

console.log(`Abandons précoces (≤3 messages): ${earlyAbandonment.length} (${((earlyAbandonment.length/stats.total)*100).toFixed(1)}%)`);

// Conversations avec longues pauses
const withLongPauses = conversations.filter(c => {
  if (!c.messages || c.messages.length < 2) return false;

  for (let i = 1; i < c.messages.length; i++) {
    const prev = c.messages[i-1].timestamp?.$date || c.messages[i-1].timestamp;
    const curr = c.messages[i].timestamp?.$date || c.messages[i].timestamp;
    if (!prev || !curr) continue;

    const prevDate = new Date(prev);
    const currDate = new Date(curr);
    const diff = (currDate - prevDate) / 1000 / 60; // minutes

    if (diff > 30) return true; // Pause > 30min
  }
  return false;
});

console.log(`Conversations avec pauses >30min: ${withLongPauses.length} (${((withLongPauses.length/stats.total)*100).toFixed(1)}%)`);

// Réponses très courtes des utilisateurs
const shortResponses = [];
conversations.forEach(c => {
  if (!c.messages) return;

  const userMessages = c.messages.filter(m => m.role === 'user');
  if (userMessages.length === 0) return;

  const avgWordCount = userMessages.reduce((sum, m) => {
    const words = (m.content?.split(/\s+/).length || 0);
    return sum + words;
  }, 0) / userMessages.length;

  if (avgWordCount < 2) {
    shortResponses.push({
      convId: c._id?.$oid || c._id,
      avgWords: avgWordCount.toFixed(1),
      userMsgs: userMessages.length
    });
  }
});

console.log(`Conversations avec réponses moyennes <2 mots: ${shortResponses.length} (${((shortResponses.length/stats.total)*100).toFixed(1)}%)`);

console.log('\n' + '='.repeat(80) + '\n');

// === ANALYSE 3: Conversations réussies ===
console.log('✅ CONVERSATIONS RÉUSSIES');
console.log('-'.repeat(80));

const successful = conversations.filter(c =>
  c.status === 'completed' &&
  (c.messages?.length || 0) > 10
);

console.log(`Conversations complétées avec >10 messages: ${successful.length}`);

if (successful.length > 0) {
  const avgMessages = successful.reduce((sum, c) => sum + (c.messages?.length || 0), 0) / successful.length;
  const avgTokens = successful.reduce((sum, c) => sum + (c.tokens?.total || 0), 0) / successful.length;
  const avgCost = successful.reduce((sum, c) => sum + (c.cost || 0), 0) / successful.length;

  console.log(`\nMoyennes conversations réussies:`);
  console.log(`  Messages: ${avgMessages.toFixed(1)}`);
  console.log(`  Tokens: ${avgTokens.toLocaleString()}`);
  console.log(`  Coût: $${avgCost.toFixed(4)}`);

  // Milestones des conversations réussies
  const milestonesSuccess = {
    passions_identified: 0,
    role_determined: 0,
    domain_identified: 0,
    format_determined: 0,
    specific_job_identified: 0
  };

  successful.forEach(c => {
    if (c.milestones) {
      Object.keys(milestonesSuccess).forEach(key => {
        if (c.milestones[key]?.achieved) {
          milestonesSuccess[key]++;
        }
      });
    }
  });

  console.log(`\nMilestones (conversations réussies):`);
  Object.entries(milestonesSuccess).forEach(([key, count]) => {
    const pct = ((count / successful.length) * 100).toFixed(1);
    console.log(`  ${key.padEnd(30)}: ${count.toString().padStart(4)} (${pct}%)`);
  });
}

console.log('\n' + '='.repeat(80) + '\n');

// === ANALYSE 4: Jobs identifiés ===
console.log('💼 MÉTIERS IDENTIFIÉS');
console.log('-'.repeat(80));

const withJobs = conversations.filter(c => c.milestones?.specific_job_identified?.jobTitle);
console.log(`Conversations avec métier identifié: ${withJobs.length} (${((withJobs.length/stats.total)*100).toFixed(1)}%)`);

if (withJobs.length > 0) {
  console.log(`\nMétiers identifiés:`);
  withJobs.forEach((c, i) => {
    const jobTitle = c.milestones.specific_job_identified.jobTitle;
    const confidence = c.milestones.specific_job_identified.confidence || 'N/A';
    console.log(`  ${i+1}. ${jobTitle} (confiance: ${confidence}%)`);
  });
}

console.log('\n' + '='.repeat(80) + '\n');

// === ANALYSE 5: Recommandations ===
console.log('💡 RECOMMANDATIONS PRIORITAIRES');
console.log('-'.repeat(80));

const recommendations = [];

// Taux d'abandon précoce
const earlyAbandonmentRate = (earlyAbandonment.length / stats.total) * 100;
if (earlyAbandonmentRate > 30) {
  recommendations.push({
    priority: 'CRITIQUE',
    issue: `${earlyAbandonmentRate.toFixed(1)}% d'abandons précoces (≤3 messages)`,
    solution: 'Améliorer l\'onboarding: expliquer le process, donner des exemples, montrer la progression'
  });
}

// Réponses trop courtes
const shortResponsesRate = (shortResponses.length / stats.total) * 100;
if (shortResponsesRate > 20) {
  recommendations.push({
    priority: 'HAUTE',
    issue: `${shortResponsesRate.toFixed(1)}% de conversations avec réponses moyennes <2 mots`,
    solution: 'Ajouter des suggestions/options à choix multiples pour guider les utilisateurs'
  });
}

// Taux de complétion milestone
const jobIdentifiedRate = (stats.milestonesReached.specific_job_identified / stats.total) * 100;
if (jobIdentifiedRate < 20) {
  recommendations.push({
    priority: 'HAUTE',
    issue: `Seulement ${jobIdentifiedRate.toFixed(1)}% atteignent "specific_job_identified"`,
    solution: 'Simplifier le parcours, réduire le nombre d\'étapes nécessaires'
  });
}

// Coût par conversation
const avgCostPerConv = stats.totalCost / stats.total;
if (avgCostPerConv > 0.05) {
  recommendations.push({
    priority: 'MOYENNE',
    issue: `Coût moyen de $${avgCostPerConv.toFixed(4)} par conversation`,
    solution: 'Optimiser les prompts, utiliser cache, ou modèle moins cher pour premières questions'
  });
}

recommendations.forEach((rec, i) => {
  console.log(`\n${i + 1}. [${rec.priority}] ${rec.issue}`);
  console.log(`   → Solution: ${rec.solution}`);
});

console.log('\n' + '='.repeat(80) + '\n');

// === ANALYSE 6: Feedbacks des questionnaires ===
console.log('📝 ANALYSE DES QUESTIONNAIRES');
console.log('-'.repeat(80));

try {
  const questionnairesPath = path.join(__dirname, '..', 'exports', 'questionnaires_1766230106227.txt');
  const questionnairesData = fs.readFileSync(questionnairesPath, 'utf-8');

  // Parser les questionnaires (format personnalisé)
  const questionnaires = [];
  const lines = questionnairesData.split('\n');
  let current = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === '_id' && Object.keys(current).length > 0) {
      questionnaires.push(current);
      current = {};
    }

    // Parser les ratings
    if (line === 'resultClarity') current.resultClarity = parseInt(lines[++i]);
    if (line === 'jobRelevance') current.jobRelevance = parseInt(lines[++i]);
    if (line === 'conversationQuality') current.conversationQuality = parseInt(lines[++i]);
    if (line === 'overallUsefulness') current.overallUsefulness = parseInt(lines[++i]);

    // Parser les comments
    if (line === 'positives') current.positives = lines[++i].replace(/^"|"$/g, '');
    if (line === 'improvements') current.improvements = lines[++i].replace(/^"|"$/g, '');
    if (line === 'general') current.general = lines[++i].replace(/^"|"$/g, '');

    if (line.startsWith('"') && line.includes('jobTitle')) {
      current.jobTitle = line.replace(/^"|"$/g, '');
    }
  }

  if (Object.keys(current).length > 0) questionnaires.push(current);

  console.log(`Total questionnaires: ${questionnaires.length}\n`);

  if (questionnaires.length > 0) {
    // Calculer moyennes
    const avgRatings = {
      resultClarity: 0,
      jobRelevance: 0,
      conversationQuality: 0,
      overallUsefulness: 0
    };

    let validCount = 0;
    questionnaires.forEach(q => {
      if (q.resultClarity && q.jobRelevance && q.conversationQuality && q.overallUsefulness) {
        avgRatings.resultClarity += q.resultClarity;
        avgRatings.jobRelevance += q.jobRelevance;
        avgRatings.conversationQuality += q.conversationQuality;
        avgRatings.overallUsefulness += q.overallUsefulness;
        validCount++;
      }
    });

    console.log('Moyennes des notes (/5):');
    Object.entries(avgRatings).forEach(([key, sum]) => {
      const avg = (sum / validCount).toFixed(1);
      console.log(`  ${key.padEnd(25)}: ${avg}/5`);
    });

    // Feedbacks clés
    console.log('\n📌 Feedbacks positifs récurrents:');
    const positives = questionnaires.map(q => q.positives).filter(Boolean);
    positives.forEach((p, i) => {
      if (p && p.length > 5) console.log(`  ${i + 1}. "${p.substring(0, 80)}${p.length > 80 ? '...' : ''}"`);
    });

    console.log('\n⚠️ Points d\'amélioration suggérés:');
    const improvements = questionnaires.map(q => q.improvements).filter(Boolean);
    improvements.forEach((imp, i) => {
      if (imp && imp.length > 5) console.log(`  ${i + 1}. "${imp.substring(0, 100)}${imp.length > 100 ? '...' : ''}"`);
    });
  }
} catch (error) {
  console.log('Erreur lors de l\'analyse des questionnaires:', error.message);
}

console.log('\n' + '='.repeat(80));
console.log('\n✅ Analyse terminée!');

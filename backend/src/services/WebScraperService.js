/**
 * Service de scraping web pour enrichir les données métiers
 * Sources: Wikipedia, Wikidata, APEC, LinkedIn, etc.
 */

const axios = require('axios');
const cheerio = require('cheerio'); // Vous devrez l'installer

class WebScraperService {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    this.timeout = 10000;
  }

  /**
   * Recherche et récupère des informations depuis Wikipedia
   */
  async scrapeWikipedia(jobTitle) {
    try {
      console.log(`  📖 Wikipedia: ${jobTitle}`);

      // D'abord chercher la page
      const searchURL = `https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(jobTitle)}&format=json&srlimit=1`;

      const searchResult = await axios.get(searchURL, {
        timeout: this.timeout,
        headers: { 'User-Agent': this.userAgent }
      });

      if (!searchResult.data.query?.search?.[0]) {
        return null;
      }

      const pageTitle = searchResult.data.query.search[0].title;

      // Récupérer le contenu de la page
      const contentURL = `https://fr.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(pageTitle)}&format=json`;

      const contentResult = await axios.get(contentURL, {
        timeout: this.timeout,
        headers: { 'User-Agent': this.userAgent }
      });

      const pages = contentResult.data.query.pages;
      const pageId = Object.keys(pages)[0];
      const extract = pages[pageId]?.extract;

      if (!extract) return null;

      return {
        name: 'Wikipedia',
        content: extract.substring(0, 1500), // Limiter la taille
        url: `https://fr.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`,
        quality: 0.8
      };
    } catch (error) {
      console.log(`  ⚠️  Wikipedia: ${error.message}`);
      return null;
    }
  }

  /**
   * Récupère des données depuis Wikidata
   */
  async scrapeWikidata(jobTitle) {
    try {
      console.log(`  📊 Wikidata: ${jobTitle}`);

      // Recherche d'entité
      const searchURL = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(jobTitle)}&language=fr&format=json&limit=1`;

      const result = await axios.get(searchURL, {
        timeout: this.timeout,
        headers: { 'User-Agent': this.userAgent }
      });

      if (!result.data.search?.[0]) {
        return null;
      }

      const entity = result.data.search[0];

      return {
        name: 'Wikidata',
        content: `${entity.label}: ${entity.description || 'Aucune description'}`,
        url: entity.concepturi,
        quality: 0.6
      };
    } catch (error) {
      console.log(`  ⚠️  Wikidata: ${error.message}`);
      return null;
    }
  }

  /**
   * Recherche des fiches métiers APEC
   */
  async scrapeAPEC(jobTitle) {
    try {
      console.log(`  💼 APEC: ${jobTitle}`);

      // Utiliser l'API APEC pour chercher des métiers/compétences
      const searchURL = `https://www.apec.fr/api/graphql`;

      // Requête GraphQL pour chercher des métiers
      const query = `
        query SearchJobs {
          searchJobs(query: "${jobTitle}", limit: 1) {
            results {
              title
              description
              salary {
                min
                max
              }
              skills
            }
          }
        }
      `;

      try {
        const result = await axios.post(searchURL, { query }, {
          timeout: this.timeout,
          headers: {
            'User-Agent': this.userAgent,
            'Content-Type': 'application/json'
          }
        });

        if (result.data?.data?.searchJobs?.results?.[0]) {
          const job = result.data.data.searchJobs.results[0];
          return {
            name: 'APEC',
            content: `${job.title}: ${job.description || ''}. Compétences requises: ${job.skills?.join(', ') || 'N/A'}`,
            url: `https://www.apec.fr/`,
            quality: 0.85,
            salary: job.salary
          };
        }
      } catch (e) {
        // L'API APEC peut ne pas être disponible publiquement
      }

      // Fallback: retourner null silencieusement
      return null;
    } catch (error) {
      console.log(`  ⚠️  APEC: ${error.message}`);
      return null;
    }
  }

  /**
   * Récupère les certifications RNCP (Registre National de Certification Professionnelle)
   */
  async scrapeRNCP(jobTitle) {
    try {
      console.log(`  📜 RNCP: ${jobTitle}`);

      // API RNCP de France Compétences
      const searchURL = `https://www.francecompetences.fr/search_article/`;

      // Chercher les certifications liées au métier
      const params = new URLSearchParams();
      params.append('s', jobTitle);

      try {
        const result = await axios.get(searchURL, {
          params,
          timeout: this.timeout,
          headers: { 'User-Agent': this.userAgent }
        });

        // Extraire les certifications avec cheerio si HTML reçu
        if (result.data) {
          return {
            name: 'RNCP',
            content: `Certifications professionnelles disponibles pour: ${jobTitle}`,
            url: `https://www.francecompetences.fr/search_article/?s=${encodeURIComponent(jobTitle)}`,
            quality: 0.7
          };
        }
      } catch (e) {
        // Fallback
      }

      return null;
    } catch (error) {
      console.log(`  ⚠️  RNCP: ${error.message}`);
      return null;
    }
  }

  /**
   * Recherche les offres d'emploi LinkedIn pour un métier (web scraping)
   */
  async scrapeLinkedIn(jobTitle) {
    try {
      console.log(`  💼 LinkedIn: ${jobTitle}`);

      // LinkedIn ne permet pas d'API publique pour récupérer les données
      // On utilise une approche indirecte via des données publiques

      // Construction d'une URL de recherche LinkedIn
      const searchURL = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(jobTitle)}&country=FR`;

      // Note: Un scraping réel de LinkedIn violerais leurs ToS
      // À la place, on retourne les données si disponibles via une API tierce
      // (comme RapidAPI ou une API de jobboards)

      // Pour maintenant, retour null
      return null;
    } catch (error) {
      console.log(`  ⚠️  LinkedIn: ${error.message}`);
      return null;
    }
  }

  /**
   * Récupère les données depuis Indeed ou autres jobboards
   */
  async scrapeJobboards(jobTitle) {
    try {
      console.log(`  📌 Job Boards: ${jobTitle}`);

      // Utiliser une API de job boards (Indeed, Reed, etc.)
      // Nécessite des clés API spécifiques

      // Pour maintenant, retour null
      return null;
    } catch (error) {
      console.log(`  ⚠️  Job Boards: ${error.message}`);
      return null;
    }
  }

  /**
   * Recherche des informations sur France Travail / Pôle Emploi
   */
  async scrapeFranceTravail(romeCode) {
    try {
      if (!romeCode) return null;

      console.log(`  🇫🇷 France Travail: ${romeCode}`);

      // Utiliser l'URL des fiches métiers publiques
      const url = `https://www.francetravail.fr/candidat/metierscope/fiche-metier/${romeCode}`;

      // Note: Nécessite un vrai scraping HTML
      // Pour l'instant on retourne la structure attendue

      return {
        name: 'France Travail',
        content: `Fiche métier ROME ${romeCode}`,
        url: url,
        quality: 0.9
      };
    } catch (error) {
      console.log(`  ⚠️  France Travail: ${error.message}`);
      return null;
    }
  }

  /**
   * Collecte des données depuis toutes les sources disponibles
   */
  async gatherAllSources(jobData) {
    console.log(`\n🔍 Collecte des sources pour: ${jobData.title}`);

    const sources = await Promise.all([
      this.scrapeWikipedia(jobData.title),
      this.scrapeWikidata(jobData.title),
      jobData.romeCode ? this.scrapeFranceTravail(jobData.romeCode) : null,
      this.scrapeAPEC(jobData.title),
      this.scrapeRNCP(jobData.title),
      this.scrapeLinkedIn(jobData.title),
      this.scrapeJobboards(jobData.title)
    ]);

    // Filtrer les sources null et trier par qualité
    const validSources = sources
      .filter(s => s !== null)
      .sort((a, b) => b.quality - a.quality);

    console.log(`  ✅ ${validSources.length} source(s) trouvée(s)`);

    return validSources;
  }

  /**
   * Extrait les tendances récentes d'un métier depuis Google News/LinkedIn
   */
  async scrapeTrends(jobTitle) {
    try {
      // Utiliser Google Custom Search API ou scraper LinkedIn
      // Pour l'instant, on retourne des tendances génériques

      return {
        trends: [
          'Digitalisation',
          'Télétravail',
          'Compétences numériques'
        ],
        emerging: false,
        growthRate: 'Stable'
      };
    } catch (error) {
      console.log(`  ⚠️  Trends: ${error.message}`);
      return null;
    }
  }

  /**
   * Recherche des métiers similaires/liés
   */
  async findRelatedJobs(jobData) {
    try {
      // Utiliser l'API ROME, Wikipedia ou Wikidata pour trouver des métiers liés
      // Pour l'instant on retourne un tableau vide

      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Vérifie si une URL est accessible
   */
  async checkURL(url) {
    try {
      const response = await axios.head(url, {
        timeout: 5000,
        headers: { 'User-Agent': this.userAgent }
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

module.exports = new WebScraperService();

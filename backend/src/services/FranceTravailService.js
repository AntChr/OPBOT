const axios = require('axios');

/**
 * Service pour interagir avec l'API France Travail (ROME 4.0)
 * Documentation: https://francetravail.io/data/api/rome
 *
 * L'API ROME 4.0 propose 4 endpoints principaux:
 * - Compétences: Référentiel des compétences
 * - Métiers: Référentiel des métiers
 * - Fiches métiers: Fiches détaillées des métiers
 * - Contextes de travail: Contextes professionnels
 */
class FranceTravailService {
  constructor() {
    this.baseURL = 'https://api.francetravail.io/partenaire';
    this.authURL = 'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire';
    this.clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID;
    this.clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Authentification OAuth2 pour obtenir un token d'accès
   */
  async authenticate() {
    try {
      // Si le token est encore valide, on le réutilise
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      console.log('🔑 Authentification auprès de France Travail...');

      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('scope', 'api_romev1 nomenclatureRome');

      // Encodage en Base64 pour Basic Auth
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await axios.post(this.authURL, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      });

      this.accessToken = response.data.access_token;
      // Le token expire généralement après 1499 secondes, on met une marge de sécurité
      this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;

      console.log('✅ Authentification réussie');
      return this.accessToken;
    } catch (error) {
      console.error('❌ Erreur d\'authentification:', error.response?.data || error.message);
      throw new Error('Échec de l\'authentification France Travail');
    }
  }

  /**
   * Récupère la liste complète des fiches métiers ROME
   */
  async getAllJobSheets() {
    try {
      const token = await this.authenticate();
      console.log('📥 Récupération des fiches métiers ROME...');

      const response = await axios.get(`${this.baseURL}/rome/v1/appellation`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      console.log(`✅ ${response.data.length} fiches métiers récupérées`);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des fiches métiers:',
        error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Récupère les détails d'une fiche métier spécifique par son code ROME
   * @param {string} romeCode - Code ROME (ex: "M1805")
   */
  async getJobSheetByCode(romeCode) {
    try {
      const token = await this.authenticate();

      const response = await axios.get(
        `${this.baseURL}/rome/v1/metier/${romeCode}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error(`❌ Erreur lors de la récupération du métier ${romeCode}:`,
        error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Récupère les compétences associées à un métier
   * @param {string} romeCode - Code ROME
   */
  async getJobCompetences(romeCode) {
    try {
      const token = await this.authenticate();

      const response = await axios.get(
        `${this.baseURL}/rome/v1/metier/${romeCode}/competences`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error(`❌ Erreur lors de la récupération des compétences pour ${romeCode}:`,
        error.response?.data || error.message);
      return { savoirFaire: [], savoirs: [] }; // Retour par défaut
    }
  }

  /**
   * Récupère les contextes de travail pour un métier
   * @param {string} romeCode - Code ROME
   */
  async getJobContexts(romeCode) {
    try {
      const token = await this.authenticate();

      const response = await axios.get(
        `${this.baseURL}/rome/v1/metier/${romeCode}/contextes`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error(`❌ Erreur lors de la récupération des contextes pour ${romeCode}:`,
        error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Récupère toutes les informations complètes d'un métier
   * @param {string} romeCode - Code ROME
   */
  async getCompleteJobData(romeCode) {
    try {
      const [jobSheet, competences, contexts] = await Promise.all([
        this.getJobSheetByCode(romeCode),
        this.getJobCompetences(romeCode),
        this.getJobContexts(romeCode)
      ]);

      return {
        ...jobSheet,
        competences,
        contexts
      };
    } catch (error) {
      console.error(`❌ Erreur lors de la récupération complète du métier ${romeCode}`);
      throw error;
    }
  }

  /**
   * Test de connexion à l'API
   */
  async testConnection() {
    try {
      await this.authenticate();
      console.log('✅ Connexion à l\'API France Travail réussie');
      return true;
    } catch (error) {
      console.error('❌ Échec de la connexion à l\'API France Travail');
      return false;
    }
  }
}

module.exports = new FranceTravailService();

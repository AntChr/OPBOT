import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';

/**
 * Composant d'administration pour gérer et visualiser les métiers
 * Affiche un tableau avec filtrage, recherche et statistiques d'enrichissement
 */
const JobsList = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [sectors, setSectors] = useState([]);

  // Filtres
  const [search, setSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [enrichedFilter, setEnrichedFilter] = useState('');
  const [minQuality, setMinQuality] = useState(0);
  const [limit] = useState(50);
  const [skip, setSkip] = useState(0);

  // Détails
  const [selectedJob, setSelectedJob] = useState(null);

  // Charger les données initiales
  useEffect(() => {
    fetchStats();
    fetchSectors();
    fetchJobs();
  }, []);

  // Fetch jobs avec filtres
  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedSector) params.append('sector', selectedSector);
      if (enrichedFilter) params.append('enriched', enrichedFilter);
      if (minQuality > 0) params.append('minQuality', minQuality);
      params.append('limit', limit);
      params.append('skip', skip);

      const response = await axios.get(
        `${API_URL}/api/jobs?${params.toString()}`
      );

      if (response.data.success) {
        setJobs(response.data.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des métiers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistiques
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/jobs/stats/summary`);
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error);
    }
  };

  // Fetch secteurs
  const fetchSectors = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/jobs/sectors/list`);
      if (response.data.success) {
        setSectors(response.data.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des secteurs:', error);
    }
  };

  // Réinitialiser les filtres et rechercher
  const handleSearch = () => {
    setSkip(0);
    fetchJobs();
  };

  // Réinitialiser tous les filtres
  const resetFilters = () => {
    setSearch('');
    setSelectedSector('');
    setEnrichedFilter('');
    setMinQuality(0);
    setSkip(0);
    setSelectedJob(null);
  };

  // Déclencher l'enrichissement
  const triggerEnrichment = async (jobId) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/jobs/enrichment-trigger`,
        { jobId, force: true }
      );
      alert(`Enrichissement déclenché: ${response.data.message}`);
    } catch {
      alert('Erreur lors du déclenchement de l\'enrichissement');
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <h2 className="text-3xl font-bold mb-4">📊 Gestion des Métiers</h2>
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/20 rounded p-4">
              <p className="text-blue-100">Total Métiers</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <div className="bg-white/20 rounded p-4">
              <p className="text-blue-100">Enrichis</p>
              <p className="text-3xl font-bold">{stats.enriched}</p>
              <p className="text-sm">{stats.enrichmentRate}</p>
            </div>
            <div className="bg-white/20 rounded p-4">
              <p className="text-blue-100">Qualité Moyenne</p>
              <p className="text-3xl font-bold">{(stats.avgQuality * 100).toFixed(0)}%</p>
            </div>
            <div className="bg-white/20 rounded p-4">
              <p className="text-blue-100">Sources</p>
              <p className="text-3xl font-bold">{stats.sources?.length || 0}</p>
            </div>
          </div>
        )}
      </div>

      {/* Filtres - Une seule ligne */}
      <div className="bg-transparent rounded-lg p-4">
        <div className="d-flex flex-wrap gap-2 items-end">
          {/* Recherche */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-gray-300 mb-1">Recherche</label>
            <input
              type="text"
              placeholder="Titre ou code ROME..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
            />
          </div>

          {/* Secteur */}
          <div className="min-w-[180px]">
            <label className="block text-sm text-gray-300 mb-1">Secteur</label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous</option>
              {sectors.map((sector) => (
                <option key={sector} value={sector}>
                  {sector}
                </option>
              ))}
            </select>
          </div>

          {/* Enrichissement */}
          <div className="min-w-[140px]">
            <label className="block text-sm text-gray-300 mb-1">État</label>
            <select
              value={enrichedFilter}
              onChange={(e) => setEnrichedFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous</option>
              <option value="true">✅ Enrichis</option>
              <option value="false">❌ À enrichir</option>
            </select>
          </div>

          {/* Qualité */}
          <div className="min-w-[140px]">
            <label className="block text-sm text-gray-300 mb-1">Qualité: {Math.round(minQuality * 100)}%</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={minQuality}
              onChange={(e) => setMinQuality(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition whitespace-nowrap"
            >
              {loading ? '🔄' : '🔍'}
            </button>
            <button
              onClick={resetFilters}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition whitespace-nowrap"
            >
              ⟲
            </button>
          </div>
        </div>
      </div>

      {/* Tableau des métiers */}
      <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900 border-b-2 border-blue-500">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-white">Titre</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-white">Code ROME</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-white">Secteur</th>
                <th className="px-6 py-3 text-center text-sm font-bold text-white">Qualité</th>
                <th className="px-6 py-3 text-center text-sm font-bold text-white">État</th>
                <th className="px-6 py-3 text-center text-sm font-bold text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                    Aucun métier trouvé
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job._id} className="hover:bg-gray-700 transition border-l-4 border-l-gray-700 hover:border-l-blue-500">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="text-blue-300 hover:text-blue-100 font-semibold transition"
                      >
                        {job.title}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-white font-mono text-sm">{job.romeCode || '-'}</td>
                    <td className="px-6 py-4 text-white">{job.sector || '-'}</td>
                    <td className="px-6 py-4 text-center text-white">
                      {job.dataQuality ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-900 text-green-100">
                          {Math.round(job.dataQuality * 100)}%
                        </span>
                      ) : (
                        <span className="text-gray-500 font-semibold">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-xl">
                      {job.enrichedAt ? (
                        <span className="text-green-400">✅</span>
                      ) : (
                        <span className="text-red-400">❌</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => triggerEnrichment(job._id)}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold py-1.5 px-3 rounded-lg transition text-sm"
                        
                      >
                        🚀 <span style={{ color: 'black' }}>Enrichir</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL - Détails du métier */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-800 p-6 flex justify-between items-start text-white">
              <div>
                <h3 className="text-3xl font-bold">{selectedJob.title}</h3>
                <p className="text-blue-200 mt-1">{selectedJob.romeCode}</p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-3xl font-light hover:text-gray-300 transition"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 text-gray-100">
              {/* Description */}
              {selectedJob.description && (
                <div>
                  <h4 className="text-lg font-bold mb-2 text-blue-400">📝 Description</h4>
                  <p className="text-gray-300 leading-relaxed">{selectedJob.description}</p>
                </div>
              )}

              <hr className="border-gray-700" />

              {/* Compétences & Education */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedJob.skills && selectedJob.skills.length > 0 && (
                  <div>
                    <h4 className="text-lg font-bold mb-3 text-blue-400">🎯 Compétences ({selectedJob.skills.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.skills.map((skill, idx) => (
                        <span key={idx} className="bg-blue-900 text-blue-200 px-3 py-1 rounded-full text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedJob.education && (
                  <div>
                    <h4 className="text-lg font-bold mb-3 text-blue-400">🎓 Éducation</h4>
                    <p className="text-gray-300">{selectedJob.education}</p>
                  </div>
                )}
              </div>

              {selectedJob.riasec && selectedJob.riasec.length > 0 && (
                <div>
                  <h4 className="text-lg font-bold mb-2 text-blue-400">🧬 Codes RIASEC</h4>
                  <p className="text-gray-300">{selectedJob.riasec.join(', ')}</p>
                </div>
              )}

              <hr className="border-gray-700" />

              {/* TraitVector */}
              {selectedJob.traitVector && selectedJob.traitVector.size > 0 && (
                <div>
                  <h4 className="text-lg font-bold mb-4 text-blue-400">📊 Profil Traits</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from(selectedJob.traitVector).map(([trait, value]) => (
                      <div key={trait}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-300 capitalize">{trait}</span>
                          <span className="text-sm font-bold text-blue-400">{Math.round(value * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${value * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <hr className="border-gray-700" />

              {/* Carrière & Environnement */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedJob.careerPath && selectedJob.careerPath.length > 0 && (
                  <div>
                    <h4 className="text-lg font-bold mb-3 text-blue-400">📈 Carrière</h4>
                    <ul className="space-y-2">
                      {selectedJob.careerPath.map((path, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="mr-2">→</span>
                          <span className="text-gray-300">{path}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedJob.workEnvironment && (
                  <div>
                    <h4 className="text-lg font-bold mb-3 text-blue-400">🏢 Environnement</h4>
                    <p className="text-gray-300">{selectedJob.workEnvironment}</p>
                  </div>
                )}
              </div>

              <hr className="border-gray-700" />

              {/* Métadonnées */}
              <div className="bg-gray-800 rounded p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Qualité:</span>
                  <span className="text-blue-400 font-semibold">{selectedJob.dataQuality ? `${Math.round(selectedJob.dataQuality * 100)}%` : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Mis à jour:</span>
                  <span className="text-gray-300">{selectedJob.enrichedAt ? new Date(selectedJob.enrichedAt).toLocaleDateString('fr-FR') : '-'}</span>
                </div>
                {selectedJob.enrichedSources && selectedJob.enrichedSources.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sources:</span>
                    <span className="text-gray-300">{selectedJob.enrichedSources.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobsList;

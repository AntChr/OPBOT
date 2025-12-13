import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ConversationLogs.css';

const ConversationLogs = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversationDetails, setConversationDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, active, completed, abandoned

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/conversations/admin/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(response.data.conversations);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Erreur lors du chargement des conversations');
      setLoading(false);
    }
  };

  const fetchConversationDetails = async (conversationId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/conversations/admin/${conversationId}/details`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConversationDetails(response.data);
      setSelectedConversation(conversationId);
    } catch (err) {
      console.error('Error fetching conversation details:', err);
      alert('Erreur lors du chargement des détails');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { text: 'Active', class: 'status-active' },
      completed: { text: 'Terminée', class: 'status-completed' },
      abandoned: { text: 'Abandonnée', class: 'status-abandoned' },
      paused: { text: 'Pause', class: 'status-paused' }
    };
    const badge = badges[status] || { text: status, class: 'status-default' };
    return <span className={`status-badge ${badge.class}`}>{badge.text}</span>;
  };

  const getMilestoneProgress = (milestones) => {
    if (!milestones) return 0;
    const total = 5;
    const achieved = Object.values(milestones).filter(m => m.achieved).length;
    return (achieved / total) * 100;
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredConversations = conversations.filter(conv => {
    if (filter === 'all') return true;
    return conv.status === filter;
  });

  if (loading) {
    return (
      <div className="conversation-logs-container">
        <div className="loading-state">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <p>Chargement des conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="conversation-logs-container">
        <div className="error-state">
          <i className="fa-solid fa-exclamation-circle"></i>
          <p>{error}</p>
          <button onClick={fetchConversations} className="retry-btn">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="conversation-logs-container">
      <div className="logs-header">
        <h2>
          <i className="fa-solid fa-comments"></i> Logs des Conversations
        </h2>
        <div className="header-stats">
          <div className="stat-card">
            <span className="stat-value">{conversations.length}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {conversations.filter(c => c.status === 'active').length}
            </span>
            <span className="stat-label">Actives</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {conversations.filter(c => c.status === 'completed').length}
            </span>
            <span className="stat-label">Terminées</span>
          </div>
        </div>
      </div>

      <div className="filter-section">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Toutes
        </button>
        <button
          className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          Actives
        </button>
        <button
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Terminées
        </button>
        <button
          className={`filter-btn ${filter === 'abandoned' ? 'active' : ''}`}
          onClick={() => setFilter('abandoned')}
        >
          Abandonnées
        </button>
      </div>

      <div className="conversations-grid">
        <div className="conversations-list">
          <h3>Conversations ({filteredConversations.length})</h3>
          {filteredConversations.length === 0 ? (
            <div className="empty-state">
              <i className="fa-solid fa-inbox"></i>
              <p>Aucune conversation trouvée</p>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <div
                key={conv._id}
                className={`conversation-card ${selectedConversation === conv._id ? 'selected' : ''}`}
                onClick={() => fetchConversationDetails(conv._id)}
              >
                <div className="card-header">
                  <div className="user-info">
                    <i className="fa-solid fa-user"></i>
                    <div>
                      <strong>{conv.user?.name || 'Utilisateur'}</strong>
                      <small>{conv.user?.email}</small>
                    </div>
                  </div>
                  {getStatusBadge(conv.status)}
                </div>
                <div className="card-body">
                  <div className="info-row">
                    <i className="fa-solid fa-calendar"></i>
                    <span>{formatDate(conv.startedAt)}</span>
                  </div>
                  <div className="info-row">
                    <i className="fa-solid fa-message"></i>
                    <span>{conv.messageCount} messages</span>
                  </div>
                  {conv.jobTitle && (
                    <div className="info-row job-title">
                      <i className="fa-solid fa-briefcase"></i>
                      <span>{conv.jobTitle}</span>
                    </div>
                  )}
                  <div className="milestone-progress">
                    <div className="progress-bar-container">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${getMilestoneProgress(conv.milestones)}%` }}
                      />
                    </div>
                    <span className="progress-text">
                      {Math.round(getMilestoneProgress(conv.milestones))}% complété
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="conversation-details">
          {!conversationDetails ? (
            <div className="empty-details">
              <i className="fa-solid fa-hand-pointer"></i>
              <p>Sélectionnez une conversation pour voir les détails</p>
            </div>
          ) : (
            <>
              <div className="details-header">
                <h3>Détails de la conversation</h3>
                <button
                  className="close-btn"
                  onClick={() => {
                    setSelectedConversation(null);
                    setConversationDetails(null);
                  }}
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>

              <div className="details-content">
                <div className="section">
                  <h4>Informations générales</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Utilisateur</label>
                      <span>{conversationDetails.userId?.name} ({conversationDetails.userId?.email})</span>
                    </div>
                    <div className="info-item">
                      <label>Statut</label>
                      {getStatusBadge(conversationDetails.status)}
                    </div>
                    <div className="info-item">
                      <label>Démarrée le</label>
                      <span>{formatDate(conversationDetails.startedAt)}</span>
                    </div>
                    <div className="info-item">
                      <label>Dernière activité</label>
                      <span>{formatDate(conversationDetails.lastActiveAt)}</span>
                    </div>
                    {conversationDetails.completedAt && (
                      <div className="info-item">
                        <label>Terminée le</label>
                        <span>{formatDate(conversationDetails.completedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="section">
                  <h4>Milestones</h4>
                  <div className="milestones-list">
                    {Object.entries(conversationDetails.milestones || {}).map(([key, value]) => (
                      <div key={key} className={`milestone-item ${value.achieved ? 'achieved' : ''}`}>
                        <i className={`fa-solid ${value.achieved ? 'fa-check-circle' : 'fa-circle'}`}></i>
                        <div className="milestone-content">
                          <strong>{key.replace(/_/g, ' ')}</strong>
                          {value.value && <span className="milestone-value">{value.value}</span>}
                          {value.confidence > 0 && (
                            <span className="milestone-confidence">{value.confidence}% confiance</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="section">
                  <h4>Messages ({conversationDetails.messages?.length || 0})</h4>
                  <div className="messages-list">
                    {conversationDetails.messages?.map((msg, index) => (
                      <div key={msg.id || index} className={`message-item ${msg.role}`}>
                        <div className="message-header">
                          <i className={`fa-solid ${msg.role === 'user' ? 'fa-user' : 'fa-robot'}`}></i>
                          <strong>{msg.role === 'user' ? 'Utilisateur' : 'Assistant'}</strong>
                          <span className="message-time">{formatDate(msg.timestamp)}</span>
                        </div>
                        <div className="message-content">{msg.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationLogs;

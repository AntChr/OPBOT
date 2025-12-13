import { useState } from 'react';
import './GradientSwitcher.css';

const GradientSwitcher = () => {
  const gradients = [
    {
      id: 1,
      name: 'Indigo → Rose',
      description: 'Classique, créatif',
      primary: '#6366F1',
      secondary: '#EC4899',
    },
    {
      id: 2,
      name: 'Cyan → Bleu Océan',
      description: 'Fresh & Professional',
      primary: '#06B6D4',
      secondary: '#0369A1',
      recommended: true,
    },
    {
      id: 3,
      name: 'Vert → Teal',
      description: 'Growth & Nature',
      primary: '#10B981',
      secondary: '#14B8A6',
    },
    {
      id: 4,
      name: 'Orange → Rose',
      description: 'Energy & Passion',
      primary: '#F97316',
      secondary: '#EC4899',
    },
    {
      id: 5,
      name: 'Violet → Bleu',
      description: 'Mystique & Premium',
      primary: '#8B5CF6',
      secondary: '#3B82F6',
    },
  ];

  const [selectedGradient, setSelectedGradient] = useState(2);

  const applyGradient = (gradient) => {
    setSelectedGradient(gradient.id);
    document.documentElement.style.setProperty('--primary-accent', gradient.primary);
    document.documentElement.style.setProperty('--secondary-accent', gradient.secondary);
  };

  return (
    <div className="gradient-switcher">
      <div className="switcher-header">
        <h3>🎨 Choisir le dégradé</h3>
        <p>Cliquez sur une option pour voir l'aperçu en direct</p>
      </div>

      <div className="gradient-options">
        {gradients.map((gradient) => (
          <button
            key={gradient.id}
            className={`gradient-option ${selectedGradient === gradient.id ? 'active' : ''}`}
            onClick={() => applyGradient(gradient)}
            style={{
              background: `linear-gradient(135deg, ${gradient.primary}, ${gradient.secondary})`,
            }}
          >
            <div className="gradient-info">
              <div className="gradient-name">
                {gradient.name}
                {gradient.recommended && <span className="badge">Recommandé</span>}
              </div>
              <div className="gradient-description">{gradient.description}</div>
            </div>
            {selectedGradient === gradient.id && <div className="checkmark">✓</div>}
          </button>
        ))}
      </div>

      <div className="switcher-footer">
        <p>Gradient sélectionné: <strong>{gradients.find(g => g.id === selectedGradient)?.name}</strong></p>
        <small>💡 Tip: Une fois que vous avez trouvé votre préféré, prévenez-moi et je mettrai à jour le CSS permanent!</small>
      </div>
    </div>
  );
};

export default GradientSwitcher;

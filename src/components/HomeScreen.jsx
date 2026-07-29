import { useState } from 'react';

export default function HomeScreen({ onStart, onManagePlayers }) {
  const [t1, setT1] = useState('Team Alpha');
  const [t2, setT2] = useState('Team Beta');
  const [t3, setT3] = useState('Team Gamma');
  const [ballsPerOver, setBallsPerOver] = useState(6);

  const handleSubmit = (e) => {
    e.preventDefault();
    onStart(
      [t1.trim() || 'Team Alpha', t2.trim() || 'Team Beta', t3.trim() || 'Team Gamma'],
      ballsPerOver
    );
  };

  return (
    <div className="screen">
      <div className="home-header">
        <img src="/logo.png" alt="Royal Rangers" className="logo" />
        <h1 className="home-title">ROYAL RANGERS</h1>
        <p className="subtitle">Friday Night Indoor Cricket</p>
      </div>

      <div className="home-info">
        <div className="home-info-item">
          <span className="icon">📅</span>
          <span>Every Friday</span>
        </div>
        <div className="home-info-item">
          <span className="icon">⏰</span>
          <span>11:30 PM</span>
        </div>
        <div className="home-info-item">
          <span className="icon">🏏</span>
          <span>4 Overs • 3 Teams</span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="team-setup">
          <h3>Enter Team Names</h3>
          {['Team 1', 'Team 2', 'Team 3'].map((label, i) => (
            <div className="team-input-group" key={i}>
              <label>{label}</label>
              <input
                className="team-input"
                type="text"
                value={[t1, t2, t3][i]}
                onChange={(e) => {
                  if (i === 0) setT1(e.target.value);
                  if (i === 1) setT2(e.target.value);
                  if (i === 2) setT3(e.target.value);
                }}
                placeholder={`Team ${i + 1}`}
              />
            </div>
          ))}
        </div>

        <div className="format-selector">
          <h3>Match Format</h3>
          <div className="format-options">
            <button
              type="button"
              className={`format-btn ${ballsPerOver === 5 ? 'active' : ''}`}
              onClick={() => setBallsPerOver(5)}
            >
              <span className="format-label">5 Balls/Over</span>
              <span className="format-desc">20 balls per innings</span>
            </button>
            <button
              type="button"
              className={`format-btn ${ballsPerOver === 6 ? 'active' : ''}`}
              onClick={() => setBallsPerOver(6)}
            >
              <span className="format-label">6 Balls/Over</span>
              <span className="format-desc">24 balls per innings</span>
            </button>
          </div>
        </div>

        <div className="manage-players-btn-wrap">
          <button type="button" className="btn-secondary" onClick={onManagePlayers} style={{ width: '100%' }}>
            👥 Manage Registered Players
          </button>
        </div>

        <button type="submit" className="btn-primary">Next → Add Players</button>
      </form>
    </div>
  );
}
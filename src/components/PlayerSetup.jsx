import { useState } from 'react';

export default function PlayerSetup({ teams, players: initial, onStart, onBack }) {
  const [players, setPlayers] = useState(initial);
  const [newPlayer, setNewPlayer] = useState({ 0: '', 1: '', 2: '' });

  const addPlayer = (teamIdx) => {
    const name = newPlayer[teamIdx].trim();
    if (!name) return;
    setPlayers(prev => ({ ...prev, [teamIdx]: [...prev[teamIdx], name] }));
    setNewPlayer(prev => ({ ...prev, [teamIdx]: '' }));
  };

  const removePlayer = (teamIdx, playerIdx) => {
    setPlayers(prev => ({
      ...prev,
      [teamIdx]: prev[teamIdx].filter((_, i) => i !== playerIdx)
    }));
  };

  const handleKeyDown = (e, teamIdx) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPlayer(teamIdx);
    }
  };

  const allHaveMin = players[0].length >= 2 && players[1].length >= 2 && players[2].length >= 2;

  return (
    <div className="screen player-setup">
      <div className="screen-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <h2>Add Players</h2>
      </div>

      <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>
        Add at least 2 players per team
      </p>

      {teams.map((team, idx) => (
        <div className="player-team-section" key={idx}>
          <h4>🟡 {team}</h4>
          {players[idx].map((p, pi) => (
            <div className="player-row" key={pi}>
              <input value={p} readOnly />
              <button className="btn-sm danger" onClick={() => removePlayer(idx, pi)}>✕</button>
            </div>
          ))}
          <div className="player-row">
            <input
              value={newPlayer[idx]}
              onChange={(e) => setNewPlayer(prev => ({ ...prev, [idx]: e.target.value }))}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              placeholder="Player name..."
            />
            <button className="btn-sm gold" onClick={() => addPlayer(idx)}>+ Add</button>
          </div>
          <div className="player-count">{players[idx].length} player{players[idx].length !== 1 ? 's' : ''} added</div>
        </div>
      ))}

      <button className="btn-primary" disabled={!allHaveMin} onClick={() => onStart(players)}>
        {allHaveMin ? 'Start Tournament →' : 'Add at least 2 players per team'}
      </button>
    </div>
  );
}
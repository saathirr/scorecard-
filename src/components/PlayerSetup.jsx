import { useState } from 'react';

export default function PlayerSetup({ teams, players: initial, onStart, onBack, registeredPlayers, onRegisterPlayer }) {
  const [players, setPlayers] = useState({
    0: [...(initial[0] || [])],
    1: [...(initial[1] || [])],
    2: [...(initial[2] || [])],
  });
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

  const getAssignedTeam = (playerName) => {
    for (let i = 0; i < teams.length; i++) {
      if (players[i].some(p => p.toLowerCase() === playerName.toLowerCase())) return i;
    }
    return null;
  };

  const assignRegistered = (teamIdx, regPlayer) => {
    const assigned = getAssignedTeam(regPlayer.name);
    if (assigned !== null) return;
    setPlayers(prev => ({ ...prev, [teamIdx]: [...prev[teamIdx], regPlayer.name] }));
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

          {registeredPlayers.length > 0 && (
            <div className="registered-picks">
              <label className="registered-picks-label">From Registered Players</label>
              <div className="registered-picks-chips">
                {registeredPlayers.map(rp => {
                  const assigned = getAssignedTeam(rp.name);
                  const inThisTeam = assigned === idx;
                  const inOtherTeam = assigned !== null && assigned !== idx;
                  if (inThisTeam) return null;
                  return (
                    <button
                      key={rp.id}
                      className={`registered-chip ${inOtherTeam ? 'used' : ''}`}
                      onClick={() => assignRegistered(idx, rp)}
                      disabled={inOtherTeam}
                      title={inOtherTeam ? `Already in ${teams[assigned]}` : rp.role}
                    >
                      {rp.name}
                      {inOtherTeam && <span className="chip-team-tag">{teams[assigned].slice(0, 4)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="player-count">{players[idx].length} player{players[idx].length !== 1 ? 's' : ''} added</div>
        </div>
      ))}

      <button className="btn-primary" disabled={!allHaveMin} onClick={() => onStart(players)}>
        {allHaveMin ? 'Start Tournament →' : 'Add at least 2 players per team'}
      </button>
    </div>
  );
}
import { useState } from 'react';

export default function MatchSelect({ teams, players, onUpdatePlayers, matches, onSelect, onBack, onUpdateFixture, onAddMatch, onDeleteMatch, onViewResults }) {
  const anyStarted = matches.some(m => m.innings && m.innings.length > 0);
  const anyPlayed = matches.some(m => m.innings && m.innings.length > 0);
  const [newT1, setNewT1] = useState(0);
  const [newT2, setNewT2] = useState(1);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [editTeamIdx, setEditTeamIdx] = useState(null);
  const [editPlayers, setEditPlayers] = useState({});
  const [newPlayerName, setNewPlayerName] = useState('');

  const handleAdd = () => {
    if (newT1 === newT2) return;
    onAddMatch(newT1, newT2);
  };

  const openPlayerEditor = (teamIdx) => {
    setEditTeamIdx(teamIdx);
    setEditPlayers({ ...(players[teamIdx] || []) });
    setNewPlayerName('');
    setShowPlayerModal(true);
  };

  const addPlayerToTeam = () => {
    const name = newPlayerName.trim();
    if (!name) return;
    const updated = { ...players, [editTeamIdx]: [...players[editTeamIdx], name] };
    onUpdatePlayers(updated);
    setNewPlayerName('');
  };

  const removePlayerFromTeam = (playerIdx) => {
    const updated = { ...players, [editTeamIdx]: players[editTeamIdx].filter((_, i) => i !== playerIdx) };
    onUpdatePlayers(updated);
  };

  const renamePlayerInTeam = (playerIdx, newName) => {
    if (!newName.trim()) return;
    const updated = { ...players, [editTeamIdx]: players[editTeamIdx].map((p, i) => i === playerIdx ? newName.trim() : p) };
    onUpdatePlayers(updated);
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <h2>Select Match</h2>
        <button className="btn-sm" onClick={() => openPlayerEditor(0)} title="Edit Players">👥</button>
      </div>

      {/* Add new match */}
      <div className="add-match-section">
        <h4>Add Match</h4>
        <div className="fixture-selector">
          <select value={newT1} onChange={e => setNewT1(Number(e.target.value))}>
            {teams.map((t, i) => <option key={i} value={i}>{t}</option>)}
          </select>
          <span className="vs">vs</span>
          <select value={newT2} onChange={e => setNewT2(Number(e.target.value))}>
            {teams.map((t, i) => (
              <option key={i} value={i} disabled={i === newT1}>{t}</option>
            ))}
          </select>
          <button className="btn-sm gold" onClick={handleAdd} disabled={newT1 === newT2}>+ Add</button>
        </div>
      </div>

      {/* Player quick edit buttons */}
      <div className="quick-player-edit">
        {teams.map((t, i) => (
          <button key={i} className="btn-sm" onClick={() => openPlayerEditor(i)}>
            {t}: {players[i]?.length || 0} players ✎
          </button>
        ))}
      </div>

      {/* Match list */}
      {matches.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '14px', margin: '30px 0' }}>
          Add a match above to get started
        </p>
      ) : (
        <div className="match-list">
          {matches.map((m, i) => (
            <div
              key={i}
              className={`match-card ${m.completed ? 'completed' : ''}`}
              onClick={() => !m.completed && onSelect(i)}
            >
              <div style={{ flex: 1 }}>
                <div className="match-label">Match {i + 1}</div>
                <div className="teams">{teams[m.t1]} vs {teams[m.t2]}</div>
                {m.result && <div className="match-result">{m.result}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {m.completed ? (
                  <span className="status-badge done">Done ✓</span>
                ) : (
                  <span className="arrow">▶</span>
                )}
                <button className="btn-sm danger" onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this match?')) onDeleteMatch(i); }} style={{ fontSize: '12px', padding: '4px 8px' }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {matches.length > 0 && (
        <div className="finished-day-section">
          <button className="btn-primary" style={{ marginTop: '20px' }} onClick={onViewResults}>
            🏁 Finished Day — View Results
          </button>
        </div>
      )}

      {/* Player Edit Modal */}
      {showPlayerModal && editTeamIdx !== null && (
        <div className="modal-overlay" onClick={() => setShowPlayerModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Edit Players — {teams[editTeamIdx]}</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '12px' }}>
              {(players[editTeamIdx] || []).map((p, pi) => (
                <div className="player-row" key={pi}>
                  <input
                    value={p}
                    onChange={(e) => renamePlayerInTeam(pi, e.target.value)}
                  />
                  <button className="btn-sm danger" onClick={() => removePlayerFromTeam(pi)}>✕</button>
                </div>
              ))}
            </div>
            <div className="player-row">
              <input
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPlayerToTeam(); } }}
                placeholder="Add player..."
              />
              <button className="btn-sm gold" onClick={addPlayerToTeam}>+ Add</button>
            </div>
            <div className="player-count">{players[editTeamIdx]?.length || 0} players</div>
            <button className="btn-secondary" style={{ marginTop: '10px', width: '100%' }} onClick={() => setShowPlayerModal(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

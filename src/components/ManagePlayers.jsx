import { useState } from 'react';

const ROLES = [
  { value: 'batsman', label: 'Batsman' },
  { value: 'bowler', label: 'Bowler' },
  { value: 'allrounder', label: 'All-Rounder' },
  { value: 'wk', label: 'Wicket Keeper' },
];

export default function ManagePlayers({ players, onUpdate, onBack }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('batsman');
  const [jerseyNo, setJerseyNo] = useState('');

  const addPlayer = () => {
    const n = name.trim();
    if (!n) return;
    if (players.some(p => p.name.toLowerCase() === n.toLowerCase())) {
      alert('Player with this name already exists');
      return;
    }
    onUpdate([...players, {
      id: Date.now().toString(),
      name: n,
      role,
      jerseyNo: jerseyNo.trim(),
      career: { runs: 0, balls: 0, fours: 0, sixes: 0, outs: 0, matches: 0, wickets: 0, bowlingBalls: 0, bowlingRuns: 0, bowlingFours: 0, bowlingSixes: 0 },
    }]);
    setName('');
    setJerseyNo('');
  };

  const deletePlayer = (id) => {
    if (!window.confirm('Delete this player permanently?')) return;
    onUpdate(players.filter(p => p.id !== id));
  };

  const roleIcon = (r) => {
    switch (r) {
      case 'batsman': return '🏏';
      case 'bowler': return '🎯';
      case 'allrounder': return '⭐';
      case 'wk': return '🧤';
      default: return '👤';
    }
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <h2>Registered Players</h2>
      </div>

      {players.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '14px', margin: '30px 0' }}>
          No registered players yet. Add your first player below.
        </p>
      ) : (
        <div className="registered-list">
          {players.map(p => {
            const c = p.career;
            const batAvg = c.outs > 0 ? (c.runs / c.outs).toFixed(1) : '-';
            const sr = c.balls > 0 ? ((c.runs / c.balls) * 100).toFixed(0) : '-';
            const bEconomy = c.bowlingBalls > 0 ? (c.bowlingRuns / (c.bowlingBalls / 6)).toFixed(1) : '-';
            return (
              <div className="player-card" key={p.id}>
                <div className="player-card-top">
                  <div className="player-card-name">
                    {roleIcon(p.role)} {p.name}
                    {p.jerseyNo && <span className="player-jersey">#{p.jerseyNo}</span>}
                  </div>
                  <div className="player-card-role">{ROLES.find(r => r.value === p.role)?.label || p.role}</div>
                  <button className="btn-sm danger" onClick={() => deletePlayer(p.id)} style={{ padding: '4px 10px', fontSize: '11px' }}>✕</button>
                </div>
                {c.matches > 0 && (
                  <div className="player-card-stats">
                    <span className="stat"><strong>{c.matches}</strong> m</span>
                    <span className="stat"><strong>{c.runs}</strong> runs</span>
                    <span className="stat"><strong>{c.wickets}</strong> wkts</span>
                    <span className="stat">Avg <strong>{batAvg}</strong></span>
                    <span className="stat">SR <strong>{sr}</strong></span>
                    <span className="stat">Econ <strong>{bEconomy}</strong></span>
                  </div>
                )}
                {c.matches === 0 && (
                  <div className="player-card-stats no-career">No matches played yet</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="register-form">
        <h3>Register New Player</h3>
        <div className="register-form-row">
          <input
            className="team-input"
            placeholder="Player name *"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addPlayer(); }}
          />
        </div>
        <div className="register-form-row register-form-inline">
          <select
            className="team-input register-select"
            value={role}
            onChange={e => setRole(e.target.value)}
            style={{ flex: 1 }}
          >
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <input
            className="team-input register-jersey"
            placeholder="Jersey #"
            value={jerseyNo}
            onChange={e => setJerseyNo(e.target.value)}
            style={{ width: '100px' }}
          />
        </div>
        <button className="btn-primary" disabled={!name.trim()} onClick={addPlayer}>
          + Register Player
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';

export default function MatchSelect({ teams, matches, onSelect, onBack, onUpdateFixture, onAddMatch, onDeleteMatch, onViewResults }) {
  const [newT1, setNewT1] = useState(0);
  const [newT2, setNewT2] = useState(1);

  const handleAdd = () => {
    if (newT1 === newT2) return;
    onAddMatch(newT1, newT2);
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <h2>Select Match</h2>
      </div>

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
    </div>
  );
}
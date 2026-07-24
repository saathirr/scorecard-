export default function MatchSelect({ teams, matches, onSelect, onBack, onUpdateFixture, onViewResults }) {
  const anyStarted = matches.some(m => m.innings && m.innings.length > 0);
  const allDone = matches.length > 0 && matches.every(m => m.completed);

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <h2>Select Match</h2>
      </div>

      {!anyStarted && (
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px', marginBottom: '16px' }}>
          Customize which teams play each match
        </p>
      )}

      <div className="match-list">
        {['Match 1', 'Match 2', 'Match 3'].map((label, i) => {
          const m = matches[i];
          return (
            <div
              key={i}
              className={`match-card ${m.completed ? 'completed' : ''}`}
              onClick={() => !m.completed && onSelect(i)}
            >
              <div style={{ flex: 1 }}>
                {!anyStarted ? (
                  <div className="fixture-selector">
                    <select
                      value={m.t1}
                      onChange={(e) => onUpdateFixture(i, Number(e.target.value), m.t2)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {teams.map((t, idx) => <option key={idx} value={idx}>{t}</option>)}
                    </select>
                    <span className="vs">vs</span>
                    <select
                      value={m.t2}
                      onChange={(e) => onUpdateFixture(i, m.t1, Number(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {teams.map((t, idx) => (
                        <option key={idx} value={idx} disabled={idx === m.t1}>{t}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="teams">{teams[m.t1]} vs {teams[m.t2]}</div>
                )}
                {m.result && <div className="match-result">{m.result}</div>}
              </div>
              {m.completed ? (
                <span className="status-badge done">Done ✓</span>
              ) : (
                <span className="arrow">▶</span>
              )}
            </div>
          );
        })}
      </div>

      {allDone && (
        <button className="btn-primary" style={{ marginTop: '20px' }} onClick={onViewResults}>
          View Tournament Results →
        </button>
      )}
    </div>
  );
}

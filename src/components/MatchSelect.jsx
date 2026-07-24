export default function MatchSelect({ teams, matches, onSelect, onBack }) {
  return (
    <div className="screen">
      <div className="screen-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <h2>Select Match</h2>
      </div>

      <div className="match-list">
        {['Match 1', 'Match 2', 'Match 3'].map((label, i) => {
          const m = matches[i];
          return (
            <div
              key={i}
              className={`match-card ${m.completed ? 'completed' : ''}`}
              onClick={() => !m.completed && onSelect(i)}
            >
              <div>
                <div className="teams">{teams[m.t1]} vs {teams[m.t2]}</div>
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
    </div>
  );
}
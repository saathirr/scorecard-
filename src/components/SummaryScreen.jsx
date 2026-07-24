export default function SummaryScreen({ teams, matches, onNew }) {
  const points = {};
  teams.forEach(t => points[t] = 0);

  matches.forEach(m => {
    if (m.innings.length >= 2) {
      const inn1 = m.innings[0];
      const inn2 = m.innings[1];
      if (inn1.runs > inn2.runs) points[teams[m.t1]] += 2;
      else if (inn2.runs > inn1.runs) points[teams[m.t2]] += 2;
      else {
        points[teams[m.t1]] += 1;
        points[teams[m.t2]] += 1;
      }
    }
  });

  const sorted = Object.entries(points).sort((a, b) => b[1] - a[1]);
  const medals = ['🥇', '🥈', '🥉'];
  const rankLabels = ['gold', 'silver', 'bronze'];

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 style={{ textAlign: 'center' }}>🏆 Tournament Results</h2>
      </div>

      <div className="summary-content">
        {matches.map((m, i) => (
          <div className="summary-match" key={i}>
            <h4>Match {i + 1}: {teams[m.t1]} vs {teams[m.t2]}</h4>
            {m.innings.map((inn, j) => {
              const overs = `${Math.floor(inn.balls / 6)}.${inn.balls % 6}`;
              return (
                <div className="inn-line" key={j}>
                  {teams[inn.battingTeam]}: {inn.runs}/{inn.wickets} ({overs} ov)
                </div>
              );
            })}
            {m.result && <div className="result">{m.result}</div>}
          </div>
        ))}
      </div>

      <div className="standings">
        <h3>🏅 Final Standings</h3>
        {sorted.map(([team, pts], i) => (
          <div className="standing-row" key={team} style={{ animationDelay: `${i * 0.1}s` }}>
            <span className={`rank ${rankLabels[i] || ''}`}>{medals[i] || `#${i + 1}`}</span>
            <span className="team-name">{team}</span>
            <span className="stats">{pts} point{pts !== 1 ? 's' : ''}</span>
            <span className="pts">{pts}</span>
          </div>
        ))}
      </div>

      <button className="btn-primary" onClick={onNew}>New Tournament</button>
    </div>
  );
}
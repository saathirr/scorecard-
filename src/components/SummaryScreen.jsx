function aggregateStats(matches, teams) {
  const playerStats = {};

  matches.forEach(m => {
    (m.innings || []).forEach(inn => {
      const teamName = teams[inn.battingTeam] || `Team ${inn.battingTeam}`;

      Object.entries(inn.batsmanStats || {}).forEach(([name, s]) => {
        if (!playerStats[name]) {
          playerStats[name] = { runs: 0, balls: 0, fours: 0, sixes: 0, matches: 0, outs: 0, wickets: 0, bowlingBalls: 0, bowlingRuns: 0, bowlingFours: 0, bowlingSixes: 0 };
        }
        playerStats[name].runs += s.runs;
        playerStats[name].balls += s.balls;
        playerStats[name].fours += s.fours;
        playerStats[name].sixes += s.sixes;
        if (s.isOut) playerStats[name].outs += 1;
      });

      Object.entries(inn.bowlerStats || {}).forEach(([name, s]) => {
        if (!playerStats[name]) {
          playerStats[name] = { runs: 0, balls: 0, fours: 0, sixes: 0, matches: 0, outs: 0, wickets: 0, bowlingBalls: 0, bowlingRuns: 0, bowlingFours: 0, bowlingSixes: 0 };
        }
        playerStats[name].wickets += s.wickets;
        playerStats[name].bowlingBalls += s.balls;
        playerStats[name].bowlingRuns += s.runs;
        playerStats[name].bowlingFours += s.fours;
        playerStats[name].bowlingSixes += s.sixes;
      });
    });
  });

  return playerStats;
}

export default function SummaryScreen({ teams, matches, onNew }) {
  const playerStats = aggregateStats(matches, teams);

  const points = {};
  teams.forEach(t => points[t] = 0);
  matches.forEach(m => {
    if ((m.innings || []).length >= 2) {
      const inn1 = m.innings[0];
      const inn2 = m.innings[1];
      if (inn1.runs > inn2.runs) points[teams[m.t1]] += 2;
      else if (inn2.runs > inn1.runs) points[teams[m.t2]] += 2;
      else { points[teams[m.t1]] += 1; points[teams[m.t2]] += 1; }
    }
  });
  const sorted = Object.entries(points).sort((a, b) => b[1] - a[1]);
  const medals = ['🥇', '🥈', '🥉'];
  const rankLabels = ['gold', 'silver', 'bronze'];

  const topRuns = Object.entries(playerStats)
    .sort((a, b) => b[1].runs - a[1].runs)
    .slice(0, 5);

  const topWickets = Object.entries(playerStats)
    .sort((a, b) => b[1].wickets - a[1].wickets)
    .filter(([_, s]) => s.wickets > 0)
    .slice(0, 5);

  const topMVP = Object.entries(playerStats)
    .map(([name, s]) => ({
      name,
      runs: s.runs,
      wickets: s.wickets,
      mvp: s.runs + s.wickets * 20,
    }))
    .sort((a, b) => b.mvp - a.mvp)
    .slice(0, 5);

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 style={{ textAlign: 'center' }}>🏆 Tournament Results</h2>
      </div>

      {/* Match Score Sheets */}
      <div className="summary-content">
        {matches.map((m, i) => {
          if (!m.innings || m.innings.length === 0) return null;
          return (
            <div className="summary-match" key={i}>
              <h4>Match {i + 1}: {teams[m.t1]} vs {teams[m.t2]}</h4>
              {m.innings.map((inn, j) => {
                const overs = `${Math.floor(inn.balls / 6)}.${inn.balls % 6}`;
                const batStats = Object.entries(inn.batsmanStats || {});
                const bowlStats = Object.entries(inn.bowlerStats || {}).filter(([_, v]) => v.balls > 0);
                return (
                  <div className="summary-innings" key={j}>
                    <div className="summary-inn-header">
                      <strong>{teams[inn.battingTeam]}</strong>: {inn.runs}/{inn.wickets} ({overs} ov)
                    </div>
                    {batStats.length > 0 && (
                      <div className="mini-sheet">
                        {batStats.map(([name, s]) => {
                          const outStr = s.isOut ? (s.dismissal === 'runOut' ? 'ro' : `b ${s.dismissedBy || ''}`) : '*';
                          return (
                            <div className="mini-sheet-row" key={name}>
                              <span className="mini-name">{name} {s.isOut ? '' : '*'}</span>
                              <span className="mini-runs">{s.runs}</span>
                              <span className="mini-balls">({s.balls})</span>
                              <span className="mini-fours">{s.fours > 0 ? `${s.fours}x4` : ''}</span>
                              <span className="mini-sixes">{s.sixes > 0 ? `${s.sixes}x6` : ''}</span>
                              <span className="mini-out">{outStr}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {bowlStats.length > 0 && (
                      <div className="mini-sheet bowl">
                        <div className="mini-sheet-label">Bowling:</div>
                        {bowlStats.map(([name, s]) => {
                          const ov = `${Math.floor(s.balls / 6)}.${s.balls % 6}`;
                          return (
                            <div className="mini-sheet-row" key={name}>
                              <span className="mini-name">{name}</span>
                              <span className="mini-runs">{ov}-{s.runs}-{s.wickets}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {m.result && <div className="result">{m.result}</div>}
            </div>
          );
        })}
      </div>

      {/* Points Table */}
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

      {/* Most Runs (Orange Cap) */}
      {topRuns.length > 0 && (
        <div className="stats-section">
          <h3>🏏 Most Runs (Orange Cap)</h3>
          {topRuns.map(([name, s], i) => (
            <div className="stat-row" key={name} style={{ animationDelay: `${i * 0.1}s` }}>
              <span className="stat-rank">{i + 1}</span>
              <span className="stat-player">{name}</span>
              <span className="stat-detail">{s.balls} balls • {s.fours} fours • {s.sixes} sixes</span>
              <span className="stat-value">{s.runs}</span>
            </div>
          ))}
        </div>
      )}

      {/* Most Wickets (Purple Cap) */}
      {topWickets.length > 0 && (
        <div className="stats-section">
          <h3>🎯 Most Wickets (Purple Cap)</h3>
          {topWickets.map(([name, s], i) => {
            const overs = `${Math.floor(s.bowlingBalls / 6)}.${s.bowlingBalls % 6}`;
            const econ = s.bowlingBalls > 0 ? (s.bowlingRuns / (s.bowlingBalls / 6)).toFixed(1) : '-';
            return (
              <div className="stat-row" key={name} style={{ animationDelay: `${i * 0.1}s` }}>
                <span className="stat-rank">{i + 1}</span>
                <span className="stat-player">{name}</span>
                <span className="stat-detail">{overs} ov • {s.bowlingRuns} runs • econ {econ}</span>
                <span className="stat-value">{s.wickets}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Most Valuable Player */}
      {topMVP.length > 0 && (
        <div className="stats-section">
          <h3>⭐ Most Valuable Player</h3>
          {topMVP.map((p, i) => (
            <div className={`stat-row mvp ${i === 0 ? 'gold' : ''}`} key={p.name} style={{ animationDelay: `${i * 0.1}s` }}>
              <span className="stat-rank">{i === 0 ? '👑' : i + 1}</span>
              <span className="stat-player">{p.name}</span>
              <span className="stat-detail">{p.runs} runs • {p.wickets} wickets</span>
              <span className="stat-value">{p.mvp}</span>
            </div>
          ))}
        </div>
      )}

      <button className="btn-primary" onClick={onNew}>New Tournament</button>
    </div>
  );
}

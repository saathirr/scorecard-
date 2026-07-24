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

export default function SummaryScreen({ teams, matches, ballsPerOver, onNew }) {
  const playerStats = aggregateStats(matches, teams);

  const points = {};
  teams.forEach(t => points[t] = 0);
  matches.forEach(m => {
    if ((m.innings || []).length >= 2) {
      const inn1 = m.innings[0];
      const inn2 = m.innings[1];
      const team1 = teams[inn1.battingTeam];
      const team2 = teams[inn2.battingTeam];
      if (inn1.runs > inn2.runs) points[team1] += 2;
      else if (inn2.runs > inn1.runs) points[team2] += 2;
      else { points[team1] += 1; points[team2] += 1; }
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
                const overs = `${Math.floor(inn.balls / ballsPerOver)}.${inn.balls % ballsPerOver}`;
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
                          const ov = `${Math.floor(s.balls / ballsPerOver)}.${s.balls % ballsPerOver}`;
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
            const overs = `${Math.floor(s.bowlingBalls / ballsPerOver)}.${s.bowlingBalls % ballsPerOver}`;
            const econ = s.bowlingBalls > 0 ? (s.bowlingRuns / (s.bowlingBalls / ballsPerOver)).toFixed(1) : '-';
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

      <div className="summary-actions">
        <button className="btn-primary" onClick={() => {
          const win = window.open('', '_blank');
          const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Scorecard Summary</title>
<style>
  body { font-family: Arial, sans-serif; padding: 30px; color: #333; max-width: 800px; margin: 0 auto; }
  h1 { text-align: center; color: #1a1a2e; font-size: 24px; margin-bottom: 4px; }
  .date { text-align: center; color: #666; font-size: 14px; margin-bottom: 20px; }
  h2 { color: #e94560; font-size: 18px; margin: 20px 0 10px; border-bottom: 2px solid #eee; padding-bottom: 6px; }
  h3 { color: #1a1a2e; font-size: 16px; margin: 14px 0 8px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px; }
  th { background: #1a1a2e; color: white; padding: 8px 10px; text-align: left; font-size: 12px; }
  td { padding: 6px 10px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) { background: #f9f9f9; }
  .match { background: #f0f0f5; border-radius: 8px; padding: 12px; margin: 10px 0; }
  .match-title { font-weight: 700; font-size: 14px; margin-bottom: 6px; }
  .result { color: #e94560; font-weight: 600; margin-top: 6px; }
  .winner { text-align: center; background: linear-gradient(135deg, #f5c518, #ff8c00); color: white; padding: 16px; border-radius: 12px; margin: 20px 0; font-size: 18px; font-weight: 700; }
  .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px; }
  .rank-gold { color: #f5c518; }
  .rank-silver { color: #b0bec5; }
  .rank-bronze { color: #cd7f32; }
</style></head><body>
<h1>🏏 ROYAL RANGERS</h1>
<p class="date">Friday Night Indoor Cricket — ${date}</p>`;

  // Match summaries
  matches.forEach((m, i) => {
    if (!m.innings || m.innings.length === 0) return;
    html += `<h2>Match ${i + 1}: ${teams[m.t1]} vs ${teams[m.t2]}</h2>`;
    m.innings.forEach((inn, j) => {
      const overs = `${Math.floor(inn.balls / ballsPerOver)}.${inn.balls % ballsPerOver}`;
      html += `<div class="match"><div class="match-title">${teams[inn.battingTeam]}: ${inn.runs}/${inn.wickets} (${overs} ov)</div>`;
      const batStats = Object.entries(inn.batsmanStats || {});
      if (batStats.length > 0) {
        html += `<table><tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th><th>How Out</th></tr>`;
        batStats.forEach(([name, s]) => {
          const sr = s.balls > 0 ? ((s.runs / s.balls) * 100).toFixed(0) : '-';
          const outStr = s.isOut ? (s.dismissal === 'runOut' ? 'run out' : `b ${s.dismissedBy || ''}`) : 'not out';
          html += `<tr><td>${name}</td><td>${s.runs}</td><td>${s.balls}</td><td>${s.fours}</td><td>${s.sixes}</td><td>${sr}</td><td>${outStr}</td></tr>`;
        });
        html += `</table>`;
      }
      const bowlStats = Object.entries(inn.bowlerStats || {}).filter(([_, v]) => v.balls > 0);
      if (bowlStats.length > 0) {
        html += `<table><tr><th>Bowler</th><th>O</th><th>R</th><th>W</th><th>Econ</th></tr>`;
        bowlStats.forEach(([name, s]) => {
          const ov = `${Math.floor(s.balls / ballsPerOver)}.${s.balls % ballsPerOver}`;
          const econ = s.balls > 0 ? (s.runs / (s.balls / ballsPerOver)).toFixed(1) : '-';
          html += `<tr><td>${name}</td><td>${ov}</td><td>${s.runs}</td><td>${s.wickets}</td><td>${econ}</td></tr>`;
        });
        html += `</table>`;
      }
      html += `</div>`;
    });
    if (m.result) html += `<div class="result">${m.result}</div>`;
  });

  // Standings
  html += `<h2>🏅 Final Standings</h2><table><tr><th>#</th><th>Team</th><th>Points</th></tr>`;
  sorted.forEach(([team, pts], i) => {
    const medal = medals[i] || `#${i + 1}`;
    html += `<tr><td>${medal}</td><td>${team}</td><td>${pts}</td></tr>`;
  });
  html += `</table>`;

  // Top stats
  if (topRuns.length > 0) {
    html += `<h2>🏏 Most Runs</h2><table><tr><th>#</th><th>Player</th><th>Runs</th><th>Balls</th><th>4s</th><th>6s</th></tr>`;
    topRuns.forEach(([name, s], i) => {
      html += `<tr><td>${i + 1}</td><td>${name}</td><td><strong>${s.runs}</strong></td><td>${s.balls}</td><td>${s.fours}</td><td>${s.sixes}</td></tr>`;
    });
    html += `</table>`;
  }
  if (topWickets.length > 0) {
    html += `<h2>🎯 Most Wickets</h2><table><tr><th>#</th><th>Player</th><th>Wickets</th></tr>`;
    topWickets.forEach(([name, s], i) => {
      html += `<tr><td>${i + 1}</td><td>${name}</td><td><strong>${s.wickets}</strong></td></tr>`;
    });
    html += `</table>`;
  }
  if (topMVP.length > 0) {
    const mvp = topMVP[0];
    html += `<div class="winner">⭐ Most Valuable Player: ${mvp.name} — ${mvp.runs} runs & ${mvp.wickets} wickets</div>`;
  }

  html += `<p class="footer">Generated by Royal Rangers Scorecard App</p></body></html>`;
          win.document.write(html);
          win.document.close();
          win.focus();
          setTimeout(() => win.print(), 500);
        }}>📄 Download / Print PDF</button>

        <button className="btn-secondary" style={{ width: '100%' }} onClick={() => {
          let text = '🏏 *ROYAL RANGERS* — Match Summary\n';
          text += 'Friday Night Indoor Cricket\n';
          text += `${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
          matches.forEach((m, i) => {
            if (!m.innings || m.innings.length === 0) return;
            text += `*Match ${i + 1}: ${teams[m.t1]} vs ${teams[m.t2]}*\n`;
            m.innings.forEach((inn, j) => {
              const overs = `${Math.floor(inn.balls / ballsPerOver)}.${inn.balls % ballsPerOver}`;
              text += `${teams[inn.battingTeam]}: ${inn.runs}/${inn.wickets} (${overs} ov)\n`;
              const batStats = Object.entries(inn.batsmanStats || {});
              batStats.forEach(([name, s]) => {
                const outStr = s.isOut ? (s.dismissal === 'runOut' ? 'ro' : `b ${s.dismissedBy || ''}`) : '*';
                text += `  ${name}: ${s.runs}(${s.balls})${s.fours > 0 ? ` ${s.fours}x4` : ''}${s.sixes > 0 ? ` ${s.sixes}x6` : ''} ${outStr}\n`;
              });
            });
            if (m.result) text += `_${m.result}_\n`;
            text += '\n';
          });
          text += '🏅 *Standings*\n';
          sorted.forEach(([team, pts], i) => {
            text += `${medals[i] || `#${i + 1}`} ${team}: ${pts} pts\n`;
          });
          text += '\n';
          if (topRuns.length > 0) {
            text += '🏏 *Most Runs*\n';
            topRuns.forEach(([name, s], i) => { text += `${i + 1}. ${name}: ${s.runs}\n`; });
            text += '\n';
          }
          if (topWickets.length > 0) {
            text += '🎯 *Most Wickets*\n';
            topWickets.forEach(([name, s], i) => { text += `${i + 1}. ${name}: ${s.wickets}\n`; });
            text += '\n';
          }
          if (topMVP.length > 0) {
            const mvp = topMVP[0];
            text += `⭐ *MVP: ${mvp.name}* — ${mvp.runs} runs, ${mvp.wickets} wickets\n\n`;
          }
          navigator.clipboard.writeText(text).then(() => alert('Summary copied! Paste in WhatsApp 📋')).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            alert('Summary copied! Paste in WhatsApp 📋');
          });
        }}>📋 Copy for WhatsApp</button>
      </div>

      <button className="btn-primary" onClick={onNew}>New Tournament</button>
    </div>
  );
}

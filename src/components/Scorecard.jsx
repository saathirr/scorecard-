import { useState, useEffect, useRef, useCallback } from 'react';

function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const EXTRA_TYPES = [
  { key: 'wide', label: 'WD' },
  { key: 'noball', label: 'NB' },
  { key: 'bye', label: 'B' },
  { key: 'legbye', label: 'LB' },
];

export default function Scorecard({ teams, players, matchIndex, matches, updateMatch, onBack, onDone }) {
  const m = matches[matchIndex];
  const [innings, setInnings] = useState([]);
  const [currentInnings, setCurrentInnings] = useState(0);
  const [runs, setRuns] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [balls, setBalls] = useState(0);
  const [batsmen, setBatsmen] = useState([
    { runs: 0, balls: 0 },
    { runs: 0, balls: 0 }
  ]);
  const [striker, setStriker] = useState(0);
  const [ballHistory, setBallHistory] = useState([]);
  const [extras, setExtras] = useState({ wide: 0, noball: 0, bye: 0, legbye: 0 });
  const [timer, setTimer] = useState(7200);
  const [running, setRunning] = useState(false);
  const timerRef = useRef(null);
  const historyRef = useRef(null);

  const [battingPlayers, setBattingPlayers] = useState([]);
  const [playerIndex1, setPlayerIndex1] = useState(0);
  const [playerIndex2, setPlayerIndex2] = useState(1);
  const [nextBatsmanIdx, setNextBatsmanIdx] = useState(2);
  const [currentBowler, setCurrentBowler] = useState('');

  const battingTeam = currentInnings === 0 ? m.t1 : currentInnings === 1 ? m.t2 :
    currentInnings === 2 ? m.t1 : m.t2;
  const bowlingTeam = currentInnings === 0 ? m.t2 : currentInnings === 1 ? m.t1 :
    currentInnings === 2 ? m.t2 : m.t1;
  const battingTeamPlayers = players[battingTeam] || [];
  const bowlingTeamPlayers = players[bowlingTeam] || [];

  useEffect(() => {
    if (battingTeamPlayers.length >= 2) {
      setBattingPlayers([battingTeamPlayers[0], battingTeamPlayers[1]]);
      setPlayerIndex1(0);
      setPlayerIndex2(1);
      setNextBatsmanIdx(2);
      setCurrentBowler(bowlingTeamPlayers[0] || 'Bowler');
    }
  }, [currentInnings, matchIndex]);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

  useEffect(() => {
    if (!running) setRunning(true);
  }, []);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollLeft = historyRef.current.scrollWidth;
    }
  }, [ballHistory]);

  const score = `${runs}/${wickets}`;
  const overStr = `${Math.floor(balls / 6)}.${balls % 6}`;
  const totalExtras = extras.wide + extras.noball + extras.bye + extras.legbye;
  const maxBalls = 24;
  const isInningsOver = balls >= maxBalls || wickets >= 10;

  const getBallLabel = useCallback((type, val) => {
    if (type === 'run') return val === 4 ? '4' : val === 6 ? '6' : String(val);
    if (type === 'wicket') return 'W';
    const map = { wide: 'WD', noball: 'NB', bye: 'B', legbye: 'LB' };
    return map[val] || val;
  }, []);

  const getBallClass = useCallback((type, val) => {
    if (type === 'run') {
      if (val === 4) return 'four';
      if (val === 6) return 'six';
      return 'run';
    }
    if (type === 'wicket') return 'wicket';
    return 'extra';
  }, []);

  const addBowl = useCallback((type, value) => {
    if (isInningsOver) return;

    const isLegal = type === 'run' && value > 0;
    const isWideOrNoball = (type === 'extra' && (value === 'wide' || value === 'noball'));

    setBalls(prev => {
      if (isWideOrNoball) return prev;
      return prev + 1;
    });

    if (type === 'run') {
      setRuns(prev => prev + value);
      setBatsmen(prev => {
        const next = [...prev];
        next[striker] = { runs: next[striker].runs + value, balls: next[striker].balls + 1 };
        return next;
      });
      if (value === 1 || value === 3) setStriker(prev => prev === 0 ? 1 : 0);
    } else if (type === 'wicket') {
      setWickets(prev => prev + 1);
      setBatsmen(prev => {
        const next = [...prev];
        next[striker] = { ...next[striker], balls: next[striker].balls + 1 };
        return next;
      });
      if (nextBatsmanIdx < battingTeamPlayers.length) {
        const newBatsmen = [...battingPlayers];
        newBatsmen[striker] = battingTeamPlayers[nextBatsmanIdx];
        setBattingPlayers(newBatsmen);
        setNextBatsmanIdx(prev => prev + 1);
      }
    } else if (type === 'extra') {
      setRuns(prev => prev + 1);
      setExtras(prev => ({ ...prev, [value]: prev[value] + 1 }));
    }

    const label = getBallLabel(type, value);
    const cls = getBallClass(type, value);
    setBallHistory(prev => [...prev, { label, cls }]);
  }, [isInningsOver, striker, getBallLabel, getBallClass, battingTeamPlayers, battingPlayers, nextBatsmanIdx]);

  const nextInnings = useCallback(() => {
    const innData = {
      battingTeam, runs, wickets, balls,
      batsmen: JSON.parse(JSON.stringify(batsmen)),
      extras: { ...extras },
      ballHistory: [...ballHistory],
      battingPlayers: [...battingPlayers]
    };
    const newInnings = [...innings, innData];
    setInnings(newInnings);
    updateMatch(matchIndex, { innings: newInnings });

    setCurrentInnings(prev => prev + 1);
    setRuns(0); setWickets(0); setBalls(0);
    setBatsmen([{ runs: 0, balls: 0 }, { runs: 0, balls: 0 }]);
    setStriker(0);
    setBallHistory([]);
    setExtras({ wide: 0, noball: 0, bye: 0, legbye: 0 });
  }, [innings, battingTeam, runs, wickets, balls, batsmen, extras, ballHistory, battingPlayers, updateMatch, matchIndex]);

  const endMatch = useCallback(() => {
    const innData = {
      battingTeam, runs, wickets, balls,
      batsmen: JSON.parse(JSON.stringify(batsmen)),
      extras: { ...extras },
      ballHistory: [...ballHistory],
      battingPlayers: [...battingPlayers]
    };
    const finalInnings = balls > 0 ? [...innings, innData] : innings;
    setInnings(finalInnings);

    if (finalInnings.length >= 2) {
      const inn1 = finalInnings[0];
      const inn2 = finalInnings[1];
      let result = '';
      if (inn1.runs > inn2.runs) {
        result = `${teams[m.t1]} won by ${inn1.runs - inn2.runs} runs`;
      } else if (inn2.runs > inn1.runs) {
        result = `${teams[m.t2]} won by ${10 - inn2.wickets} wicket${10 - inn2.wickets !== 1 ? 's' : ''}`;
      } else {
        result = 'Match Tied!';
      }
      updateMatch(matchIndex, { innings: finalInnings, completed: true, result });
    } else {
      updateMatch(matchIndex, { innings: finalInnings, completed: true });
    }

    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    onDone();
  }, [innings, battingTeam, runs, wickets, balls, batsmen, extras, ballHistory, battingPlayers, teams, m.t1, m.t2, updateMatch, matchIndex, onDone]);

  const resetMatch = useCallback(() => {
    if (!window.confirm('Reset this match?')) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    setTimer(7200);
    setInnings([]);
    setCurrentInnings(0);
    setRuns(0); setWickets(0); setBalls(0);
    setBatsmen([{ runs: 0, balls: 0 }, { runs: 0, balls: 0 }]);
    setStriker(0);
    setBallHistory([]);
    setExtras({ wide: 0, noball: 0, bye: 0, legbye: 0 });
    updateMatch(matchIndex, { innings: [], completed: false, result: '' });
    setRunning(true);
  }, [matchIndex, updateMatch]);

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <h2>{teams[m.t1]} vs {teams[m.t2]}</h2>
        <button className="btn-sm" onClick={resetMatch} title="Reset">↻</button>
      </div>

      <div className="timer-bar">
        <span className="timer-label">Session Timer</span>
        <span className={`timer-value ${timer < 600 ? 'urgent' : ''}`}>
          {formatTime(timer)}
        </span>
      </div>

      <div className="innings-section">
        <div className="innings-header">
          <span className="team-label">{teams[battingTeam]} Batting</span>
          <div className="score-display">
            <span className="runs">{runs}</span>
            <span className="wickets-divider">/</span>
            <span className="wickets">{wickets}</span>
          </div>
          <div className="overs-display">
            <span className="overs-label">Overs</span>
            <span className="overs-value">{overStr}</span>
          </div>
        </div>

        {totalExtras > 0 && (
          <div className="extras-row">
            Extras: {totalExtras}
            {Object.entries(extras).filter(([_, v]) => v > 0).map(([k, v]) => (
              <span key={k}> • {k}: {v}</span>
            ))}
          </div>
        )}

        <div className="batsmen-strip">
          <span className="name">
            {striker === 0 && <span className="dot active" />}
            {battingPlayers[0] || 'Batsman 1'}
          </span>
          <span className="score">{batsmen[0].runs} ({batsmen[0].balls})</span>
        </div>
        <div className="batsmen-strip">
          <span className="name">
            {striker === 1 && <span className="dot active" />}
            {battingPlayers[1] || 'Batsman 2'}
          </span>
          <span className="score">{batsmen[1].runs} ({batsmen[1].balls})</span>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
          Bowler: {currentBowler}
        </div>

        <div className="scoring-buttons">
          {[0, 1, 2, 3, 4, 6].map(r => (
            <button
              key={r}
              className={`score-btn ${r === 4 ? 'four' : r === 6 ? 'six' : ''}`}
              onClick={() => addBowl('run', r)}
              disabled={isInningsOver}
            >
              {r === 0 ? '•' : r}
            </button>
          ))}
          <button className="score-btn wicket" onClick={() => addBowl('wicket', 0)} disabled={isInningsOver}>W</button>
          {EXTRA_TYPES.map(e => (
            <button key={e.key} className="score-btn extra" onClick={() => addBowl('extra', e.key)} disabled={isInningsOver}>
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {innings.length > 0 && (
        <div id="innings-summary">
          {innings.map((inn, i) => {
            const overs = `${Math.floor(inn.balls / 6)}.${inn.balls % 6}`;
            return (
              <div className="innings-card" key={i}>
                <span className="team-name">{teams[inn.battingTeam]}</span>
                <div>
                  <span className="inn-score">{inn.runs}/{inn.wickets}</span>
                  <span className="inn-overs"> ({overs} ov)</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {ballHistory.length > 0 && (
        <div className="over-history">
          <h4>Ball-by-Ball • Over {Math.floor(balls / 6) + (balls % 6 > 0 ? 1 : 0)}</h4>
          <div className="ball-history" ref={historyRef}>
            {ballHistory.map((b, i) => {
              const isOverEnd = (i + 1) % 6 === 0 && i + 1 < ballHistory.length;
              return (
                <span key={i}>
                  <span className={`ball-chip ${b.cls}`}>{b.label}</span>
                  {isOverEnd && <span className="over-divider" />}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="match-controls">
        {currentInnings < 2 && (
          <button className="btn-secondary" onClick={nextInnings} disabled={balls === 0}>
            {currentInnings === 0 ? '1st Innings Done →' : '2nd Innings Done →'}
          </button>
        )}
        {currentInnings >= 2 && (
          <button className="btn-secondary" onClick={nextInnings} disabled={balls === 0}>
            3rd Innings Done →
          </button>
        )}
        <button className="btn-secondary danger" onClick={endMatch}>
          End Match
        </button>
      </div>
    </div>
  );
}
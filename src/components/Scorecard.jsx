import { useState, useEffect, useRef, useCallback } from 'react';

const DISMISSAL_TYPES = [
  { key: 'bowled', label: 'Bowled' },
  { key: 'caught', label: 'Caught' },
  { key: 'lbw', label: 'LBW' },
  { key: 'runOut', label: 'Run Out' },
  { key: 'stumped', label: 'Stumped' },
  { key: 'hitWicket', label: 'Hit Wkt' },
];

const EXTRA_TYPES = [
  { key: 'wide', label: 'WD' },
  { key: 'noball', label: 'NB' },
  { key: 'bye', label: 'B' },
  { key: 'legbye', label: 'LB' },
];

const MAX_BALLS = 24;
const MAX_WICKETS = 10;

function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const RUN_BUTTONS = [0, 1, 2, 3, 4, 6];

export default function Scorecard({ teams, players, matchIndex, matches, updateMatch, onBack, onDone }) {
  const m = matches[matchIndex];

  const [phase, setPhase] = useState('selectOpeners');
  const [currentInnings, setCurrentInnings] = useState(0);
  const [runs, setRuns] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [balls, setBalls] = useState(0);

  const [currentBatsmen, setCurrentBatsmen] = useState([]);
  const [strikerIdx, setStrikerIdx] = useState(0);
  const [batsmanStats, setBatsmanStats] = useState({});
  const [outPlayers, setOutPlayers] = useState([]);
  const [selectedOpeners, setSelectedOpeners] = useState([]);

  const [currentBowler, setCurrentBowler] = useState('');
  const [bowlerStats, setBowlerStats] = useState({});

  const [extras, setExtras] = useState({ wide: 0, noball: 0, bye: 0, legbye: 0 });
  const [ballHistory, setBallHistory] = useState([]);
  const [innings, setInnings] = useState([]);

  const [showDismissalModal, setShowDismissalModal] = useState(false);
  const [showRunOutPicker, setShowRunOutPicker] = useState(false);
  const [showNextBatsman, setShowNextBatsman] = useState(false);
  const [showBowlerSelect, setShowBowlerSelect] = useState(false);
  const [pendingWicketIdx, setPendingWicketIdx] = useState(null);
  const [pendingDismissalType, setPendingDismissalType] = useState(null);

  const [timer, setTimer] = useState(7200);
  const [running, setRunning] = useState(false);
  const timerRef = useRef(null);
  const historyRef = useRef(null);

  const battingTeam = currentInnings === 0 ? m.t1 : currentInnings === 1 ? m.t2 : m.t1;
  const bowlingTeam = currentInnings === 0 ? m.t2 : currentInnings === 1 ? m.t1 : m.t2;
  const battingTeamPlayers = players[battingTeam] || [];
  const bowlingTeamPlayers = players[bowlingTeam] || [];

  const target = currentInnings === 1 && innings.length > 0 ? innings[0].runs + 1 : null;
  const targetAchieved = target !== null && runs >= target;
  const ballsRemaining = Math.max(0, MAX_BALLS - balls);
  const runsNeeded = target !== null ? Math.max(0, target - runs) : 0;

  const availableBatsmen = battingTeamPlayers.filter(
    p => !currentBatsmen.includes(p) && !outPlayers.includes(p) && !(batsmanStats[p] && batsmanStats[p].isOut)
  );

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setTimer(prev => { if (prev <= 1) { clearInterval(timerRef.current); return 0; } return prev - 1; });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

  useEffect(() => { if (!running) setRunning(true); }, []);
  useEffect(() => { if (historyRef.current) historyRef.current.scrollLeft = historyRef.current.scrollWidth; }, [ballHistory]);

  useEffect(() => {
    if (phase === 'selectOpeners') {
      setSelectedOpeners([]);
      if (bowlingTeamPlayers.length > 0) setCurrentBowler(bowlingTeamPlayers[0]);
    }
  }, [phase, currentInnings]);

  const isInningsOver = balls >= MAX_BALLS || wickets >= MAX_WICKETS;
  const overStr = `${Math.floor(balls / 6)}.${balls % 6}`;
  const totalExtras = extras.wide + extras.noball + extras.bye + extras.legbye;

  const startInnings = () => {
    if (selectedOpeners.length < 2 || !currentBowler) return;
    setCurrentBatsmen([selectedOpeners[0], selectedOpeners[1]]);
    setStrikerIdx(0);
    setOutPlayers([]);
    const stats = {};
    battingTeamPlayers.forEach(p => { stats[p] = { runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissal: null, dismissedBy: null }; });
    setBatsmanStats(stats);
    const bowlerSt = {};
    bowlingTeamPlayers.forEach(p => { bowlerSt[p] = { runs: 0, wickets: 0, balls: 0, fours: 0, sixes: 0 }; });
    if (!bowlerSt[currentBowler]) bowlerSt[currentBowler] = { runs: 0, wickets: 0, balls: 0, fours: 0, sixes: 0 };
    setBowlerStats(bowlerSt);
    setRuns(0); setWickets(0); setBalls(0);
    setExtras({ wide: 0, noball: 0, bye: 0, legbye: 0 });
    setBallHistory([]);
    setPhase('scoring');
  };

  const addBowl = useCallback((type, value) => {
    if (isInningsOver || targetAchieved || phase !== 'scoring') return;
    if (type === 'wicket') { setShowDismissalModal(true); return; }

    const isWideOrNoball = (type === 'extra' && (value === 'wide' || value === 'noball'));
    const runsScored = type === 'run' ? value : (type === 'extra' ? 1 : 0);
    const thisBatsman = currentBatsmen[strikerIdx];
    const isFour = type === 'run' && value === 4;
    const isSix = type === 'run' && value === 6;

    setBalls(prev => isWideOrNoball ? prev : prev + 1);
    setRuns(prev => prev + runsScored);

    if (type === 'run') {
      setBatsmanStats(prev => {
        const next = { ...prev };
        if (next[thisBatsman]) {
          next[thisBatsman] = {
            ...next[thisBatsman],
            runs: next[thisBatsman].runs + value,
            balls: next[thisBatsman].balls + 1,
            fours: next[thisBatsman].fours + (isFour ? 1 : 0),
            sixes: next[thisBatsman].sixes + (isSix ? 1 : 0),
          };
        }
        return next;
      });
      if (value === 1 || value === 3) setStrikerIdx(prev => prev === 0 ? 1 : 0);
    } else if (type === 'extra') {
      setExtras(prev => ({ ...prev, [value]: prev[value] + 1 }));
    }

    if (currentBowler && bowlerStats[currentBowler]) {
      setBowlerStats(prev => {
        const next = { ...prev };
        next[currentBowler] = {
          ...next[currentBowler],
          runs: next[currentBowler].runs + runsScored,
          balls: next[currentBowler].balls + (isWideOrNoball ? 0 : 1),
          fours: next[currentBowler].fours + (isFour ? 1 : 0),
          sixes: next[currentBowler].sixes + (isSix ? 1 : 0),
        };
        return next;
      });
    }

    setBallHistory(prev => [...prev, {
      label: type === 'run' ? (value === 4 ? '4' : value === 6 ? '6' : String(value)) : (type === 'extra' ? ({ wide: 'WD', noball: 'NB', bye: 'B', legbye: 'LB' }[value] || value) : ''),
      cls: type === 'run' ? (value === 4 ? 'four' : value === 6 ? 'six' : 'run') : 'extra',
      bowler: currentBowler, batsman: thisBatsman,
    }]);
  }, [isInningsOver, targetAchieved, phase, strikerIdx, currentBatsmen, currentBowler, bowlerStats]);

  const selectDismissalType = (type) => {
    setShowDismissalModal(false);
    if (type === 'runOut') {
      setPendingDismissalType('runOut');
      setShowRunOutPicker(true);
    } else {
      setPendingDismissalType(type);
      setPendingWicketIdx(strikerIdx);
      processWicket(strikerIdx, type);
    }
  };

  const selectRunOutTarget = (idx) => {
    setShowRunOutPicker(false);
    setPendingWicketIdx(idx);
    processWicket(idx, 'runOut');
  };

  const processWicket = (outIdx, type) => {
    setPendingDismissalType(type);
    setPendingWicketIdx(outIdx);

    if (availableBatsmen.length > 0) {
      setShowNextBatsman(true);
    } else {
      finalizeWicket(outIdx, type, null);
    }
  };

  const selectNextBatsman = (name) => {
    setShowNextBatsman(false);
    finalizeWicket(pendingWicketIdx, pendingDismissalType, name);
  };

  const finalizeWicket = (outIdx, type, nextName) => {
    const outBatsman = currentBatsmen[outIdx];

    setBatsmanStats(prev => {
      const next = { ...prev };
      if (next[outBatsman]) {
        next[outBatsman] = { ...next[outBatsman], balls: next[outBatsman].balls + 1, isOut: true, dismissal: type, dismissedBy: currentBowler };
      }
      return next;
    });
    setOutPlayers(prev => [...prev, outBatsman]);
    setWickets(prev => prev + 1);
    setBalls(prev => prev + 1);

    if (currentBowler && bowlerStats[currentBowler]) {
      setBowlerStats(prev => {
        const next = { ...prev };
        next[currentBowler] = { ...next[currentBowler], wickets: next[currentBowler].wickets + 1, balls: next[currentBowler].balls + 1 };
        return next;
      });
    }

    setBallHistory(prev => [...prev, { label: 'W', cls: 'wicket', bowler: currentBowler, batsman: outBatsman, dismissal: type }]);

    if (nextName) {
      const newBatsmen = [...currentBatsmen];
      newBatsmen[outIdx] = nextName;
      setCurrentBatsmen(newBatsmen);
    }

    setPendingWicketIdx(null);
    setPendingDismissalType(null);
  };

  const changeBowler = (name) => {
    setCurrentBowler(name);
    if (!bowlerStats[name]) {
      setBowlerStats(prev => ({ ...prev, [name]: { runs: 0, wickets: 0, balls: 0, fours: 0, sixes: 0 } }));
    }
    setShowBowlerSelect(false);
  };

  const endInnings = useCallback(() => {
    const innData = {
      battingTeam, battingOrder: currentBatsmen, runs, wickets, balls,
      batsmanStats: JSON.parse(JSON.stringify(batsmanStats)),
      bowlerStats: JSON.parse(JSON.stringify(bowlerStats)),
      extras: { ...extras },
      ballHistory: ballHistory.map(b => ({ ...b })),
      currentBowler,
    };
    const newInnings = [...innings, innData];
    setInnings(newInnings);
    updateMatch(matchIndex, { innings: newInnings });
    setPhase('inningsReview');
  }, [battingTeam, currentBatsmen, runs, wickets, balls, batsmanStats, bowlerStats, extras, ballHistory, currentBowler, innings, updateMatch, matchIndex]);

  const nextInnings = useCallback(() => {
    setCurrentInnings(prev => prev + 1);
    setCurrentBatsmen([]);
    setBatsmanStats({});
    setBowlerStats({});
    setOutPlayers([]);
    setPhase('selectOpeners');
  }, []);

  const completeMatch = useCallback(() => {
    const finalInnings = balls > 0 && phase === 'scoring'
      ? [...innings, { battingTeam, battingOrder: currentBatsmen, runs, wickets, balls, batsmanStats: JSON.parse(JSON.stringify(batsmanStats)), bowlerStats: JSON.parse(JSON.stringify(bowlerStats)), extras: { ...extras }, ballHistory: ballHistory.map(b => ({ ...b })), currentBowler }]
      : innings;
    setInnings(finalInnings);
    if (finalInnings.length >= 2) {
      const inn1 = finalInnings[0];
      const inn2 = finalInnings[1];
      let result = '';
      if (inn1.runs > inn2.runs) result = `${teams[m.t1]} won by ${inn1.runs - inn2.runs} runs`;
      else if (inn2.runs > inn1.runs) result = `${teams[m.t2]} won by ${10 - inn2.wickets} wicket${10 - inn2.wickets !== 1 ? 's' : ''}`;
      else result = 'Match Tied!';
      updateMatch(matchIndex, { innings: finalInnings, completed: true, result });
    } else {
      updateMatch(matchIndex, { innings: finalInnings, completed: true });
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    onDone();
  }, [innings, battingTeam, currentBatsmen, runs, wickets, balls, batsmanStats, bowlerStats, extras, ballHistory, currentBowler, phase, teams, m.t1, m.t2, updateMatch, matchIndex, onDone]);

  const resetMatch = useCallback(() => {
    if (!window.confirm('Reset this match?')) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    setTimer(7200);
    setInnings([]);
    setCurrentInnings(0);
    setRuns(0); setWickets(0); setBalls(0);
    setCurrentBatsmen([]);
    setBatsmanStats({});
    setBowlerStats({});
    setOutPlayers([]);
    setStrikerIdx(0);
    setBallHistory([]);
    setExtras({ wide: 0, noball: 0, bye: 0, legbye: 0 });
    setCurrentBowler('');
    setPhase('selectOpeners');
    updateMatch(matchIndex, { innings: [], completed: false, result: '' });
    setRunning(true);
  }, [matchIndex, updateMatch]);

  // === Select Openers Phase ===
  if (phase === 'selectOpeners') {
    return (
      <div className="screen">
        <div className="screen-header">
          <button className="btn-back" onClick={onBack}>←</button>
          <h2>Select Openers</h2>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px', marginBottom: '16px' }}>
          {teams[battingTeam]} — Pick 2 openers &amp; bowler
        </p>
        <div className="opener-grid">
          {battingTeamPlayers.map(p => (
            <button
              key={p}
              className={`opener-chip ${selectedOpeners.includes(p) ? 'selected' : ''}`}
              onClick={() => {
                if (selectedOpeners.includes(p)) {
                  setSelectedOpeners(prev => prev.filter(x => x !== p));
                } else if (selectedOpeners.length < 2) {
                  setSelectedOpeners(prev => [...prev, p]);
                }
              }}
            >
              {p}
              {selectedOpeners.includes(p) && <span className="opener-badge">{selectedOpeners.indexOf(p) === 0 ? 'Opener 1' : 'Opener 2'}</span>}
            </button>
          ))}
        </div>
        <div className="bowler-select-section">
          <label className="bowler-select-label">Opening Bowler</label>
          <select className="bowler-select" value={currentBowler} onChange={e => setCurrentBowler(e.target.value)}>
            <option value="">Select...</option>
            {bowlingTeamPlayers.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <button className="btn-primary" disabled={selectedOpeners.length < 2 || !currentBowler} onClick={startInnings}>
          Start Innings →
        </button>
      </div>
    );
  }

  // === Innings Review Phase ===
  if (phase === 'inningsReview') {
    const inn = innings[innings.length - 1];
    const batStats = Object.entries(inn.batsmanStats || {});
    const bowlStats = Object.entries(inn.bowlerStats || {}).filter(([_, v]) => v.balls > 0);
    const innOvers = `${Math.floor(inn.balls / 6)}.${inn.balls % 6}`;

    return (
      <div className="screen">
        <div className="screen-header">
          <button className="btn-back" onClick={onBack}>←</button>
          <h2>Innings Over</h2>
        </div>
        <div className="innings-review-card">
          <div className="review-header">
            <span className="review-team">{teams[inn.battingTeam]}</span>
            <span className="review-score">{inn.runs}/{inn.wickets}</span>
            <span className="review-overs">({innOvers} ov)</span>
          </div>
          <div className="review-extras">Extras: {inn.extras.wide + inn.extras.noball + inn.extras.bye + inn.extras.legbye}
            {Object.entries(inn.extras).filter(([_, v]) => v > 0).map(([k, v]) => (<span key={k}> • {k}: {v}</span>))}
          </div>
        </div>
        <h4 className="sheet-heading">Batting</h4>
        <div className="score-sheet">
          <div className="sheet-row sheet-header">
            <span className="sheet-name">Batter</span>
            <span className="sheet-stat">R</span>
            <span className="sheet-stat">B</span>
            <span className="sheet-stat">4s</span>
            <span className="sheet-stat">6s</span>
            <span className="sheet-sr">SR</span>
          </div>
          {batStats.map(([name, s]) => {
            const sr = s.balls > 0 ? ((s.runs / s.balls) * 100).toFixed(0) : '-';
            const outStr = s.isOut ? (s.dismissal === 'runOut' ? 'run out' : `b ${s.dismissedBy || ''}`) : 'not out';
            return (
              <div className="sheet-row" key={name}>
                <span className="sheet-name">{name}</span>
                <span className="sheet-stat">{s.runs}</span>
                <span className="sheet-stat">{s.balls}</span>
                <span className="sheet-stat">{s.fours}</span>
                <span className="sheet-stat">{s.sixes}</span>
                <span className="sheet-sr">{sr}</span>
                <span className="sheet-out">{outStr}</span>
              </div>
            );
          })}
        </div>
        {bowlStats.length > 0 && (
          <>
            <h4 className="sheet-heading">Bowling</h4>
            <div className="score-sheet">
              <div className="sheet-row sheet-header">
                <span className="sheet-name">Bowler</span>
                <span className="sheet-stat">O</span>
                <span className="sheet-stat">R</span>
                <span className="sheet-stat">W</span>
                <span className="sheet-stat">Econ</span>
              </div>
              {bowlStats.map(([name, s]) => {
                const overs = `${Math.floor(s.balls / 6)}.${s.balls % 6}`;
                const econ = s.balls > 0 ? (s.runs / (s.balls / 6)).toFixed(1) : '-';
                return (
                  <div className="sheet-row" key={name}>
                    <span className="sheet-name">{name}</span>
                    <span className="sheet-stat">{overs}</span>
                    <span className="sheet-stat">{s.runs}</span>
                    <span className="sheet-stat">{s.wickets}</span>
                    <span className="sheet-stat">{econ}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
        <div className="match-controls" style={{ marginTop: '20px', flexDirection: 'column', gap: '10px' }}>
          {currentInnings < 1 ? (
            <button className="btn-primary" onClick={nextInnings}>Next Innings →</button>
          ) : (
            <button className="btn-primary" onClick={completeMatch}>Complete Match →</button>
          )}
        </div>
      </div>
    );
  }

  // === Scoring Phase ===
  return (
    <div className="screen">
      <div className="screen-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <h2>{teams[m.t1]} vs {teams[m.t2]}</h2>
        <button className="btn-sm" onClick={resetMatch} title="Reset">↻</button>
      </div>

      <div className="timer-bar">
        <span className="timer-label">Session Timer</span>
        <span className={`timer-value ${timer < 600 ? 'urgent' : ''}`}>{formatTime(timer)}</span>
      </div>

      {/* Target bar for 2nd innings */}
      {target !== null && (
        <div className={`target-bar ${targetAchieved ? 'achieved' : ''}`}>
          {targetAchieved ? (
            <span>🎉 Target Achieved! Match Won</span>
          ) : (
            <>
              <span>Target: <strong>{target}</strong></span>
              <span>Need <strong>{runsNeeded}</strong> runs from <strong>{ballsRemaining}</strong> balls</span>
            </>
          )}
        </div>
      )}

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
          <div className="extras-row">Extras: {totalExtras}
            {Object.entries(extras).filter(([_, v]) => v > 0).map(([k, v]) => (<span key={k}> • {k}: {v}</span>))}
          </div>
        )}

        <div className="batsmen-strip">
          <span className="name">
            {strikerIdx === 0 && <span className="dot active" />}
            {currentBatsmen[0] || 'Batsman 1'}
            {batsmanStats[currentBatsmen[0]]?.isOut && <span className="out-badge">OUT</span>}
          </span>
          <span className="score">{batsmanStats[currentBatsmen[0]]?.runs || 0} ({batsmanStats[currentBatsmen[0]]?.balls || 0})</span>
        </div>
        <div className="batsmen-strip">
          <span className="name">
            {strikerIdx === 1 && <span className="dot active" />}
            {currentBatsmen[1] || 'Batsman 2'}
            {batsmanStats[currentBatsmen[1]]?.isOut && <span className="out-badge">OUT</span>}
          </span>
          <span className="score">{batsmanStats[currentBatsmen[1]]?.runs || 0} ({batsmanStats[currentBatsmen[1]]?.balls || 0})</span>
        </div>

        {availableBatsmen.length > 0 && (
          <div className="remaining-count">{availableBatsmen.length} player{availableBatsmen.length !== 1 ? 's' : ''} yet to bat</div>
        )}

        <div className="bowler-display" onClick={() => setShowBowlerSelect(true)}>
          <span className="bowler-label">Bowler</span>
          <span className="bowler-name">{currentBowler || 'Select'}</span>
          <span className="bowler-change">✎</span>
        </div>
        {currentBowler && bowlerStats[currentBowler] && (
          <div className="bowler-figures">
            {Math.floor(bowlerStats[currentBowler].balls / 6)}.{bowlerStats[currentBowler].balls % 6} ov • {bowlerStats[currentBowler].runs} r • {bowlerStats[currentBowler].wickets} w
          </div>
        )}

        <div className="scoring-buttons">
          {RUN_BUTTONS.map(r => (
            <button key={r} className={`score-btn ${r === 4 ? 'four' : r === 6 ? 'six' : ''}`}
              onClick={() => addBowl('run', r)} disabled={isInningsOver || targetAchieved}>
              {r === 0 ? '•' : r}
            </button>
          ))}
          <button className="score-btn wicket" onClick={() => addBowl('wicket', 0)} disabled={isInningsOver || targetAchieved}>W</button>
          <button className="score-btn wicket runout" onClick={() => selectDismissalType('runOut')} disabled={isInningsOver || targetAchieved}>RO</button>
          {EXTRA_TYPES.map(e => (
            <button key={e.key} className="score-btn extra" onClick={() => addBowl('extra', e.key)} disabled={isInningsOver || targetAchieved}>{e.label}</button>
          ))}
        </div>
      </div>

      {ballHistory.length > 0 && (
        <div className="over-history">
          <h4>Ball-by-Ball • Over {Math.floor(balls / 6) + (balls % 6 > 0 ? 1 : 0)}</h4>
          <div className="ball-history" ref={historyRef}>
            {ballHistory.map((b, i) => {
              const isOverEnd = (i + 1) % 6 === 0 && i + 1 < ballHistory.length;
              return (
                <span key={i}>
                  <span className={`ball-chip ${b.cls}`} title={`${b.bowler} to ${b.batsman}`}>{b.label}</span>
                  {isOverEnd && <span className="over-divider" />}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="match-controls" style={{ flexDirection: 'column', gap: '10px' }}>
        {(isInningsOver || targetAchieved) && (
          <button className="btn-primary pulse-btn" onClick={endInnings}>
            {targetAchieved ? '🏆 Match Won — End Innings' : 'Innings Over → View Scorecard'}
          </button>
        )}
        {!isInningsOver && !targetAchieved && (
          <button className="btn-secondary" onClick={endInnings}>End Innings</button>
        )}
        <button className="btn-secondary danger" onClick={completeMatch}>End Match</button>
      </div>

      {/* Dismissal Type Modal */}
      {showDismissalModal && (
        <div className="modal-overlay" onClick={() => setShowDismissalModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Dismissal Type</h3>
            <div className="dismissal-grid">
              {DISMISSAL_TYPES.map(dt => (
                <button key={dt.key} className="dismissal-btn" onClick={() => selectDismissalType(dt.key)}>{dt.label}</button>
              ))}
            </div>
            <button className="btn-secondary" style={{ marginTop: '12px', width: '100%' }} onClick={() => setShowDismissalModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Run Out Picker Modal */}
      {showRunOutPicker && (
        <div className="modal-overlay" onClick={() => setShowRunOutPicker(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Who is Run Out?</h3>
            <div className="dismissal-grid">
              <button className="dismissal-btn runout-opt" onClick={() => selectRunOutTarget(0)}>
                {currentBatsmen[0] || 'Striker'} <span className="strike-label">(Striker)</span>
              </button>
              <button className="dismissal-btn runout-opt" onClick={() => selectRunOutTarget(1)}>
                {currentBatsmen[1] || 'Non-Striker'} <span className="strike-label">(Non-Striker)</span>
              </button>
            </div>
            <button className="btn-secondary" style={{ marginTop: '12px', width: '100%' }} onClick={() => setShowRunOutPicker(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Next Batsman Modal */}
      {showNextBatsman && (
        <div className="modal-overlay" onClick={() => setShowNextBatsman(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Choose Next Batsman</h3>
            <div className="next-batsman-grid">
              {availableBatsmen.map(p => {
                const stats = batsmanStats[p];
                return (
                  <button key={p} className="next-batsman-option" onClick={() => selectNextBatsman(p)}>
                    <span className="next-name">{p}</span>
                    {stats && (stats.runs > 0 || stats.balls > 0) && (
                      <span className="next-stats">{stats.runs} ({stats.balls})</span>
                    )}
                  </button>
                );
              })}
            </div>
            <button className="btn-secondary" style={{ marginTop: '12px', width: '100%' }} onClick={() => setShowNextBatsman(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Bowler Select Modal */}
      {showBowlerSelect && (
        <div className="modal-overlay" onClick={() => setShowBowlerSelect(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Select Bowler</h3>
            <div className="bowler-grid">
              {bowlingTeamPlayers.map(p => {
                const s = bowlerStats[p];
                const fig = s ? `${Math.floor(s.balls / 6)}.${s.balls % 6} ov • ${s.runs}/${s.wickets}` : '';
                return (
                  <button key={p} className={`bowler-option ${currentBowler === p ? 'active' : ''}`} onClick={() => changeBowler(p)}>
                    <span className="bowler-opt-name">{p}</span>
                    {fig && <span className="bowler-opt-fig">{fig}</span>}
                  </button>
                );
              })}
            </div>
            <button className="btn-secondary" style={{ marginTop: '12px', width: '100%' }} onClick={() => setShowBowlerSelect(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

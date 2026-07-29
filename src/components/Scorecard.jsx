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

const MAX_WICKETS = 10;
const RUN_BUTTONS = [0, 1, 2, 3, 4, 6];

function snapshot(runs, wickets, balls, batsmanStats, bowlerStats, extras, ballHistory, strikerIdx, currentBatsmen, outPlayers, currentBowler) {
  return {
    runs, wickets, balls,
    batsmanStats: JSON.parse(JSON.stringify(batsmanStats)),
    bowlerStats: JSON.parse(JSON.stringify(bowlerStats)),
    extras: { ...extras },
    ballHistory: ballHistory.map(b => ({ ...b })),
    strikerIdx, currentBatsmen: [...currentBatsmen], outPlayers: [...outPlayers], currentBowler,
  };
}

export default function Scorecard({ teams, matchIndex, matches, ballsPerOver, updateMatch, onBack, onDone, initialTeamPlayers }) {
  const m = matches[matchIndex];
  const MAX_BALLS = ballsPerOver * 4;

  const [phase, setPhase] = useState(m.battingFirst === null ? 'toss' : 'selectOpeners');
  const [teamPlayers, setTeamPlayers] = useState(initialTeamPlayers || {});
  const [currentInnings, setCurrentInnings] = useState(0);
  const [runs, setRuns] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [balls, setBalls] = useState(0);

  const [currentBatsmen, setCurrentBatsmen] = useState([]);
  const [strikerIdx, setStrikerIdx] = useState(0);
  const [batsmanStats, setBatsmanStats] = useState({});
  const [outPlayers, setOutPlayers] = useState([]);
  const [selectedOpeners, setSelectedOpeners] = useState(['', '']);
  const [newPlayerInput, setNewPlayerInput] = useState('');
  const [newBowlerInput, setNewBowlerInput] = useState('');
  const [newNextBatsmanInput, setNewNextBatsmanInput] = useState('');
  const [newReplaceBatsmanInput, setNewReplaceBatsmanInput] = useState('');
  const [newBowlerModalInput, setNewBowlerModalInput] = useState('');

  const [currentBowler, setCurrentBowler] = useState('');
  const [bowlerStats, setBowlerStats] = useState({});

  const [extras, setExtras] = useState({ wide: 0, noball: 0, bye: 0, legbye: 0 });
  const [ballHistory, setBallHistory] = useState([]);
  const [innings, setInnings] = useState([]);

  const [showDismissalModal, setShowDismissalModal] = useState(false);
  const [showRunOutPicker, setShowRunOutPicker] = useState(false);
  const [showRunOutRuns, setShowRunOutRuns] = useState(false);
  const [showNextBatsman, setShowNextBatsman] = useState(false);
  const [showBowlerSelect, setShowBowlerSelect] = useState(false);
  const [showReplaceBatsman, setShowReplaceBatsman] = useState(false);
  const [replaceBatsmanIdx, setReplaceBatsmanIdx] = useState(null);
  const [pendingWicketIdx, setPendingWicketIdx] = useState(null);
  const [pendingDismissalType, setPendingDismissalType] = useState(null);
  const [pendingRunOutRuns, setPendingRunOutRuns] = useState(0);

  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const historyRef = useRef(null);

  const battingFirst = m.battingFirst;
  const battingTeam = battingFirst !== null
    ? (currentInnings % 2 === 0 ? battingFirst : (m.t1 === battingFirst ? m.t2 : m.t1))
    : (currentInnings === 0 ? m.t1 : currentInnings === 1 ? m.t2 : m.t1);
  const bowlingTeam = battingFirst !== null
    ? (currentInnings % 2 === 0 ? (m.t1 === battingFirst ? m.t2 : m.t1) : battingFirst)
    : (currentInnings === 0 ? m.t2 : currentInnings === 1 ? m.t1 : m.t2);
  const battingTeamPlayers = teamPlayers[battingTeam] || [];
  const bowlingTeamPlayers = teamPlayers[bowlingTeam] || [];

  const addPlayerToTeam = useCallback((teamIdx, name) => {
    const n = name.trim();
    if (!n) return;
    setTeamPlayers(prev => {
      const arr = prev[teamIdx] || [];
      if (arr.includes(n)) return prev;
      return { ...prev, [teamIdx]: [...arr, n] };
    });
  }, []);
  const target = currentInnings === 1 && innings.length > 0 ? innings[0].runs + 1 : null;
  const targetAchieved = target !== null && runs >= target;
  const ballsRemaining = Math.max(0, MAX_BALLS - balls);
  const runsNeeded = target !== null ? Math.max(0, target - runs) : 0;

  const availableBatsmen = battingTeamPlayers.filter(
    p => !currentBatsmen.includes(p) && !outPlayers.includes(p) && !(batsmanStats[p] && batsmanStats[p].isOut)
  );

  useEffect(() => { if (historyRef.current) historyRef.current.scrollLeft = historyRef.current.scrollWidth; }, [ballHistory]);

  useEffect(() => {
    if (phase === 'selectOpeners') {
      setSelectedOpeners(['', '']);
      setNewPlayerInput('');
      setNewBowlerInput('');
      if (bowlingTeamPlayers.length > 0) setCurrentBowler(bowlingTeamPlayers[0]);
    }
  }, [phase, currentInnings]);

  useEffect(() => {
    if (balls > 0 && balls % ballsPerOver === 0 && phase === 'scoring') {
      setStrikerIdx(prev => prev === 0 ? 1 : 0);
    }
  }, [balls]);

  const pushUndo = useCallback(() => {
    setUndoStack(prev => {
      const snap = snapshot(runs, wickets, balls, batsmanStats, bowlerStats, extras, ballHistory, strikerIdx, currentBatsmen, outPlayers, currentBowler);
      const next = [...prev, snap];
      if (next.length > 50) next.shift();
      return next;
    });
    setRedoStack([]);
  }, [runs, wickets, balls, batsmanStats, bowlerStats, extras, ballHistory, strikerIdx, currentBatsmen, outPlayers, currentBowler]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const snap = snapshot(runs, wickets, balls, batsmanStats, bowlerStats, extras, ballHistory, strikerIdx, currentBatsmen, outPlayers, currentBowler);
    setRedoStack(prev => [...prev, snap]);
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRuns(prev.runs);
    setWickets(prev.wickets);
    setBalls(prev.balls);
    setBatsmanStats(prev.batsmanStats);
    setBowlerStats(prev.bowlerStats);
    setExtras(prev.extras);
    setBallHistory(prev.ballHistory);
    setStrikerIdx(prev.strikerIdx);
    setCurrentBatsmen(prev.currentBatsmen);
    setOutPlayers(prev.outPlayers);
    setCurrentBowler(prev.currentBowler);
  }, [undoStack, runs, wickets, balls, batsmanStats, bowlerStats, extras, ballHistory, strikerIdx, currentBatsmen, outPlayers, currentBowler]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const snap = snapshot(runs, wickets, balls, batsmanStats, bowlerStats, extras, ballHistory, strikerIdx, currentBatsmen, outPlayers, currentBowler);
    setUndoStack(prev => [...prev, snap]);
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setRuns(next.runs);
    setWickets(next.wickets);
    setBalls(next.balls);
    setBatsmanStats(next.batsmanStats);
    setBowlerStats(next.bowlerStats);
    setExtras(next.extras);
    setBallHistory(next.ballHistory);
    setStrikerIdx(next.strikerIdx);
    setCurrentBatsmen(next.currentBatsmen);
    setOutPlayers(next.outPlayers);
    setCurrentBowler(next.currentBowler);
  }, [redoStack, runs, wickets, balls, batsmanStats, bowlerStats, extras, ballHistory, strikerIdx, currentBatsmen, outPlayers, currentBowler]);

  const isInningsOver = balls >= MAX_BALLS || wickets >= MAX_WICKETS;
  const overStr = `${Math.floor(balls / ballsPerOver)}.${balls % ballsPerOver}`;
  const totalExtras = extras.wide + extras.noball + extras.bye + extras.legbye;

  const startInnings = () => {
    if (!selectedOpeners[0] || !selectedOpeners[1] || !currentBowler) return;
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
    setUndoStack([]);
    setRedoStack([]);
    setPhase('scoring');
  };

  const addBowl = useCallback((type, value) => {
    if (isInningsOver || targetAchieved || phase !== 'scoring') return;
    if (type === 'wicket') { setShowDismissalModal(true); return; }

    pushUndo();

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
  }, [isInningsOver, targetAchieved, phase, strikerIdx, currentBatsmen, currentBowler, bowlerStats, pushUndo]);

  const selectDismissalType = (type) => {
    setShowDismissalModal(false);
    if (type === 'runOut') {
      setPendingDismissalType('runOut');
      setPendingRunOutRuns(0);
      setShowRunOutPicker(true);
    } else {
      setPendingDismissalType(type);
      setPendingWicketIdx(strikerIdx);
      processWicket(strikerIdx, type);
    }
  };

  const selectRunOutTarget = (idx) => {
    setShowRunOutPicker(false);
    setShowRunOutRuns(true);
    setPendingWicketIdx(idx);
  };

  const selectRunOutRuns = (r) => {
    setShowRunOutRuns(false);
    setPendingRunOutRuns(r);
    processWicket(pendingWicketIdx, 'runOut', r);
  };

  const processWicket = (outIdx, type, extraRuns = 0) => {
    setPendingDismissalType(type);
    setPendingWicketIdx(outIdx);
    setPendingRunOutRuns(extraRuns);

    if (availableBatsmen.length > 0) {
      setShowNextBatsman(true);
    } else {
      finalizeWicket(outIdx, type, null, extraRuns);
    }
  };

  const selectNextBatsman = (name) => {
    setShowNextBatsman(false);
    finalizeWicket(pendingWicketIdx, pendingDismissalType, name, pendingRunOutRuns);
  };

  const swapStrike = useCallback(() => {
    if (phase !== 'scoring') return;
    pushUndo();
    setStrikerIdx(prev => prev === 0 ? 1 : 0);
  }, [phase, pushUndo]);

  const openReplaceBatsman = useCallback((idx) => {
    if (phase !== 'scoring' || availableBatsmen.length === 0) return;
    setReplaceBatsmanIdx(idx);
    setShowReplaceBatsman(true);
  }, [phase, availableBatsmen.length]);

  const doReplaceBatsman = useCallback((name) => {
    setShowReplaceBatsman(false);
    pushUndo();
    const newBatsmen = [...currentBatsmen];
    newBatsmen[replaceBatsmanIdx] = name;
    setCurrentBatsmen(newBatsmen);
    setBatsmanStats(prev => ({ ...prev, [name]: { ...prev[name], runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissal: null, dismissedBy: null } }));
    setReplaceBatsmanIdx(null);
  }, [replaceBatsmanIdx, currentBatsmen, pushUndo]);

  const finalizeWicket = (outIdx, type, nextName, extraRuns = 0) => {
    pushUndo();
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
    setRuns(prev => prev + extraRuns);

    if (extraRuns > 0 && currentBatsmen[strikerIdx] && strikerIdx !== outIdx && strikerIdx < currentBatsmen.length) {
      setBatsmanStats(prev => {
        const next = { ...prev };
        const nonStriker = currentBatsmen[strikerIdx];
        if (next[nonStriker]) {
          next[nonStriker] = { ...next[nonStriker], runs: next[nonStriker].runs + extraRuns };
        }
        return next;
      });
    } else if (extraRuns > 0 && outIdx === strikerIdx) {
      setBatsmanStats(prev => {
        const next = { ...prev };
        if (next[outBatsman]) {
          next[outBatsman] = { ...next[outBatsman], runs: next[outBatsman].runs + extraRuns };
        }
        return next;
      });
    }

    if (currentBowler && bowlerStats[currentBowler]) {
      setBowlerStats(prev => {
        const next = { ...prev };
        next[currentBowler] = {
          ...next[currentBowler],
          wickets: next[currentBowler].wickets + 1,
          balls: next[currentBowler].balls + 1,
          runs: next[currentBowler].runs + extraRuns,
        };
        return next;
      });
    }

    let runLabel = type === 'runOut' && extraRuns > 0 ? `RO+${extraRuns}` : 'W';
    if (type === 'runOut') runLabel = extraRuns > 0 ? `RO+${extraRuns}` : 'RO';
    setBallHistory(prev => [...prev, { label: runLabel, cls: 'wicket', bowler: currentBowler, batsman: outBatsman, dismissal: type }]);

    if (nextName) {
      const newBatsmen = [...currentBatsmen];
      newBatsmen[outIdx] = nextName;
      setCurrentBatsmen(newBatsmen);
    }

    setPendingWicketIdx(null);
    setPendingDismissalType(null);
    setPendingRunOutRuns(0);
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
    setUndoStack([]);
    setRedoStack([]);
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
      const inn1Team = teams[inn1.battingTeam];
      const inn2Team = teams[inn2.battingTeam];
      let result = '';
      if (inn1.runs > inn2.runs) result = `${inn1Team} won by ${inn1.runs - inn2.runs} runs`;
      else if (inn2.runs > inn1.runs) result = `${inn2Team} won by ${10 - inn2.wickets} wicket${10 - inn2.wickets !== 1 ? 's' : ''}`;
      else result = 'Match Tied!';
      updateMatch(matchIndex, { innings: finalInnings, completed: true, result });
    } else {
      updateMatch(matchIndex, { innings: finalInnings, completed: true });
    }
    onDone();
  }, [innings, battingTeam, currentBatsmen, runs, wickets, balls, batsmanStats, bowlerStats, extras, ballHistory, currentBowler, phase, teams, m.t1, m.t2, updateMatch, matchIndex, onDone]);

  const resetMatch = useCallback(() => {
    if (!window.confirm('Reset this match?')) return;
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
    setUndoStack([]);
    setRedoStack([]);
    setPhase('selectOpeners');
    updateMatch(matchIndex, { innings: [], completed: false, result: '' });
  }, [matchIndex, updateMatch]);

  // === Toss Phase ===
  if (phase === 'toss') {
    return (
      <div className="screen">
        <div className="screen-header">
          <button className="btn-back" onClick={onBack}>←</button>
          <h2>Who bats first?</h2>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px', marginBottom: '24px' }}>
          {teams[m.t1]} vs {teams[m.t2]}
        </p>
        <div className="toss-grid">
          <button className="toss-btn" onClick={() => { updateMatch(matchIndex, { battingFirst: m.t1 }); setPhase('selectOpeners'); }}>
            <span className="toss-team">{teams[m.t1]}</span>
            <span className="toss-action">Bat First</span>
          </button>
          <button className="toss-btn" onClick={() => { updateMatch(matchIndex, { battingFirst: m.t2 }); setPhase('selectOpeners'); }}>
            <span className="toss-team">{teams[m.t2]}</span>
            <span className="toss-action">Bat First</span>
          </button>
        </div>
      </div>
    );
  }

  // === Select Openers Phase ===
  if (phase === 'selectOpeners') {
    const [o1, o2] = selectedOpeners;
    return (
      <div className="screen">
        <div className="screen-header">
          <button className="btn-back" onClick={onBack}>←</button>
          <h2>Openers & Bowler</h2>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px', marginBottom: '16px' }}>
          {teams[battingTeam]} batting • {teams[bowlingTeam]} bowling ({ballsPerOver} balls/over)
        </p>

        <div className="inline-player-section">
          <label className="inline-label">Opening Batsman 1</label>
          <div className="inline-player-row">
            <input className="team-input" placeholder="Name..." value={selectedOpeners[0] || ''}
              onChange={e => setSelectedOpeners(prev => [e.target.value, prev[1]])} />
            {battingTeamPlayers.filter(p => p !== selectedOpeners[1]).map(p => (
              <button key={p} className={`inline-chip ${selectedOpeners[0] === p ? 'active' : ''}`}
                onClick={() => setSelectedOpeners(prev => [p, prev[1]])}>{p}</button>
            ))}
          </div>
        </div>

        <div className="inline-player-section">
          <label className="inline-label">Opening Batsman 2</label>
          <div className="inline-player-row">
            <input className="team-input" placeholder="Name..." value={selectedOpeners[1] || ''}
              onChange={e => setSelectedOpeners(prev => [prev[0], e.target.value])} />
            {battingTeamPlayers.filter(p => p !== selectedOpeners[0]).map(p => (
              <button key={p} className={`inline-chip ${selectedOpeners[1] === p ? 'active' : ''}`}
                onClick={() => setSelectedOpeners(prev => [prev[0], p])}>{p}</button>
            ))}
          </div>
        </div>

        <div className="inline-player-section">
          <label className="inline-label">Add player to {teams[battingTeam]}</label>
          <div className="inline-player-row">
            <input className="team-input" placeholder="New player name..."
              value={newPlayerInput} onChange={e => setNewPlayerInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPlayerToTeam(battingTeam, newPlayerInput); setNewPlayerInput(''); } }} />
            <button className="btn-sm gold" onClick={() => { addPlayerToTeam(battingTeam, newPlayerInput); setNewPlayerInput(''); }}>+ Add</button>
          </div>
        </div>

        <div className="bowler-select-section" style={{ marginTop: '16px' }}>
          <label className="bowler-select-label">Opening Bowler ({teams[bowlingTeam]})</label>
          <div className="inline-player-row">
            <input className="team-input" placeholder="Bowler name..." value={currentBowler}
              onChange={e => setCurrentBowler(e.target.value)} />
            {bowlingTeamPlayers.map(p => (
              <button key={p} className={`inline-chip ${currentBowler === p ? 'active' : ''}`}
                onClick={() => setCurrentBowler(p)}>{p}</button>
            ))}
          </div>
          <div style={{ marginTop: '8px' }}>
            <input className="team-input" placeholder="Add bowler..."
              value={newBowlerInput} onChange={e => setNewBowlerInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPlayerToTeam(bowlingTeam, newBowlerInput); setNewBowlerInput(''); } }} />
            <button className="btn-sm gold" style={{ marginTop: '6px' }} onClick={() => { addPlayerToTeam(bowlingTeam, newBowlerInput); setNewBowlerInput(''); }}>+ Add Bowler</button>
          </div>
        </div>

        <button className="btn-primary" disabled={!selectedOpeners[0] || !selectedOpeners[1] || !currentBowler} onClick={() => { addPlayerToTeam(battingTeam, selectedOpeners[0]); addPlayerToTeam(battingTeam, selectedOpeners[1]); addPlayerToTeam(bowlingTeam, currentBowler); startInnings(); }}>
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
    const innOvers = `${Math.floor(inn.balls / ballsPerOver)}.${inn.balls % ballsPerOver}`;

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
                const overs = `${Math.floor(s.balls / ballsPerOver)}.${s.balls % ballsPerOver}`;
                const econ = s.balls > 0 ? (s.runs / (s.balls / ballsPerOver)).toFixed(1) : '-';
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
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="btn-sm" onClick={handleUndo} disabled={undoStack.length === 0} title="Undo">↩</button>
          <button className="btn-sm" onClick={handleRedo} disabled={redoStack.length === 0} title="Redo">↪</button>
          <button className="btn-sm" onClick={resetMatch} title="Reset">↻</button>
        </div>
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
          <span className="name" onClick={() => openReplaceBatsman(0)} style={{ cursor: availableBatsmen.length > 0 ? 'pointer' : 'default' }}>
            {strikerIdx === 0 && <span className="dot active" />}
            {currentBatsmen[0] || 'Batsman 1'}
            {batsmanStats[currentBatsmen[0]]?.isOut && <span className="out-badge">OUT</span>}
          </span>
          <span className="score">{batsmanStats[currentBatsmen[0]]?.runs || 0} ({batsmanStats[currentBatsmen[0]]?.balls || 0})</span>
        </div>
        <div className="batsmen-strip">
          <span className="name" onClick={() => openReplaceBatsman(1)} style={{ cursor: availableBatsmen.length > 0 ? 'pointer' : 'default' }}>
            {strikerIdx === 1 && <span className="dot active" />}
            {currentBatsmen[1] || 'Batsman 2'}
            {batsmanStats[currentBatsmen[1]]?.isOut && <span className="out-badge">OUT</span>}
          </span>
          <span className="score">{batsmanStats[currentBatsmen[1]]?.runs || 0} ({batsmanStats[currentBatsmen[1]]?.balls || 0})</span>
        </div>

        <button className="swap-strike-btn" onClick={swapStrike} disabled={phase !== 'scoring'}>
          ⟳ Swap Strike
        </button>

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
            {Math.floor(bowlerStats[currentBowler].balls / ballsPerOver)}.{bowlerStats[currentBowler].balls % ballsPerOver} ov • {bowlerStats[currentBowler].runs} r • {bowlerStats[currentBowler].wickets} w
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
          <h4>Ball-by-Ball • Over {Math.floor(balls / ballsPerOver) + (balls % ballsPerOver > 0 ? 1 : 0)}</h4>
          <div className="ball-history" ref={historyRef}>
            {ballHistory.map((b, i) => {
              const isOverEnd = (i + 1) % ballsPerOver === 0 && i + 1 < ballHistory.length;
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

      {/* Run Out Runs Modal */}
      {showRunOutRuns && (
        <div className="modal-overlay" onClick={() => setShowRunOutRuns(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Runs scored on the play</h3>
            <div className="runout-runs-grid">
              {[0, 1, 2, 3].map(r => (
                <button key={r} className="dismissal-btn" onClick={() => selectRunOutRuns(r)}>
                  {r} {r === 0 ? 'run' : r === 1 ? 'run' : 'runs'}
                </button>
              ))}
            </div>
            <button className="btn-secondary" style={{ marginTop: '12px', width: '100%' }} onClick={() => setShowRunOutRuns(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Next Batsman Modal */}
      {showNextBatsman && (
        <div className="modal-overlay" onClick={() => setShowNextBatsman(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Choose Next Batsman</h3>
            <div className="inline-player-row" style={{ marginBottom: '10px' }}>
              <input className="team-input" placeholder="New batsman name..."
                value={newNextBatsmanInput} onChange={e => setNewNextBatsmanInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const name = newNextBatsmanInput.trim(); if (name) { addPlayerToTeam(battingTeam, name); selectNextBatsman(name); setNewNextBatsmanInput(''); } } }} />
              <button className="btn-sm gold" onClick={() => { const name = newNextBatsmanInput.trim(); if (name) { addPlayerToTeam(battingTeam, name); selectNextBatsman(name); setNewNextBatsmanInput(''); } }}>Go</button>
            </div>
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

      {/* Replace Batsman Modal */}
      {showReplaceBatsman && (
        <div className="modal-overlay" onClick={() => setShowReplaceBatsman(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Replace {currentBatsmen[replaceBatsmanIdx] || 'Batsman'}</h3>
            <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>Choose replacement</p>
            <div className="inline-player-row" style={{ marginBottom: '10px' }}>
              <input className="team-input" placeholder="New batsman name..."
                value={newReplaceBatsmanInput} onChange={e => setNewReplaceBatsmanInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const name = newReplaceBatsmanInput.trim(); if (name) { addPlayerToTeam(battingTeam, name); doReplaceBatsman(name); setNewReplaceBatsmanInput(''); } } }} />
              <button className="btn-sm gold" onClick={() => { const name = newReplaceBatsmanInput.trim(); if (name) { addPlayerToTeam(battingTeam, name); doReplaceBatsman(name); setNewReplaceBatsmanInput(''); } }}>Go</button>
            </div>
            <div className="next-batsman-grid">
              {availableBatsmen.map(p => {
                const stats = batsmanStats[p];
                return (
                  <button key={p} className="next-batsman-option" onClick={() => doReplaceBatsman(p)}>
                    <span className="next-name">{p}</span>
                    {stats && (stats.runs > 0 || stats.balls > 0) && (
                      <span className="next-stats">{stats.runs} ({stats.balls})</span>
                    )}
                  </button>
                );
              })}
            </div>
            <button className="btn-secondary" style={{ marginTop: '12px', width: '100%' }} onClick={() => setShowReplaceBatsman(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Bowler Select Modal */}
      {showBowlerSelect && (
        <div className="modal-overlay" onClick={() => setShowBowlerSelect(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Select Bowler</h3>
            <div className="inline-player-row" style={{ marginBottom: '10px' }}>
              <input className="team-input" placeholder="New bowler name..."
                value={newBowlerModalInput} onChange={e => setNewBowlerModalInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const name = newBowlerModalInput.trim(); if (name) { addPlayerToTeam(bowlingTeam, name); changeBowler(name); setNewBowlerModalInput(''); } } }} />
              <button className="btn-sm gold" onClick={() => { const name = newBowlerModalInput.trim(); if (name) { addPlayerToTeam(bowlingTeam, name); changeBowler(name); setNewBowlerModalInput(''); } }}>Go</button>
            </div>
            <div className="bowler-grid">
              {bowlingTeamPlayers.map(p => {
                const s = bowlerStats[p];
                const fig = s ? `${Math.floor(s.balls / ballsPerOver)}.${s.balls % ballsPerOver} ov • ${s.runs}/${s.wickets}` : '';
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
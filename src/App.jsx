import { useState, useCallback } from 'react';
import HomeScreen from './components/HomeScreen';
import PlayerSetup from './components/PlayerSetup';
import ManagePlayers from './components/ManagePlayers';
import MatchSelect from './components/MatchSelect';
import Scorecard from './components/Scorecard';
import SummaryScreen from './components/SummaryScreen';

const SCREENS = { HOME: 'home', PLAYER_SETUP: 'player_setup', MANAGEMENT: 'management', MATCH_SELECT: 'matches', SCORECARD: 'scorecard', SUMMARY: 'summary' };
const STORAGE_KEY_PLAYERS = 'rr_registered_players';

function loadPlayers() {
  try {
    const d = localStorage.getItem(STORAGE_KEY_PLAYERS);
    return d ? JSON.parse(d) : [];
  } catch { return []; }
}

function updateCareerStats(players, matches) {
  const stats = {};
  matches.forEach(m => {
    (m.innings || []).forEach(inn => {
      Object.entries(inn.batsmanStats || {}).forEach(([name, s]) => {
        if (!stats[name]) stats[name] = { runs: 0, balls: 0, fours: 0, sixes: 0, matches: 0, outs: 0, wickets: 0, bowlingBalls: 0, bowlingRuns: 0, bowlingFours: 0, bowlingSixes: 0 };
        stats[name].runs += s.runs;
        stats[name].balls += s.balls;
        stats[name].fours += s.fours;
        stats[name].sixes += s.sixes;
        if (s.isOut) stats[name].outs += 1;
      });
      Object.entries(inn.bowlerStats || {}).forEach(([name, s]) => {
        if (!stats[name]) stats[name] = { runs: 0, balls: 0, fours: 0, sixes: 0, matches: 0, outs: 0, wickets: 0, bowlingBalls: 0, bowlingRuns: 0, bowlingFours: 0, bowlingSixes: 0 };
        stats[name].wickets += s.wickets;
        stats[name].bowlingBalls += s.balls;
        stats[name].bowlingRuns += s.runs;
        stats[name].bowlingFours += s.fours;
        stats[name].bowlingSixes += s.sixes;
      });
    });
  });

  return players.map(p => {
    const s = stats[p.name];
    if (!s) return p;
    return {
      ...p,
      career: {
        runs: p.career.runs + s.runs,
        balls: p.career.balls + s.balls,
        fours: p.career.fours + s.fours,
        sixes: p.career.sixes + s.sixes,
        outs: p.career.outs + s.outs,
        matches: p.career.matches + 1,
        wickets: p.career.wickets + s.wickets,
        bowlingBalls: p.career.bowlingBalls + s.bowlingBalls,
        bowlingRuns: p.career.bowlingRuns + s.bowlingRuns,
        bowlingFours: p.career.bowlingFours + s.bowlingFours,
        bowlingSixes: p.career.bowlingSixes + s.bowlingSixes,
      }
    };
  });
}

export default function App() {
  const [screen, setScreen] = useState(SCREENS.HOME);
  const [teams, setTeams] = useState(['', '', '']);
  const [matches, setMatches] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [dayFinished, setDayFinished] = useState(false);
  const [ballsPerOver, setBallsPerOver] = useState(6);
  const [teamPlayers, setTeamPlayers] = useState({});
  const [registeredPlayers, setRegisteredPlayers] = useState(loadPlayers());

  const saveRegisteredPlayers = useCallback((players) => {
    localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(players));
    setRegisteredPlayers(players);
  }, []);

  const go = useCallback((s) => setScreen(s), []);

  const handleTeamsSubmit = useCallback((names, bpo) => {
    setTeams(names);
    setBallsPerOver(bpo);
    setTeamPlayers({});
    setMatches([]);
    go(SCREENS.PLAYER_SETUP);
  }, [go]);

  const handlePlayerSetupDone = useCallback((players) => {
    setTeamPlayers(players);
    go(SCREENS.MATCH_SELECT);
  }, [go]);

  const addMatch = useCallback((t1, t2) => {
    setMatches(prev => [...prev, { t1, t2, completed: false, innings: [], result: '', battingFirst: null }]);
  }, []);

  const deleteMatch = useCallback((idx) => {
    setMatches(prev => prev.filter((_, i) => i !== idx));
    if (currentMatch === idx) {
      setCurrentMatch(null);
    } else if (currentMatch > idx) {
      setCurrentMatch(prev => prev - 1);
    }
  }, [currentMatch]);

  const openMatch = useCallback((idx) => {
    setCurrentMatch(idx);
    go(SCREENS.SCORECARD);
  }, [go]);

  const updateMatch = useCallback((idx, data) => {
    setMatches(prev => {
      const m = [...prev];
      m[idx] = { ...m[idx], ...data };
      return m;
    });
  }, []);

  const updateFixture = useCallback((idx, t1, t2) => {
    setMatches(prev => {
      const m = [...prev];
      m[idx] = { ...m[idx], t1, t2, innings: [], completed: false, result: '' };
      return m;
    });
  }, []);

  const finishDay = useCallback(() => {
    const completedMatches = matches.map(m => m.completed ? m : { ...m, completed: true });
    const updated = updateCareerStats(registeredPlayers, matches);
    localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(updated));
    setRegisteredPlayers(updated);
    setMatches(completedMatches);
    setDayFinished(true);
    go(SCREENS.SUMMARY);
  }, [go, matches, registeredPlayers]);

  const resetAll = useCallback(() => {
    setTeams(['', '', '']);
    setMatches([]);
    setCurrentMatch(null);
    setDayFinished(false);
    setBallsPerOver(6);
    setTeamPlayers({});
    go(SCREENS.HOME);
  }, [go]);

  return (
    <div className="app-container">
      {screen === SCREENS.HOME && (
        <HomeScreen onStart={handleTeamsSubmit} onManagePlayers={() => go(SCREENS.MANAGEMENT)} />
      )}
      {screen === SCREENS.MANAGEMENT && (
        <ManagePlayers players={registeredPlayers} onUpdate={saveRegisteredPlayers} onBack={() => go(SCREENS.HOME)} />
      )}
      {screen === SCREENS.PLAYER_SETUP && (
        <PlayerSetup
          teams={teams}
          players={teamPlayers}
          registeredPlayers={registeredPlayers}
          onRegisterPlayer={saveRegisteredPlayers}
          onStart={handlePlayerSetupDone}
          onBack={() => go(SCREENS.HOME)}
        />
      )}
      {screen === SCREENS.MATCH_SELECT && (
        <MatchSelect teams={teams} matches={matches} onSelect={openMatch} onBack={resetAll} onUpdateFixture={updateFixture} onAddMatch={addMatch} onDeleteMatch={deleteMatch} onViewResults={finishDay} />
      )}
      {screen === SCREENS.SCORECARD && (
        <Scorecard
          key={currentMatch}
          teams={teams}
          matchIndex={currentMatch}
          matches={matches}
          ballsPerOver={ballsPerOver}
          updateMatch={updateMatch}
          onBack={() => go(SCREENS.MATCH_SELECT)}
          onDone={() => go(SCREENS.MATCH_SELECT)}
          initialTeamPlayers={teamPlayers}
        />
      )}
      {screen === SCREENS.SUMMARY && (
        <SummaryScreen teams={teams} matches={matches} ballsPerOver={ballsPerOver} onNew={resetAll} registeredPlayers={registeredPlayers} />
      )}
    </div>
  );
}
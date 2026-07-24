import { useState, useCallback } from 'react';
import HomeScreen from './components/HomeScreen';
import PlayerSetup from './components/PlayerSetup';
import MatchSelect from './components/MatchSelect';
import Scorecard from './components/Scorecard';
import SummaryScreen from './components/SummaryScreen';

const SCREENS = { HOME: 'home', PLAYER_SETUP: 'players', MATCH_SELECT: 'matches', SCORECARD: 'scorecard', SUMMARY: 'summary' };

export default function App() {
  const [screen, setScreen] = useState(SCREENS.HOME);
  const [teams, setTeams] = useState(['', '', '']);
  const [players, setPlayers] = useState({ 0: [], 1: [], 2: [] });
  const [matches, setMatches] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [dayFinished, setDayFinished] = useState(false);

  const go = useCallback((s) => setScreen(s), []);

  const handleTeamsSubmit = useCallback((names) => {
    setTeams(names);
    setPlayers({ 0: [], 1: [], 2: [] });
    go(SCREENS.PLAYER_SETUP);
  }, [go]);

  const handlePlayersSubmit = useCallback((p) => {
    setPlayers(p);
    const m = [
      { t1: 0, t2: 1, completed: false, innings: [], result: '' },
      { t1: 1, t2: 2, completed: false, innings: [], result: '' },
      { t1: 2, t2: 0, completed: false, innings: [], result: '' }
    ];
    setMatches(m);
    go(SCREENS.MATCH_SELECT);
  }, [go]);

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
    setMatches(prev => prev.map(m => m.completed ? m : { ...m, completed: true }));
    setDayFinished(true);
    go(SCREENS.SUMMARY);
  }, [go]);

  const resetAll = useCallback(() => {
    setTeams(['', '', '']);
    setPlayers({ 0: [], 1: [], 2: [] });
    setMatches([]);
    setCurrentMatch(null);
    setDayFinished(false);
    go(SCREENS.HOME);
  }, [go]);

  return (
    <div className="app-container">
      {screen === SCREENS.HOME && <HomeScreen onStart={handleTeamsSubmit} />}
      {screen === SCREENS.PLAYER_SETUP && (
        <PlayerSetup teams={teams} players={players} onStart={handlePlayersSubmit} onBack={() => go(SCREENS.HOME)} />
      )}
      {screen === SCREENS.MATCH_SELECT && (
        <MatchSelect teams={teams} matches={matches} onSelect={openMatch} onBack={resetAll} onUpdateFixture={updateFixture} onViewResults={finishDay} />
      )}
      {screen === SCREENS.SCORECARD && (
        <Scorecard
          key={currentMatch}
          teams={teams}
          players={players}
          matchIndex={currentMatch}
          matches={matches}
          updateMatch={updateMatch}
          onBack={() => go(SCREENS.MATCH_SELECT)}
          onDone={() => go(SCREENS.MATCH_SELECT)}
        />
      )}
      {screen === SCREENS.SUMMARY && <SummaryScreen teams={teams} matches={matches} onNew={resetAll} />}
    </div>
  );
}
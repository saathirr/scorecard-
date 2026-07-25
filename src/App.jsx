import { useState, useCallback } from 'react';
import HomeScreen from './components/HomeScreen';
import MatchSelect from './components/MatchSelect';
import Scorecard from './components/Scorecard';
import SummaryScreen from './components/SummaryScreen';

const SCREENS = { HOME: 'home', MATCH_SELECT: 'matches', SCORECARD: 'scorecard', SUMMARY: 'summary' };

export default function App() {
  const [screen, setScreen] = useState(SCREENS.HOME);
  const [teams, setTeams] = useState(['', '', '']);
  const [matches, setMatches] = useState([]);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [dayFinished, setDayFinished] = useState(false);
  const [ballsPerOver, setBallsPerOver] = useState(6);

  const go = useCallback((s) => setScreen(s), []);

  const handleTeamsSubmit = useCallback((names, bpo) => {
    setTeams(names);
    setBallsPerOver(bpo);
    setMatches([]);
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
    setMatches(prev => prev.map(m => m.completed ? m : { ...m, completed: true }));
    setDayFinished(true);
    go(SCREENS.SUMMARY);
  }, [go]);

  const resetAll = useCallback(() => {
    setTeams(['', '', '']);
    setMatches([]);
    setCurrentMatch(null);
    setDayFinished(false);
    setBallsPerOver(6);
    go(SCREENS.HOME);
  }, [go]);

  return (
    <div className="app-container">
      {screen === SCREENS.HOME && <HomeScreen onStart={handleTeamsSubmit} />}
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
        />
      )}
      {screen === SCREENS.SUMMARY && <SummaryScreen teams={teams} matches={matches} ballsPerOver={ballsPerOver} onNew={resetAll} />}
    </div>
  );
}
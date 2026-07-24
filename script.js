const state = {
  teams: ['Team Alpha', 'Team Beta', 'Team Gamma'],
  matches: [],
  currentMatch: null,
  currentInnings: 0,
  innings: [],
  ballHistory: [],
  currentBalls: 0,
  currentBatsman: 0,
  batsmen: [
    { runs: 0, balls: 0 },
    { runs: 0, balls: 0 }
  ],
  extras: { wide: 0, noball: 0, bye: 0, legbye: 0 },
  timerInterval: null,
  timerSeconds: 7200,
  isRunning: false,
  lastBall: null
};

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

document.getElementById('start-btn').addEventListener('click', startMatch);

function startMatch() {
  const t1 = document.getElementById('team1').value.trim() || 'Team Alpha';
  const t2 = document.getElementById('team2').value.trim() || 'Team Beta';
  const t3 = document.getElementById('team3').value.trim() || 'Team Gamma';
  state.teams = [t1, t2, t3];
  state.matches = [
    { t1: 0, t2: 1, completed: false, innings: [], result: '' },
    { t1: 1, t2: 2, completed: false, innings: [], result: '' },
    { t1: 2, t2: 0, completed: false, innings: [], result: '' }
  ];
  showMatchSelect();
}

function showMatchSelect() {
  const list = document.getElementById('match-list');
  list.innerHTML = '';
  const labels = ['Match 1', 'Match 2', 'Match 3'];
  state.matches.forEach((m, i) => {
    const card = document.createElement('div');
    card.className = 'match-card' + (m.completed ? ' completed' : '');
    card.innerHTML = `
      <div>
        <div class="teams">${state.teams[m.t1]} vs ${state.teams[m.t2]}</div>
        ${m.result ? '<div class="match-result">' + m.result + '</div>' : ''}
      </div>
      <span class="arrow">${m.completed ? '&#x2713;' : '&#x25B6;'}</span>
    `;
    if (!m.completed) {
      card.onclick = () => openMatch(i);
    }
    list.appendChild(card);
  });
  showScreen('match-select-screen');
}

function openMatch(index) {
  state.currentMatch = index;
  state.currentInnings = state.matches[index].innings.length;
  const m = state.matches[index];

  document.getElementById('match-title').textContent =
    `${state.teams[m.t1]} vs ${state.teams[m.t2]}`;

  if (state.currentInnings > 0) {
    renderInningsSummary();
  }

  resetInnings();
  startTimer();
  showScreen('scorecard-screen');
}

function resetInnings() {
  state.innings.push({
    battingTeam: null,
    bowlingTeam: null,
    runs: 0,
    wickets: 0,
    balls: 0,
    batsmen: [
      { runs: 0, balls: 0 },
      { runs: 0, balls: 0 }
    ],
    extras: { wide: 0, noball: 0, bye: 0, legbye: 0 },
    ballHistory: []
  });
  state.ballHistory = [];
  state.currentBalls = 0;
  state.currentBatsman = 0;
  state.batsmen = [
    { runs: 0, balls: 0 },
    { runs: 0, balls: 0 }
  ];
  state.extras = { wide: 0, noball: 0, bye: 0, legbye: 0 };

  const m = state.matches[state.currentMatch];
  const innIdx = state.currentInnings;
  if (innIdx === 0) {
    state.innings[innIdx].battingTeam = m.t1;
    state.innings[innIdx].bowlingTeam = m.t2;
  } else if (innIdx === 1) {
    state.innings[innIdx].battingTeam = m.t2;
    state.innings[innIdx].bowlingTeam = m.t1;
  } else if (innIdx === 2) {
    state.innings[innIdx].battingTeam = m.t1;
    state.innings[innIdx].bowlingTeam = m.t2;
  } else {
    state.innings[innIdx].battingTeam = m.t2;
    state.innings[innIdx].bowlingTeam = m.t1;
  }

  document.getElementById('batting-label').textContent =
    state.teams[state.innings[innIdx].battingTeam] + ' Batting';
  updateScoreDisplay();
  updateBallHistory();

  document.getElementById('batsman1-score').textContent = '0 (0)';
  document.getElementById('batsman2-score').textContent = '0 (0)';

  document.getElementById('next-innings-btn').style.display = 'block';
  document.getElementById('end-match-btn').style.display = 'block';
  document.getElementById('current-innings').style.display = 'block';
}

function addRun(runs) {
  const inn = getCurrentInningsObj();
  if (!inn || inn.balls >= 24 || inn.wickets >= 10) return;

  const legal = runs > 0 ? 1 : 0;
  inn.balls += legal;
  inn.runs += runs;
  state.currentBalls += legal;

  state.batsmen[state.currentBatsman].runs += runs;
  if (legal > 0) state.batsmen[state.currentBatsman].balls += 1;

  const ballLabel = runs === 4 ? '4' : runs === 6 ? '6' : String(runs);
  addBallChip(ballLabel, runs === 4 ? 'four' : runs === 6 ? 'six' : 'run');

  if (runs === 1 || runs === 3) {
    state.currentBatsman = state.currentBatsman === 0 ? 1 : 0;
  }

  updateScoreDisplay();
  updateBatsmenDisplay();

  saveInnings();
  checkOverChange();
}

function addWicket() {
  const inn = getCurrentInningsObj();
  if (!inn || inn.balls >= 24 || inn.wickets >= 10) return;

  inn.balls++;
  inn.wickets++;
  state.currentBalls++;
  state.batsmen[state.currentBatsman].balls += 1;

  addBallChip('W', 'wicket');

  state.currentBatsman = state.currentBatsman === 0 ? 1 : 0;

  updateScoreDisplay();
  updateBatsmenDisplay();

  saveInnings();
  checkOverChange();
}

function addExtra(type) {
  const inn = getCurrentInningsObj();
  if (!inn || inn.balls >= 24 || inn.wickets >= 10) return;

  let runs = 1;
  let symbol = 'WD';
  let cls = 'extra';

  if (type === 'noball') {
    runs = 1;
    symbol = 'NB';
  } else if (type === 'bye') {
    runs = 1;
    symbol = 'B';
    inn.balls++;
    state.currentBalls++;
  } else if (type === 'legbye') {
    runs = 1;
    symbol = 'LB';
    inn.balls++;
    state.currentBalls++;
  } else {
    inn.balls++;
    state.currentBalls++;
  }

  inn.extras[type] = (inn.extras[type] || 0) + 1;
  inn.runs += runs;

  addBallChip(symbol, cls);

  updateScoreDisplay();
  saveInnings();
}

function addBallChip(label, cls) {
  const container = document.getElementById('ball-history');
  const chip = document.createElement('span');
  chip.className = `ball-chip ${cls}`;
  chip.textContent = label;
  container.appendChild(chip);
  container.scrollLeft = container.scrollWidth;
}

function checkOverChange() {
  if (state.currentBalls > 0 && state.currentBalls % 6 === 0) {
    const divider = document.createElement('span');
    divider.className = 'over-divider';
    document.getElementById('ball-history').appendChild(divider);
  }
}

function updateScoreDisplay() {
  const inn = getCurrentInningsObj();
  if (!inn) return;
  document.getElementById('score-runs').textContent = inn.runs;
  document.getElementById('score-wickets').textContent = inn.wickets;
  const overs = Math.floor(inn.balls / 6) + '.' + (inn.balls % 6);
  document.getElementById('score-overs').textContent = overs;
}

function updateBatsmenDisplay() {
  const inn = getCurrentInningsObj();
  if (!inn) return;
  document.getElementById('batsman1-score').textContent =
    `${inn.batsmen[0].runs} (${inn.batsmen[0].balls})`;
  document.getElementById('batsman2-score').textContent =
    `${inn.batsmen[1].runs} (${inn.batsmen[1].balls})`;
}

function updateBallHistory() {
  const container = document.getElementById('ball-history');
  container.innerHTML = '';
  const inn = getCurrentInningsObj();
  if (!inn) return;
  inn.ballHistory.forEach(b => {
    const chip = document.createElement('span');
    chip.className = `ball-chip ${b.cls}`;
    chip.textContent = b.label;
    container.appendChild(chip);
  });
}

function getCurrentInningsObj() {
  if (state.currentInnings < state.innings.length) {
    return state.innings[state.currentInnings];
  }
  return null;
}

function saveInnings() {
  const inn = getCurrentInningsObj();
  if (!inn) return;
  inn.runs = parseInt(document.getElementById('score-runs').textContent);
  inn.wickets = parseInt(document.getElementById('score-wickets').textContent);
  const oversStr = document.getElementById('score-overs').textContent;
  const [ov, ball] = oversStr.split('.');
  inn.balls = parseInt(ov) * 6 + parseInt(ball);
  inn.batsmen = JSON.parse(JSON.stringify(state.batsmen));
  inn.extras = JSON.parse(JSON.stringify(state.extras));
  inn.ballHistory = Array.from(document.getElementById('ball-history').children).map(c => ({
    label: c.textContent,
    cls: c.className.replace('ball-chip ', '')
  }));
}

function nextInnings() {
  const inn = getCurrentInningsObj();
  if (inn && inn.balls === 0) return;

  saveInnings();
  state.matches[state.currentMatch].innings.push(inn);

  if (state.currentInnings === 0) {
    renderInningsSummary();
  }

  state.currentInnings = state.innings.length;
  resetInnings();
  updateScoreDisplay();

  document.getElementById('next-innings-btn').style.display =
    state.currentInnings < 3 ? 'block' : 'none';
}

function renderInningsSummary() {
  const container = document.getElementById('innings-summary');
  container.innerHTML = '';
  const m = state.matches[state.currentMatch];
  m.innings.forEach((inn, i) => {
    const teamName = state.teams[inn.battingTeam];
    const overs = Math.floor(inn.balls / 6) + '.' + (inn.balls % 6);
    const card = document.createElement('div');
    card.className = 'innings-card';
    card.innerHTML = `
      <span class="team-name">${teamName}</span>
      <div>
        <span class="inn-score">${inn.runs}/${inn.wickets}</span>
        <span class="inn-overs"> (${overs} ov)</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function endMatch() {
  saveInnings();
  const m = state.matches[state.currentMatch];
  if (state.currentInnings < state.innings.length) {
    const inn = state.innings[state.currentInnings];
    if (inn.balls > 0) {
      m.innings.push(JSON.parse(JSON.stringify(inn)));
    }
  }

  stopTimer();

  if (m.innings.length >= 2) {
    const inn1 = m.innings[0];
    const inn2 = m.innings[1];
    if (inn1.runs > inn2.runs) {
      m.result = `${state.teams[m.t1]} won by ${inn1.runs - inn2.runs} runs`;
    } else if (inn2.runs > inn1.runs) {
      m.result = `${state.teams[m.t2]} won by ${10 - inn2.wickets} wickets`;
    } else {
      m.result = 'Match Tied!';
    }
  }

  m.completed = true;
  renderInningsSummary();

  document.getElementById('next-innings-btn').style.display = 'none';
  document.getElementById('end-match-btn').style.display = 'none';

  const allDone = state.matches.every(m => m.completed);
  if (allDone) {
    setTimeout(showSummary, 800);
  } else {
    document.getElementById('current-innings').style.display = 'none';
  }
}

function showSummary() {
  const container = document.getElementById('summary-content');
  container.innerHTML = '<h3 style="text-align:center;margin-bottom:20px;">Tournament Results</h3>';

  state.matches.forEach((m, i) => {
    const div = document.createElement('div');
    div.className = 'summary-match';
    div.innerHTML = `
      <h4>Match ${i + 1}: ${state.teams[m.t1]} vs ${state.teams[m.t2]}</h4>
      ${m.innings.map(inn => {
        const overs = Math.floor(inn.balls / 6) + '.' + (inn.balls % 6);
        return `<div>${state.teams[inn.battingTeam]}: ${inn.runs}/${inn.wickets} (${overs} ov)</div>`;
      }).join('')}
      <div class="result">${m.result}</div>
    `;
    container.appendChild(div);
  });

  const points = {};
  state.teams.forEach(t => points[t] = 0);
  state.matches.forEach(m => {
    if (m.innings.length >= 2) {
      const inn1 = m.innings[0];
      const inn2 = m.innings[1];
      if (inn1.runs > inn2.runs) points[state.teams[m.t1]] += 2;
      else if (inn2.runs > inn1.runs) points[state.teams[m.t2]] += 2;
      else { points[state.teams[m.t1]] += 1; points[state.teams[m.t2]] += 1; }
    }
  });

  const sorted = Object.entries(points).sort((a, b) => b[1] - a[1]);
  const rankLabels = ['gold', 'silver', 'bronze'];
  const standingsDiv = document.getElementById('standings');
  standingsDiv.innerHTML = '<h3>Standings</h3>';
  sorted.forEach(([team, pts], i) => {
    const row = document.createElement('div');
    row.className = 'standing-row';
    row.innerHTML = `
      <span class="rank ${rankLabels[i] || ''}">${i + 1}</span>
      <span class="team-name">${team}</span>
      <span class="pts">${pts} pts</span>
    `;
    standingsDiv.appendChild(row);
  });

  showScreen('summary-screen');
}

function goHome() {
  stopTimer();
  state.currentMatch = null;
  state.innings = [];
  state.ballHistory = [];
  state.currentInnings = 0;
  showScreen('home-screen');
}

/* Timer */
function startTimer() {
  if (state.isRunning) return;
  state.isRunning = true;
  state.timerInterval = setInterval(() => {
    state.timerSeconds--;
    if (state.timerSeconds <= 0) {
      stopTimer();
      document.getElementById('timer-display').textContent = '00:00:00';
      return;
    }
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  state.isRunning = false;
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function updateTimerDisplay() {
  const h = Math.floor(state.timerSeconds / 3600);
  const m = Math.floor((state.timerSeconds % 3600) / 60);
  const s = state.timerSeconds % 60;
  const display = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const el = document.getElementById('timer-display');
  el.textContent = display;
  if (state.timerSeconds < 600) {
    el.classList.add('urgent');
  }
}

function resetMatch() {
  if (!confirm('Reset this match? All scores will be lost.')) return;
  stopTimer();
  const idx = state.currentMatch;
  state.matches[idx] = {
    t1: state.matches[idx].t1,
    t2: state.matches[idx].t2,
    completed: false,
    innings: [],
    result: ''
  };
  state.innings = [];
  state.currentInnings = 0;
  state.ballHistory = [];
  state.timerSeconds = 7200;
  updateTimerDisplay();
  document.getElementById('innings-summary').innerHTML = '';
  document.getElementById('ball-history').innerHTML = '';
  resetInnings();
}

/* Handle visibility change - pause timer when app is hidden */
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.isRunning) {
    stopTimer();
  }
});
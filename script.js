const screens = [...document.querySelectorAll('[data-screen]')];
const result = document.querySelector('[data-result]');
const quizScreen = document.querySelector('[data-screen="quiz"]');
const shareFeedback = document.querySelector('[data-share-feedback]');
let currentIndex = 0;
let selectedAnswer = null;
let score = 0;
let sessionQuestions = [];
let sessionMode = 'BASIC';
let displayedResult = null;

const SESSION_LENGTH = {
  BASIC: 10,
  INTERMEDIATE: 10,
  ADVANCED: 10,
  RANDOM: 15
};

function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

function showScreen(name) {
  screens.forEach((screen) => { screen.hidden = screen.dataset.screen !== name; });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showUnavailable() {
  const note = document.querySelector('[data-level-note]');
  note.hidden = false;
  window.clearTimeout(showUnavailable.timer);
  showUnavailable.timer = window.setTimeout(() => { note.hidden = true; }, 3200);
}

function renderDiamond(question) {
  document.querySelectorAll('[data-base]').forEach((base) => {
    base.classList.toggle('base--occupied', question.bases.includes(base.dataset.base));
  });
  document.querySelectorAll('[data-runner]').forEach((runner) => {
    runner.hidden = runner.dataset.runner !== question.runner;
  });
  renderTrajectory(question);
}

function renderTrajectory(question) {
  const title = question.title.replace(/<br\s*\/?/gi, ' ');
  const targets = {
    pitcher: [72, 72],
    '1루수': [124, 118],
    '2루수': [108, 18],
    '3루수': [20, 120],
    유격수: [20, 48],
    // 홈을 기준으로 좌익수 15도, 중견수 45도, 우익수 75도 방향이 되도록 배치합니다.
    // 다이아몬드가 45도 회전하므로 좌우 외야 좌표는 대칭으로 벌어집니다.
    좌익수: [-59, 90],
    중견수: [-4, -4],
    우익수: [90, -59],
    '1루 파울라인': [140, 30],
    '3루 파울라인': [4, 140]
  };
  let targetName = Object.keys(targets).find((name) => title.includes(name));
  const target = targets[targetName || 'pitcher'];
  const start = [144, 144];
  const isHighFly = title.includes('높은 뜬공') || title.includes('내야 뜬공');
  const isShallowFly = title.includes('얕은 뜬공');
  const isFly = title.includes('뜬공');
  const isLiner = title.includes('라이너성') || title.includes('직선');
  const type = isHighFly ? 'high-fly' : isShallowFly ? 'shallow-fly' : isLiner ? 'liner' : isFly ? 'fly' : 'ground';
  const [x, y] = target;
  const line = document.querySelector('[data-trajectory-line]');
  const targetDot = document.querySelector('[data-trajectory-target]');
  let path = `M ${start[0]} ${start[1]} L ${x} ${y}`;
  if (type === 'high-fly') path = `M ${start[0]} ${start[1]} Q ${(start[0] + x) / 2} ${(start[1] + y) / 2 - 32} ${x} ${y}`;
  if (type === 'shallow-fly') path = `M ${start[0]} ${start[1]} Q ${(start[0] + x) / 2} ${(start[1] + y) / 2 - 14} ${x} ${y}`;
  line.setAttribute('d', path);
  line.setAttribute('class', `trajectory-line trajectory-line--${type}`);
  targetDot.setAttribute('cx', x);
  targetDot.setAttribute('cy', y);
  targetDot.setAttribute('class', `trajectory-target trajectory-target--${type}`);
}

function renderQuestion() {
  const question = sessionQuestions[currentIndex];
  selectedAnswer = null;
  quizScreen.classList.remove('quiz--answered');
  document.querySelector('[data-quiz-level]').textContent = sessionMode;
  document.querySelector('[data-progress]').textContent = `${String(currentIndex + 1).padStart(2, '0')} / ${String(sessionQuestions.length).padStart(2, '0')}`;
  document.querySelector('[data-status]').textContent = question.status;
  document.querySelector('[data-status-light]').className = `status-light status-light--${question.status.toLowerCase()}`;
  document.querySelector('[data-outs]').textContent = `${question.outs} OUT`;
  document.querySelector('[data-situation]').textContent = question.situation;
  document.querySelector('[data-question-title]').innerHTML = question.title;
  document.querySelectorAll('.answer-button').forEach((button, index) => {
    const option = question.options[index];
    button.hidden = !option;
    if (!option) return;
    button.dataset.answer = option.id;
    button.querySelector('span').textContent = option.id;
    button.querySelector('b').textContent = option.text;
    button.disabled = false;
    button.classList.remove('answer-button--correct', 'answer-button--wrong');
  });
  renderDiamond(question);
  result.hidden = true;
  result.innerHTML = '';
}

function resetQuiz(mode = sessionMode) {
  sessionMode = mode;
  displayedResult = null;
  const pool = mode === 'RANDOM' ? questions : questions.filter((question) => question.level === mode);
  const questionCount = Math.min(SESSION_LENGTH[mode], pool.length);
  sessionQuestions = shuffle(pool).slice(0, questionCount);
  currentIndex = 0;
  score = 0;
  renderQuestion();
}

function renderResult(answer) {
  const question = sessionQuestions[currentIndex];
  selectedAnswer = answer;
  quizScreen.classList.add('quiz--answered');
  const isCorrect = answer === question.correctAnswer;
  if (isCorrect) score += 1;
  document.querySelectorAll('.answer-button').forEach((button) => {
    if (button.hidden) return;
    button.disabled = true;
    if (button.dataset.answer === answer) button.classList.add(isCorrect ? 'answer-button--correct' : 'answer-button--wrong');
    if (button.dataset.answer === question.correctAnswer) button.classList.add('answer-button--correct');
  });
  const isLastQuestion = currentIndex === sessionQuestions.length - 1;
  result.hidden = false;
  const tipMarkup = question.tip ? `<div class="tip"><strong>TIP</strong><p>${question.tip}</p></div>` : '';
  result.innerHTML = `<div class="result-heading"><span class="result-icon">${isCorrect ? '✓' : '!'}</span><div><p class="result-state">${isCorrect ? '정답입니다' : '오답입니다'}</p>${isCorrect ? '' : `<p class="result-sub">선택한 답: ${answer} · 정답: ${question.correctAnswer}</p>`}</div></div><div class="result-status"><span class="status-light status-light--${question.status.toLowerCase()}"></span><strong>${question.status}</strong><span>${question.statusLabel}</span></div><div class="explanation"><strong>해설</strong><p>${question.explanation}</p></div>${tipMarkup}<button class="result-complete-button" type="button" data-action="${isLastQuestion ? 'complete' : 'next'}">${isLastQuestion ? '최종 결과 보기' : '다음 문제'} <span aria-hidden="true">→</span></button>`;
}

function showCompletion(sharedResult = null) {
  const total = sharedResult?.total ?? sessionQuestions.length;
  const resultScore = sharedResult?.score ?? score;
  const resultMode = sharedResult?.level ?? sessionMode;
  const normalizedScore = getNormalizedScore(resultScore, total);
  const rate = normalizedScore;
  displayedResult = { level: resultMode, score: resultScore, total };
  document.querySelector('[data-complete-level]').textContent = resultMode;
  document.querySelector('[data-score]').textContent = normalizedScore;
  document.querySelector('[data-total]').textContent = '/ 100';
  document.querySelector('[data-rate]').textContent = `${rate}%`;
  document.querySelector('[data-score-comment]').textContent = getScoreComment(rate);
  document.querySelector('[data-complete-progress]').textContent = `${total} / ${total}`;
  shareFeedback.hidden = true;
  showScreen('complete');
}

function getNormalizedScore(scoreValue, total) {
  return Math.round((scoreValue / total) * 100);
}

function getScoreComment(rate) {
  if (rate <= 30) return '출루하는 순간 팀의 재앙이니,\n다음 경기부터는 안타 칠 생각 말고\n얌전히 덕아웃 물 당번이나 서세요.';
  if (rate <= 50) return '열정은 넘치지만 아웃카운트 착각이 잦아\n감독 뒷목 잡게 만드는\n전형적인 본능형 주자입니다.';
  if (rate <= 70) return '기본적인 흐름은 잘 읽고 계시니,\n복잡한 런다운과 특수 룰만 조금 더 다듬으면\n믿고 쓰는 주자가 됩니다.';
  if (rate <= 99) return '기본 센스와 판단력은 훌륭하나,\n결정적인 순간의 한 끗 차이 본헤드 플레이만\n조심하면 되겠습니다.';
  return 'KBO 프로 코치 뺨치는 완벽한 주루 IQ의 소유자이며,\n사회인 야구 생태계를 파괴할\n최고의 야구 지능입니다.';
}

function getResultUrl(resultData) {
  const url = new URL(window.location.href);
  const levelCode = { BASIC: 'B', INTERMEDIATE: 'I', ADVANCED: 'A', RANDOM: 'R' }[resultData.level];
  url.search = '';
  url.hash = '';
  url.searchParams.set('r', levelCode);
  url.searchParams.set('s', resultData.score);
  return url.toString();
}

function getShareSummary() {
  const resultData = displayedResult ?? { level: sessionMode, score, total: sessionQuestions.length };
  const normalizedScore = getNormalizedScore(resultData.score, resultData.total);
  return `[사회인 야구 주루 IQ 테스트]\n나의 주루 센스 점수는 **${normalizedScore}점**!\n당신의 주루 IQ는 몇 점?\n👉 ${getResultUrl(resultData)}`;
}

function showShareFeedback(message) {
  shareFeedback.textContent = message;
  shareFeedback.hidden = false;
  window.clearTimeout(showShareFeedback.timer);
  showShareFeedback.timer = window.setTimeout(() => { shareFeedback.hidden = true; }, 2600);
}

async function copyShareSummary(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand('copy');
  textArea.remove();
  if (!copied) throw new Error('Copy failed');
}

async function shareResult() {
  const summary = getShareSummary();
  try {
    if (navigator.share) {
      try {
        await navigator.share({
          text: summary
        });
        showShareFeedback('공유 창을 열었습니다.');
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    await copyShareSummary(summary);
    showShareFeedback('결과를 클립보드에 복사했습니다.');
  } catch (error) {
    if (error.name !== 'AbortError') showShareFeedback('결과를 공유하지 못했습니다.');
  }
}

function showSharedResultFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const allowedLevels = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'RANDOM'];
  const shortLevels = { B: 'BASIC', I: 'INTERMEDIATE', A: 'ADVANCED', R: 'RANDOM' };
  const isLegacyResult = params.get('result') === '1';
  const level = isLegacyResult ? params.get('level')?.toUpperCase() : shortLevels[params.get('r')?.toUpperCase()];
  const scoreValue = Number(isLegacyResult ? params.get('score') : params.get('s'));
  const total = isLegacyResult ? Number(params.get('total')) : SESSION_LENGTH[level];
  if (!isLegacyResult && !params.get('r')) return;
  if (!allowedLevels.includes(level) || !Number.isInteger(scoreValue) || !Number.isInteger(total) || total < 1 || total > 60 || scoreValue < 0 || scoreValue > total) return;
  showCompletion({ level, score: scoreValue, total });
}

document.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'start') showScreen('difficulty');
  if (action === 'back-to-start') showScreen('start');
  if (action === 'back-to-difficulty') showScreen('difficulty');
  if (action === 'complete') showCompletion();
  if (action === 'share') shareResult();
  if (action === 'next') { currentIndex += 1; renderQuestion(); }
  if (action === 'retry') { resetQuiz(sessionMode); showScreen('quiz'); }
  if (action === 'choose-level') showScreen('difficulty');
  const level = event.target.closest('[data-level]')?.dataset.level;
  if (['BASIC', 'INTERMEDIATE', 'ADVANCED', 'RANDOM'].includes(level?.toUpperCase())) { resetQuiz(level.toUpperCase()); showScreen('quiz'); }
  else if (level) showUnavailable();
  const answer = event.target.closest('[data-answer]')?.dataset.answer;
  if (answer && !event.target.closest('[data-answer]').disabled) renderResult(answer);
});

resetQuiz();
showSharedResultFromUrl();

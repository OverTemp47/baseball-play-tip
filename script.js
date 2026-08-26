const screens = [...document.querySelectorAll('[data-screen]')];
const result = document.querySelector('[data-result]');
const quizScreen = document.querySelector('[data-screen="quiz"]');
const shareFeedback = document.querySelector('[data-share-feedback]');
let currentIndex = 0;
let selectedAnswer = null;
let score = 0;
let sessionQuestions = [];
let sessionMode = 'BASIC';

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

function showCompletion() {
  const total = sessionQuestions.length;
  document.querySelector('[data-complete-level]').textContent = sessionMode;
  document.querySelector('[data-score]').textContent = score;
  document.querySelector('[data-total]').textContent = `/ ${total}`;
  document.querySelector('[data-rate]').textContent = `${Math.round((score / total) * 100)}%`;
  document.querySelector('[data-complete-progress]').textContent = `${total} / ${total}`;
  shareFeedback.hidden = true;
  showScreen('complete');
}

function getShareSummary() {
  const total = sessionQuestions.length;
  const rate = Math.round((score / total) * 100);
  return `상황별 주루 플레이\n${sessionMode} ${total}문제 중 ${score}문제 정답\n정답률 ${rate}%\n${window.location.href}`;
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
      await navigator.share({
        title: '상황별 주루 플레이 결과',
        text: summary.replace(`\n${window.location.href}`, ''),
        url: window.location.href
      });
      showShareFeedback('공유 창을 열었습니다.');
      return;
    }
    await copyShareSummary(summary);
    showShareFeedback('결과를 클립보드에 복사했습니다.');
  } catch (error) {
    if (error.name !== 'AbortError') showShareFeedback('결과를 공유하지 못했습니다.');
  }
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

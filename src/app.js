import { element, button } from './dom.js';
import { MemoryGame } from './game.js';
import { createModal } from './modal.js';
import { readResults, saveResult, formatDate } from './storage.js';

let storage;
try { storage = window.localStorage; } catch { /* Private settings may block storage. */ }
let results = readResults(storage);
let saveFailed = false;
const cardNodes = new Map();
const shell = element('div', 'shell');
const header = element('header', 'header');
const brand = element('div', 'brand');
const brandMark = element('span', 'brand-mark', '✳');
brandMark.setAttribute('aria-hidden', 'true');
brand.append(brandMark, element('span', '', 'тихий сад'));
const nav = element('nav', 'header-actions');
nav.setAttribute('aria-label', 'Управление игрой');
const restart = button('↻  Новая игра', 'button button-primary', startGame);
const leaderboard = button('Таблица лидеров', 'button button-secondary', showLeaderboard);
nav.append(restart, leaderboard);
header.append(brand, nav);

const main = element('main', 'main');
const intro = element('section', 'intro');
intro.append(element('p', 'eyebrow', 'MEMORY GAME / 01'), element('h1', '', 'Маленькая пауза.\nБольшая польза.'),
  element('p', 'intro-copy', 'Откройте карточки, запомните детали\nи найдите друг друга в этом маленьком саду.'));
const instructions = element('div', 'instructions');
instructions.append(element('span', 'instruction-number', '01 — 02'), element('p', '', 'Две карточки. Один ход.\nВосемь пар — и сад собран.'));
const note = element('p', 'intro-note', 'Не спешите. Здесь важна внимательность.');
intro.append(instructions, note);

const play = element('section', 'play');
play.setAttribute('aria-label', 'Игровое поле');
const stats = element('div', 'stats');
const movesBlock = element('div', 'stat');
const pairsBlock = element('div', 'stat');
const movesValue = element('strong', 'stat-value', '0');
const pairsValue = element('strong', 'stat-value', '0 / 8');
movesBlock.append(element('span', 'stat-label', 'ХОДЫ'), movesValue);
pairsBlock.append(element('span', 'stat-label', 'НАЙДЕНО ПАР'), pairsValue);
const progress = element('div', 'progress');
progress.setAttribute('aria-hidden', 'true');
for (let i = 0; i < 8; i += 1) progress.append(element('span', 'progress-dot'));
stats.append(movesBlock, pairsBlock, progress);
const board = element('div', 'board');
const status = element('p', 'game-status', '');
status.setAttribute('role', 'status');
status.setAttribute('aria-live', 'polite');
play.append(stats, board, status);
main.append(intro, play);
const footer = element('footer', 'footer');
footer.append(element('span', '', 'НЕМНОГО ТИШИНЫ, НЕМНОГО ИГРЫ'), element('span', '', '8 пар · 16 карточек · ваш ритм'));
shell.append(header, main, footer);
document.body.append(shell);
const modal = createModal();

const game = new MemoryGame({ onChange: render, onWin: win });

function startGame() {
  modal.close();
  cardNodes.clear();
  board.replaceChildren();
  game.start();
}

function makeCard(card, index) {
  const node = button('', 'card', () => game.select(card.key));
  const inner = element('span', 'card-inner');
  const back = element('span', 'card-side card-back');
  const backMark = element('span', 'card-mark', '✳');
  back.append(backMark);
  const front = element('span', 'card-side card-front');
  const img = element('img', 'card-image');
  img.src = `./assets/${card.id}.svg`;
  img.alt = '';
  img.draggable = false;
  front.append(img, element('span', 'card-name', card.name));
  inner.setAttribute('aria-hidden', 'true');
  front.setAttribute('aria-hidden', 'true');
  inner.append(back, front);
  node.append(inner);
  node.dataset.position = index + 1;
  cardNodes.set(card.key, node);
  board.append(node);
  return node;
}

function render(state) {
  state.cards.forEach((card, index) => {
    const node = cardNodes.get(card.key) || makeCard(card, index);
    node.classList.toggle('is-open', card.open);
    node.classList.toggle('is-matched', card.matched);
    node.setAttribute('aria-label', card.open
      ? `${card.name}${card.matched ? ', пара найдена' : ', открыта'}`
      : `Карточка ${index + 1}, открыть`);
    node.setAttribute('aria-disabled', String(card.open || state.locked || state.finished));
  });
  movesValue.textContent = state.moves;
  pairsValue.textContent = `${state.pairs} / 8`;
  [...progress.children].forEach((dot, index) => dot.classList.toggle('filled', index < state.pairs));
  if (state.finished) status.textContent = `Сад собран! Ходов: ${state.moves}.`;
  else if (state.locked) status.textContent = 'Не пара. Запомните — и попробуйте снова.';
  else if (state.first) status.textContent = 'Теперь откройте вторую карточку.';
  else status.textContent = state.pairs ? `Найдено пар: ${state.pairs} из 8. Продолжайте!` : 'Начните с любой карточки';
}

function win(moves) {
  const saved = saveResult(storage, results, moves);
  results = saved.results;
  saveFailed = !saved.saved;
  const content = element('div', 'win-content');
  content.append(element('div', 'win-flower', '✳'), element('p', '', 'Все восемь пар нашли друг друга.'),
    element('p', 'win-score', `${moves} ходов`), element('p', 'muted', 'Ещё одна маленькая победа вашей памяти.'));
  if (saveFailed) content.append(element('p', 'storage-note', 'Браузер не разрешил сохранить результат. Он доступен до перезагрузки страницы.'));
  modal.open({ eyebrow: 'ПРЕКРАСНАЯ РАБОТА', title: 'Ваш сад собран!', content,
    action: { text: 'Новая игра', handler: startGame } });
}

function showLeaderboard() {
  const content = element('div', 'leaderboard-content');
  if (!results.length) {
    content.append(element('div', 'empty-mark', '✳'), element('p', 'empty-title', 'Пока нет результатов'),
      element('p', 'muted', 'Соберите все пары — и здесь появится ваша первая игра.'));
  } else {
    const table = element('table', 'results');
    const head = element('thead');
    const headerRow = element('tr');
    ['Место', 'Ходы', 'Дата'].forEach((label) => {
      const cell = element('th', '', label);
      cell.scope = 'col';
      headerRow.append(cell);
    });
    head.append(headerRow);
    const body = element('tbody');
    results.forEach((result, index) => {
      const row = element('tr');
      row.append(element('td', 'rank', String(index + 1).padStart(2, '0')),
        element('td', '', result.moves), element('td', '', formatDate(result.timestamp)));
      body.append(row);
    });
    table.append(head, body);
    content.append(table);
  }
  if (saveFailed) content.append(element('p', 'storage-note', 'Результаты доступны только до перезагрузки: хранилище браузера недоступно.'));
  modal.open({ eyebrow: 'ЛУЧШИЕ 10 ИГР', title: 'Таблица лидеров', content });
}

startGame();

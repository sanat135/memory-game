import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryGame, createDeck, PLANTS } from '../src/game.js';
import { rankResults, readResults, saveResult, formatDate, STORAGE_KEY } from '../src/storage.js';

function setup() {
  const callbacks = [];
  const cancelled = [];
  const wins = [];
  const game = new MemoryGame({
    schedule(callback, delay) { assert.equal(delay, 1000); callbacks.push(callback); return callbacks.length; },
    cancel(id) { cancelled.push(id); },
    onWin(moves) { wins.push(moves); },
  });
  game.start();
  return { game, callbacks, cancelled, wins };
}

test('a new deck contains eight pairs, with unique keys and closed cards', () => {
  const cards = createDeck(() => 0.25);
  assert.equal(cards.length, 16);
  assert.equal(new Set(cards.map((card) => card.key)).size, 16);
  for (const plant of PLANTS) assert.equal(cards.filter((card) => card.id === plant.id).length, 2);
  assert.ok(cards.every((card) => !card.open && !card.matched));
});

test('repeated clicks do not count as moves, matched cards stay open', () => {
  const { game } = setup();
  game.select('lemon-0');
  game.select('lemon-0');
  assert.equal(game.moves, 0);
  game.select('lemon-1');
  assert.equal(game.moves, 1);
  assert.equal(game.pairs, 1);
  game.select('lemon-1');
  assert.equal(game.moves, 1);
  assert.ok(game.cards.filter((card) => card.id === 'lemon').every((card) => card.open && card.matched));
});

test('a mismatch blocks other choices until the delay ends', () => {
  const { game, callbacks } = setup();
  game.select('lemon-0');
  game.select('cherry-0');
  game.select('pear-0');
  assert.equal(game.moves, 1);
  assert.equal(game.cards.filter((card) => card.open).length, 2);
  callbacks[0]();
  assert.equal(game.cards.filter((card) => card.open).length, 0);
  game.select('pear-0');
  assert.ok(game.first);
});

test('restart cancels pending work and stale callbacks cannot alter the new board', () => {
  const { game, callbacks, cancelled } = setup();
  game.select('lemon-0');
  game.select('cherry-0');
  game.start();
  assert.deepEqual(cancelled, [1]);
  assert.equal(game.moves, 0);
  assert.equal(game.pairs, 0);
  game.select('pear-0');
  game.select('tomato-0');
  callbacks[0]();
  assert.equal(game.locked, true);
  assert.equal(game.cards.filter((card) => card.open).length, 2);
});

test('victory is emitted once and a finished game ignores card clicks', () => {
  const { game, wins } = setup();
  for (const plant of PLANTS) {
    game.select(`${plant.id}-0`);
    game.select(`${plant.id}-1`);
  }
  game.select('lemon-0');
  assert.deepEqual(wins, [8]);
  assert.equal(game.finished, true);
  game.start();
  assert.equal(game.finished, false);
});

test('ranking keeps ten best results and breaks ties by earlier game', () => {
  const records = Array.from({ length: 12 }, (_, index) => ({ moves: 20 - index, timestamp: index }));
  records.push({ moves: 9, timestamp: 0 });
  const ranked = rankResults(records);
  assert.equal(ranked.length, 10);
  assert.deepEqual(ranked.slice(0, 2), [{ moves: 9, timestamp: 0 }, { moves: 9, timestamp: 11 }]);
});

test('storage round trip, corrupt data and inaccessible storage', () => {
  const data = new Map();
  const storage = { getItem: (key) => data.get(key), setItem: (key, value) => data.set(key, value) };
  assert.equal(saveResult(storage, [], 10, 100).saved, true);
  assert.deepEqual(readResults(storage), [{ moves: 10, timestamp: 100 }]);
  storage.setItem(STORAGE_KEY, 'broken');
  assert.deepEqual(readResults(storage), []);
  assert.deepEqual(rankResults([null, {}, { moves: -1, timestamp: 10 }]), []);
  assert.equal(saveResult(undefined, [], 8).saved, false);
  assert.equal(formatDate(new Date(2026, 0, 2).getTime()), '02.01.2026');
});

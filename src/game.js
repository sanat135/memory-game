export const PLANTS = [
  { id: 'lemon', name: 'Лимон' },
  { id: 'cherry', name: 'Вишня' },
  { id: 'pear', name: 'Груша' },
  { id: 'strawberry', name: 'Клубника' },
  { id: 'tomato', name: 'Томат' },
  { id: 'carrot', name: 'Морковь' },
  { id: 'eggplant', name: 'Баклажан' },
  { id: 'broccoli', name: 'Брокколи' },
];

export function createDeck(random = Math.random) {
  const deck = PLANTS.flatMap((plant) => [0, 1].map((copy) => ({
    ...plant, key: `${plant.id}-${copy}`, open: false, matched: false,
  })));
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export class MemoryGame {
  constructor({ onChange = () => {}, onWin = () => {},
    schedule = (callback, delay) => setTimeout(callback, delay),
    cancel = (id) => clearTimeout(id) } = {}) {
    this.onChange = onChange;
    this.onWin = onWin;
    this.schedule = schedule;
    this.cancel = cancel;
    this.timer = null;
    this.version = 0;
  }

  start() {
    if (this.timer !== null) this.cancel(this.timer);
    this.timer = null;
    this.version += 1;
    this.cards = createDeck();
    this.moves = 0;
    this.pairs = 0;
    this.first = null;
    this.locked = false;
    this.finished = false;
    this.onChange(this);
  }

  select(key) {
    const card = this.cards.find((item) => item.key === key);
    if (!card || this.locked || this.finished || card.open || card.matched) return;
    card.open = true;
    if (!this.first) {
      this.first = card;
      this.onChange(this);
      return;
    }
    const first = this.first;
    this.first = null;
    this.moves += 1;
    if (first.id === card.id) {
      first.matched = true;
      card.matched = true;
      this.pairs += 1;
      this.finished = this.pairs === PLANTS.length;
      this.onChange(this);
      if (this.finished) this.onWin(this.moves);
      return;
    }
    this.locked = true;
    const version = this.version;
    this.timer = this.schedule(() => {
      // A callback from an old board must never affect a new game.
      if (version !== this.version) return;
      first.open = false;
      card.open = false;
      this.locked = false;
      this.timer = null;
      this.onChange(this);
    }, 1000);
    this.onChange(this);
  }
}

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RiversideGame = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const RECIPES = [
    { id: 'rice', name: '青溪嫩笋饭', flavor: '一口春笋，一口清香', cost: 6, price: 14, time: 5, level: 1, unlock: 0, color: '#c0cda2', category: '溪畔家常' },
    { id: 'soup', name: '云朵豆腐羹', flavor: '软软白云，暖暖一碗', cost: 9, price: 19, time: 7, level: 1, unlock: 0, color: '#edd49d', category: '暖心汤羹' },
    { id: 'pumpkin', name: '桂雨南瓜盏', flavor: '桂花落在甜甜的秋色里', cost: 12, price: 27, time: 9, level: 2, unlock: 40, color: '#e5bd84', category: '花香小食' },
    { id: 'lotus', name: '荷风藕香饼', flavor: '外酥里糯，带一点荷香', cost: 15, price: 34, time: 11, level: 3, unlock: 70, color: '#d4bbca', category: '溪桥招牌' },
    { id: 'mushroom', name: '山岚菌菇煲', flavor: '把山林的鲜味慢慢煨好', cost: 21, price: 48, time: 14, level: 4, unlock: 110, color: '#bbc8b1', category: '山野风味' }
  ];
  const NEIGHBORS = [
    { name: '小栗', kind: 'squirrel', detail: '刚从栗子林回来', color: '#c58358' },
    { name: '棉棉', kind: 'rabbit', detail: '来找一碗暖暖的饭', color: '#dac2b3' },
    { name: '墨点', kind: 'cat', detail: '溪桥书屋的小店主', color: '#657a78' },
    { name: '松果', kind: 'bear', detail: '散步路过的小邻居', color: '#b9986a' },
    { name: '芽芽', kind: 'fox', detail: '带着春天的好心情', color: '#d8a071' },
    { name: '圆圆', kind: 'panda', detail: '听说这里有新菜', color: '#768a80' }
  ];
  const LEVELS = [0, 30, 85, 165, 280];
  const LEVEL_NAMES = ['溪边新店', '邻里常来', '溪桥好味', '人气小馆', '一镇烟火'];
  const DAY_SECONDS = 180;
  function freshState() {
    return { version: 1, coins: 120, xp: 0, reputation: 80, day: 1, elapsed: 0, open: true, paused: false, speed: 1,
      unlocked: ['rice', 'soup'], stock: { rice: 0, soup: 0, pumpkin: 0, lotus: 0, mushroom: 0 },
      stoves: [null, null], tables: [null, null, null, null], queue: [], nextArrival: 13, nextId: 1,
      seed: 8127, stats: { served: 0, lost: 0, revenue: 0, cost: 0 }, totalServed: 0, goalClaimed: false, reliefClaimed: false,
      tutorial: 0, events: [] };
  }
  class Game {
    constructor(saved) {
      this.s = freshState();
      if (saved && saved.version === 1 && Array.isArray(saved.tables) && saved.tables.length === 4 &&
          Array.isArray(saved.stoves) && saved.stoves.length === 2 && Array.isArray(saved.queue) &&
          Array.isArray(saved.unlocked) && saved.stock && saved.stats && Number.isFinite(saved.coins) && Number.isFinite(saved.xp)) {
        this.s = Object.assign(this.s, saved, { events: [], paused: false });
      } else this.arrive('rice', 0);
    }
    get level() { let n = 1; for (let i = 1; i < LEVELS.length; i++) if (this.s.xp >= LEVELS[i]) n = i + 1; return n; }
    get state() { return this.s; }
    recipe(id) { return RECIPES.find(r => r.id === id); }
    random() { this.s.seed = (this.s.seed * 1664525 + 1013904223) >>> 0; return this.s.seed / 4294967296; }
    event(text, type = 'info') { this.s.events.push({ text, type }); }
    consumeEvents() { return this.s.events.splice(0); }
    xp(amount) { const before = this.level; this.s.xp += amount; if (this.level > before) this.event(`口碑升级！Lv.${this.level} · ${LEVEL_NAMES[this.level - 1]}`, 'level'); }
    arrive(order, neighborIndex) {
      if (this.s.queue.length >= 3) return;
      const i = neighborIndex === undefined ? Math.floor(this.random() * NEIGHBORS.length) : neighborIndex;
      const id = order || this.s.unlocked[Math.floor(this.random() * this.s.unlocked.length)];
      this.s.queue.push({ id: this.s.nextId++, neighbor: i, order: id, phase: 'queue', patience: 70, maxPatience: 70, tip: 0, remaining: 0 });
    }
    cook(id) {
      if (this.s.paused) return { ok: false, reason: '先继续营业，再开火吧' };
      const r = this.recipe(id), slot = this.s.stoves.findIndex(s => !s);
      if (!r || !this.s.unlocked.includes(id)) return { ok: false, reason: '先学会这道菜吧' };
      if (slot < 0) return { ok: false, reason: '两口灶都在忙，等这一锅做好吧' };
      if (this.s.coins < r.cost) return { ok: false, reason: '食材费不够了，先收钱或到说明里领周转金' };
      if (this.s.stock[id] >= 12) return { ok: false, reason: '这道菜库存充足，先招待客人吧' };
      this.s.coins -= r.cost; this.s.stats.cost += r.cost;
      this.s.stoves[slot] = { recipe: id, remaining: r.time, total: r.time };
      this.s.tutorial = Math.max(this.s.tutorial, 1);
      this.event(`${r.name}开火啦 · 一锅 3 份`, 'cook');
      return { ok: true, slot };
    }
    seat(id) {
      if (this.s.paused) return { ok: false, reason: '先继续营业，再迎客吧' };
      const qi = this.s.queue.findIndex(c => c.id === id), ti = this.s.tables.findIndex(t => !t);
      if (qi < 0) return { ok: false, reason: '这位客人已经入座了' };
      if (ti < 0) return { ok: false, reason: '餐桌坐满了，收钱后就能迎接新客人' };
      const c = this.s.queue.splice(qi, 1)[0];
      c.phase = 'waiting'; c.patience = 60; c.maxPatience = 60; this.s.tables[ti] = c;
      this.s.tutorial = Math.max(this.s.tutorial, 2);
      this.event(`${NEIGHBORS[c.neighbor].name}入座了，想吃${this.recipe(c.order).name}`);
      return { ok: true, table: ti };
    }
    serve(ti) {
      if (this.s.paused) return { ok: false, reason: '先继续营业，再上菜吧' };
      const c = this.s.tables[ti];
      if (!c || c.phase !== 'waiting') return { ok: false, reason: '这张桌暂时不用上菜' };
      if (!this.s.stock[c.order]) return { ok: false, reason: `还没有${this.recipe(c.order).name}，先备一锅吧` };
      this.s.stock[c.order]--; c.phase = 'eating'; c.remaining = 6;
      c.tip = c.patience >= 45 ? 4 : c.patience >= 25 ? 2 : 0;
      this.s.tutorial = Math.max(this.s.tutorial, 3);
      this.event(`热腾腾的${this.recipe(c.order).name}，请慢用！`, 'serve');
      return { ok: true };
    }
    collect(ti) {
      if (this.s.paused) return { ok: false, reason: '先继续营业，再收钱吧' };
      const c = this.s.tables[ti];
      if (!c || c.phase !== 'paying') return { ok: false, reason: '客人还在享用美味' };
      const amount = this.recipe(c.order).price + c.tip;
      this.s.coins += amount; this.s.stats.revenue += amount; this.s.stats.served++; this.s.totalServed++;
      this.s.reputation = Math.min(100, this.s.reputation + 2); this.xp(10); this.s.tables[ti] = null;
      this.s.tutorial = Math.max(this.s.tutorial, 4);
      this.event(`收到 ${amount} 金币${c.tip ? `（含小费 ${c.tip}）` : ''} · 口碑 +10`, 'coin');
      return { ok: true, amount };
    }
    unlock(id) {
      const r = this.recipe(id);
      if (!r || this.s.unlocked.includes(id)) return { ok: false, reason: '这道菜已经学会啦' };
      if (this.level < r.level) return { ok: false, reason: `招待更多客人，升到 Lv.${r.level} 就能学习` };
      if (this.s.coins < r.unlock) return { ok: false, reason: `学习这道菜需要 ${r.unlock} 金币` };
      this.s.coins -= r.unlock; this.s.unlocked.push(id); this.s.tutorial = 5;
      this.event(`学会了${r.name}！邻居们又有新口福了`, 'level');
      return { ok: true };
    }
    claimGoal() {
      if (this.s.stats.served < 8 || this.s.goalClaimed) return { ok: false, reason: '先招待完 8 位客人吧' };
      this.s.goalClaimed = true; this.s.coins += 45; this.event('小馆心愿达成 · 获得 45 金币', 'coin'); return { ok: true };
    }
    relief() {
      if (this.s.reliefClaimed) return { ok: false, reason: '这笔周转金已经领过啦' };
      if (this.s.coins >= 21) return { ok: false, reason: '金库还很充足，周转金留到金币少于 21 时领取' };
      this.s.reliefClaimed = true; this.s.coins += 30; this.event('邻里借来 30 金币，重新升起炉火吧', 'coin'); return { ok: true };
    }
    newDay() {
      if (this.s.open) return { ok: false, reason: '今天还在营业中' };
      if (this.s.queue.length || this.s.tables.some(Boolean)) return { ok: false, reason: '先招待好今天最后几位客人吧' };
      this.s.day++; this.s.elapsed = 0; this.s.open = true; this.s.paused = false; this.s.nextArrival = 10;
      this.s.stats = { served: 0, lost: 0, revenue: 0, cost: 0 }; this.s.goalClaimed = false; this.s.reliefClaimed = false;
      this.arrive(); this.event(`第 ${this.s.day} 天，新的一锅烟火开张啦`, 'level'); return { ok: true };
    }
    tick(dt) {
      if (this.s.paused || !Number.isFinite(dt) || dt <= 0) return;
      dt = Math.min(dt, 2);
      for (let i = 0; i < 2; i++) {
        const stove = this.s.stoves[i];
        if (!stove) continue;
        stove.remaining -= dt;
        if (stove.remaining <= 0) {
          this.s.stock[stove.recipe] += 3; this.xp(2); this.event(`${this.recipe(stove.recipe).name}做好了！库存 +3`, 'ready'); this.s.stoves[i] = null;
        }
      }
      if (this.s.open) {
        this.s.elapsed += dt; this.s.nextArrival -= dt;
        if (this.s.elapsed >= DAY_SECONDS) { this.s.elapsed = DAY_SECONDS; this.s.open = false; this.event('夕阳到门前了。招待完这些客人，就开启新的一天吧'); }
        else if (this.s.nextArrival <= 0) { this.arrive(); this.s.nextArrival = 10 + this.random() * 5; }
      }
      this.s.queue = this.s.queue.filter(c => { c.patience -= dt; if (c.patience > 0) return true; this.lose(c); return false; });
      this.s.tables.forEach((c, i) => {
        if (!c) return;
        if (c.phase === 'waiting') { c.patience -= dt; if (c.patience <= 0) { this.lose(c); this.s.tables[i] = null; } }
        else if (c.phase === 'eating') { c.remaining -= dt; if (c.remaining <= 0) { c.phase = 'paying'; c.remaining = 0; this.event(`${NEIGHBORS[c.neighbor].name}吃好了，记得收钱哦`); } }
      });
    }
    lose(c) { this.s.stats.lost++; this.s.reputation = Math.max(0, this.s.reputation - 4); this.event(`${NEIGHBORS[c.neighbor].name}等太久离开了 · 好感 -4`, 'warning'); }
    serialize() { const state = Object.assign({}, this.s, { events: [] }); return JSON.stringify(state); }
  }
  return { Game, RECIPES, NEIGHBORS, LEVELS, LEVEL_NAMES, DAY_SECONDS };
});

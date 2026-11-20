(function () {
  'use strict';
  const { Game, RECIPES, NEIGHBORS, LEVELS, LEVEL_NAMES, DAY_SECONDS } = RiversideGame;
  const art = RiversideArt, $ = id => document.getElementById(id), SAVE_KEY = 'xipan-kitchen-v1';
  let saved;
  try { saved = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (_) { saved = null; }
  let game = new Game(saved), filter = 'all', sound = false, audio, saveAvailable = true;
  const cache = new Map(), tablePositions = [[34, 60.5], [74, 60.5], [34, 78.5], [74, 78.5]];
  function html(node, value) { if (cache.get(node) !== value) { node.innerHTML = value; cache.set(node, value); } }
  function text(id, value) { if ($(id).textContent !== String(value)) $(id).textContent = value; }
  function toast(message, type) {
    const node = document.createElement('div'); node.className = `toast ${type || ''}`; node.textContent = message;
    $('toastRegion').appendChild(node);
    while ($('toastRegion').children.length > 3) $('toastRegion').firstChild.remove();
    setTimeout(() => { node.classList.add('leaving'); setTimeout(() => node.remove(), 350); }, type === 'level' ? 4500 : 3100);
  }
  function tone(type) {
    if (!sound) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const notes = type === 'level' ? [392, 494, 587, 784] : type === 'coin' ? [659, 880] : type === 'ready' ? [523, 659] : [440];
      notes.forEach((frequency, i) => {
        const oscillator = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime + i * .1;
        oscillator.type = 'sine'; oscillator.frequency.value = frequency; oscillator.connect(gain); gain.connect(audio.destination);
        gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(.055, now + .015); gain.gain.exponentialRampToValueAtTime(.001, now + .25);
        oscillator.start(now); oscillator.stop(now + .28);
      });
    } catch (_) { /* Sound is optional; the game remains playable. */ }
  }
  function save() {
    try { localStorage.setItem(SAVE_KEY, game.serialize()); } catch (_) { saveAvailable = false; }
    text('saveStatus', saveAvailable ? '已自动存档 · 下次回来，继续这一锅烟火' : '当前浏览器未允许存档，本次仍可正常游玩');
  }
  function act(result) {
    if (result && !result.ok) toast(result.reason, 'warning');
    render(); flush(); save();
  }
  function flush() { game.consumeEvents().forEach(e => { toast(e.text, e.type); tone(e.type); }); }
  function renderHeader() {
    const s = game.state, level = game.level;
    text('coins', s.coins); html($('reputation'), `${s.reputation}<span> / 100</span>`);
    text('level', level); text('levelName', LEVEL_NAMES[level - 1]);
    const start = LEVELS[level - 1], end = LEVELS[level];
    $('xpBar').style.width = end ? `${Math.min(100, (s.xp - start) / (end - start) * 100)}%` : '100%';
    text('ranchCoins', s.coins.toLocaleString('zh-CN'));
    text('ranchLevel', `Lv.${level}`); text('ranchLevelName', LEVEL_NAMES[level - 1]);
    $('ranchXp').style.width = $('xpBar').style.width;
    text('ranchGoal', `${Math.min(s.stats.served, 8)} / 8`);
    text('xpLabel', end ? `${s.xp - start} / ${end - start} 口碑经验` : `${s.xp} 口碑经验 · 满级`);
    text('dayLabel', `第 ${s.day} 天 · 春日晴`);
    const minutes = 11 * 60 + Math.floor(s.elapsed / DAY_SECONDS * 180);
    text('clockLabel', `${s.open ? '午间营业' : '今日打烊'} · ${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`);
    text('shopStatus', s.paused ? '小馆歇一会儿' : s.open ? '小馆营业中' : '晚风来了 · 收尾中');
    $('liveDot').classList.toggle('closed', s.paused || !s.open);
    text('pauseBtn', s.paused ? '▷ 继续' : 'Ⅱ 暂停'); text('speedBtn', `${s.speed}×`);
    $('pauseOverlay').hidden = !s.paused;
    text('revenue', `◎ ${s.stats.revenue}`); text('cost', `◎ ${s.stats.cost}`); text('served', `${s.stats.served} / ${s.stats.lost}`);
    text('profit', `◎ ${s.stats.revenue - s.stats.cost}`);
    text('goalCount', `${Math.min(s.stats.served, 8)} / 8 位`); $('goalBar').style.width = `${Math.min(s.stats.served / 8 * 100, 100)}%`;
    $('goalReward').disabled = s.stats.served < 8 || s.goalClaimed; text('goalReward', s.goalClaimed ? '已领取 ✓' : s.stats.served >= 8 ? '领取 ◎ 45' : '奖励 ◎ 45');
    const next = RECIPES.find(r => !s.unlocked.includes(r.id));
    html($('nextRecipe'), next ? `${next.name} <span>· Lv.${next.level}</span>` : '所有风味都学会了！');
    $('newDayBtn').hidden = s.open;
    $('newDayBtn').disabled = s.queue.length > 0 || s.tables.some(Boolean);
    text('newDayBtn', !s.open && (s.queue.length || s.tables.some(Boolean)) ? '招待完最后几位客人' : '开启新的一天 →');
    $('reliefBtn').disabled = s.reliefClaimed || s.coins >= 21;
    text('reliefBtn', s.reliefClaimed ? '周转金已领取' : s.coins >= 21 ? '周转金 · 缺钱时可领' : '领取食材周转金 ◎ 30');
    $('guestBadge').hidden = !s.queue.length; text('guestBadge', s.queue.length);
    const stockCount = Object.values(s.stock).reduce((sum, count) => sum + count, 0);
    $('kitchenBadge').hidden = !stockCount; text('kitchenBadge', stockCount);
    $('goalBadge').hidden = s.stats.served < 8 || s.goalClaimed;
    const paying = s.tables.filter(c => c && c.phase === 'paying').length;
    $('navGuests').title = paying ? `${paying} 桌等你收钱，${s.queue.length} 位客人等候` : `${s.queue.length} 位客人等候`;
  }
  function renderKitchen() {
    const s = game.state, busy = s.stoves.filter(Boolean).length;
    text('kitchenStatus', `${busy ? `${busy} 口灶正在备菜` : '两口灶空闲'} · 每次备菜 3 份 · 按订单上菜`);
    $('chef').classList.toggle('working', busy > 0);
    s.stoves.forEach((stove, i) => html($(`stove${i}`), stove ? `<span class="stove-label">${Math.ceil(stove.remaining)}s · 备菜中</span><div class="steam"><i></i><i></i><i></i></div>` : ''));
    text('knownCount', s.unlocked.length);
    RECIPES.forEach(r => {
      const card = $(`recipe-${r.id}`), known = s.unlocked.includes(r.id), stove = s.stoves.find(v => v && v.recipe === r.id);
      card.hidden = filter === 'known' && !known;
      card.className = `recipe-card${known ? '' : ' locked'}`;
      let button;
      if (known) {
        const disabled = busy >= 2 || s.coins < r.cost || s.paused || s.stock[r.id] >= 12;
        button = stove ? `<button class="cook-button cooking" disabled><i style="width:${Math.round((1 - stove.remaining / stove.total) * 100)}%"></i><span>慢慢煮 · ${Math.ceil(stove.remaining)}s</span></button>` : `<button class="cook-button${s.tutorial === 0 && r.id === 'rice' ? ' hint-pulse' : ''}" data-cook="${r.id}" ${disabled ? 'disabled' : ''}><span>＋ 备菜 3 份 <span style="opacity:.65">· ◎ ${r.cost}</span></span></button>`;
      } else {
        button = `<button class="cook-button unlock-button" data-unlock="${r.id}" ${game.level < r.level || s.coins < r.unlock ? 'disabled' : ''}>${game.level >= r.level ? `学习新菜 · ◎ ${r.unlock}` : `Lv.${r.level} 可学习 · ◎ ${r.unlock}`}</button>`;
      }
      html(card, `<div class="food-visual" style="--food-bg:${r.color}55"><span class="food-tag">${r.category}</span>${art.food(r.id)}${known ? `<span class="stock-tag${!s.stock[r.id] ? ' empty' : ''}">余 ${s.stock[r.id]} 份</span>` : `<span class="lock-label">♧ Lv.${r.level}</span>`}</div><div class="recipe-info"><h3>${r.name}</h3><p class="recipe-flavor">${r.flavor}</p><div class="recipe-numbers"><span>售价 <strong>◎ ${r.price}</strong></span><span class="time">${r.time}s / 锅</span></div>${button}</div>`);
    });
  }
  function renderQueue() {
    const s = game.state, room = s.tables.filter(t => !t).length;
    text('queueCount', s.queue.length);
    text('seatNote', room ? `${room} 张空桌 · 左右滑动迎客` : '餐桌满了 · 收钱后再迎客');
    const content = s.queue.length ? s.queue.map(c => {
      const n = NEIGHBORS[c.neighbor];
      return `<div class="queue-entry"><div class="queue-avatar">${art.animal(n.kind, n.color)}</div><div><div class="customer-name">${n.name}<span>想吃</span></div><p class="customer-order">${game.recipe(c.order).name}</p><div class="queue-patience"><i id="queuePatience${c.id}"></i></div></div><button class="seat-button" data-seat="${c.id}" ${!room || s.paused ? 'disabled' : ''}>入座</button></div>`;
    }).join('') : `<div class="queue-empty"><span>❧</span>${s.open ? '溪桥的邻居正在路上…' : '门前安静了，明天见。'}</div>`;
    html($('queueList'), content);
    s.queue.forEach(c => { const bar = $(`queuePatience${c.id}`); bar.style.width = `${Math.max(0, c.patience / c.maxPatience * 100)}%`; bar.classList.toggle('low', c.patience < 20); });
    const front = s.queue[0], n = front && NEIGHBORS[front.neighbor];
    html($('doorGuest'), n ? art.animal(n.kind, n.color) : '');
  }
  function renderTables() {
    game.state.tables.forEach((c, i) => {
      const node = $(`table${i}`);
      if (!c) { html(node, `<span class="empty-table">${i + 1} 号 · 空桌</span>`); node.setAttribute('aria-label', `${i + 1} 号空桌`); return; }
      const n = NEIGHBORS[c.neighbor], missing = !game.state.stock[c.order], recipe = game.recipe(c.order);
      const phase = c.phase === 'waiting' ? `<button class="table-action${missing ? ' missing' : ''}" data-table="${i}">${missing ? '先备菜' : '上菜'} ↗</button>` : c.phase === 'eating' ? `<button class="table-action dining" disabled>用餐中 · <span id="dine${i}"></span>s</button>` : `<button class="table-action money" data-table="${i}">◎ 收钱 ${recipe.price + c.tip}</button>`;
      html(node, `<span class="table-name">${n.name} · ${i + 1} 号桌</span><div class="guest-art">${art.animal(n.kind, n.color)}</div>${c.phase === 'waiting' ? `<div class="order-bubble" title="想吃${recipe.name}">${art.food(c.order)}</div><div class="patience-track"><i id="tablePatience${i}"></i></div>` : ''}${phase}`);
      node.setAttribute('aria-label', `${n.name}，${c.phase === 'waiting' ? '等待' + recipe.name : c.phase === 'eating' ? '正在用餐' : '等待付款'}`);
      if (c.phase === 'waiting') { const bar = $(`tablePatience${i}`); bar.style.width = `${Math.max(0, c.patience / c.maxPatience * 100)}%`; bar.classList.toggle('low', c.patience < 20); }
      if (c.phase === 'eating') text(`dine${i}`, Math.ceil(c.remaining));
    });
  }
  function guide() {
    const s = game.state, paying = s.tables.findIndex(c => c && c.phase === 'paying'), ready = s.tables.findIndex(c => c && c.phase === 'waiting' && s.stock[c.order]), waiting = s.tables.find(c => c && c.phase === 'waiting'), next = RECIPES.find(r => !s.unlocked.includes(r.id));
    let title, body, icon;
    if (paying >= 0) { icon = '04'; title = '客人吃好啦，把饭钱收起来'; body = '点击餐桌上金色的「收钱」，获得金币与口碑经验。'; }
    else if (ready >= 0) { icon = '03'; title = '热饭备好了，现在上菜吧'; body = `给${NEIGHBORS[s.tables[ready].neighbor].name}送上${game.recipe(s.tables[ready].order).name}，早上菜有小费。`; }
    else if (waiting) { icon = '01'; title = s.stoves.some(c => c && c.recipe === waiting.order) ? '锅里正香，稍等就能上菜' : `客人想吃${game.recipe(waiting.order).name}`; body = '切换「备菜」找到对应菜谱，做好后点击餐桌上菜。'; }
    else if (s.queue.length && s.tables.some(t => !t) && s.tutorial > 0) { icon = '02'; title = '邻居到门前了，迎进来坐坐'; body = '在「迎客」里点击客人的「入座」，餐桌一直在上方。'; }
    else if (s.tutorial === 0) { icon = '01'; title = '先把第一锅饭备好吧'; body = '点底部「备菜」开火，每锅 3 份，两口灶可以同时忙。'; }
    else if (!s.open && !s.tables.some(Boolean) && !s.queue.length) { icon = '☾'; title = '今日烟火收好，明天继续开张'; body = '切换「小账」开启次日，金币、菜谱和库存都会保留。'; }
    else if (next && game.level >= next.level) { icon = '05'; title = `新风味可以学啦：${next.name}`; body = `切换「备菜」，花费 ${next.unlock} 金币学习这道新菜。`; }
    else { icon = '❧'; title = next ? '认真招待，口碑慢慢长起来' : '溪桥镇的人气小馆，就是你啦'; body = next ? `收钱一次 +10 经验；升到 Lv.${next.level} 可以学习${next.name}。` : '所有菜谱都学会了，继续经营，完成每日心愿吧。'; }
    text('guideIcon', icon); text('guideTitle', title); text('guideText', body);
  }
  function render() { renderHeader(); renderKitchen(); renderQueue(); renderTables(); guide(); }
  function selectPanel(name, recipeId) {
    document.querySelector('.phone-game').dataset.panel = name;
    $('guestsPanel').hidden = name !== 'guests';
    $('menuSection').hidden = name !== 'kitchen';
    $('journalPanel').hidden = name !== 'journal';
    document.querySelectorAll('.nav-item').forEach(button => {
      const active = button.dataset.panel === name;
      button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
    });
    if (name === 'kitchen' && recipeId) {
      // Reveal a requested recipe even if the player was filtering learned dishes.
      filter = 'all'; $('allTab').classList.add('active'); $('readyTab').classList.remove('active');
      renderKitchen();
      const card = $(`recipe-${recipeId}`);
      $('recipeGrid').scrollTo({ left: card.offsetLeft - $('recipeGrid').offsetLeft, behavior: 'smooth' });
    }
  }
  function showScreen(name, panel) {
    // Save the same Game instance on both boundaries. The pasture view stops
    // the interval without changing the player's own paused flag or timers.
    save();
    document.querySelector('.phone-game').dataset.screen = name;
    $('ranchScreen').hidden = name !== 'ranch';
    $('restaurantScreen').hidden = name !== 'restaurant';
    $('toastRegion').replaceChildren();
    if (name === 'restaurant' && panel) selectPanel(panel);
    render();
    (name === 'ranch' ? $('enterRestaurant') : $('backToRanch')).focus({ preventScroll: true });
  }
  function ranchSheet(kind) {
    const stock = kind === 'stock', s = game.state;
    text('ranchDialogTitle', stock ? '小馆仓库' : '溪桥风味图鉴');
    text('ranchDialogIntro', stock ? '备好的热饭都在这里，进小馆后按订单上菜。' : '招待邻居积累口碑，在小馆厨房学习更多风味。');
    html($('ranchDialogContent'), RECIPES.map(r => `<div class="ranch-sheet-row">${art.food(r.id)}<div><strong>${r.name}</strong><small>${stock ? r.category : r.flavor}</small></div><span>${stock ? `${s.stock[r.id]} 份` : s.unlocked.includes(r.id) ? '已学会' : `Lv.${r.level} · ◎ ${r.unlock}`}</span></div>`).join(''));
    $('ranchDialog').showModal();
  }
  $('enterRestaurant').onclick = () => showScreen('restaurant', 'guests');
  $('backToRanch').onclick = () => showScreen('ranch');
  $('ranchShop').onclick = () => showScreen('restaurant', 'guests');
  $('ranchDaily').onclick = () => showScreen('restaurant', 'journal');
  $('ranchStock').onclick = () => ranchSheet('stock');
  $('ranchBook').onclick = () => ranchSheet('book');
  $('ranchDialogEnter').onclick = () => { $('ranchDialog').close(); showScreen('restaurant', 'kitchen'); };
  $('ranchAvatar').innerHTML = art.animal('otter', '#b99772', true);
  $('ranchStockArt').innerHTML = '<svg viewBox="0 0 100 90" aria-hidden="true"><defs><linearGradient id="basket" x2="0" y2="1"><stop stop-color="#d6b27c"/><stop offset="1" stop-color="#ad834e"/></linearGradient></defs><path d="M25 42Q23 2 51 7q27 2 25 36" fill="none" stroke="#a98650" stroke-width="6"/><path d="M12 46q39-21 76 0L81 76q-32 19-60-1z" fill="url(#basket)" stroke="#977547" stroke-width="1.5"/><g stroke="#e4c896" stroke-width="2" opacity=".8"><path d="M16 53q34 17 68 0M18 62q34 15 65 0M22 71q30 12 58 0M28 47l5 33m13-36v38m14-37l-2 36m16-35l-6 31"/></g><path d="M26 43l-5-24 12 5 8-9 3 30" fill="#92a15f"/><path d="M25 25l15 30-13 6-8-15" fill="#d5a167"/><path d="M57 33q-8-15-17-5-11 17 5 28 11 3 17-10 10-19-5-13" fill="#b58161"/><path d="M53 30l2-10m0 4q8-9 15-3-5 8-15 3" fill="none" stroke="#7d945c" stroke-width="3"/><ellipse cx="71" cy="43" rx="11" ry="14" fill="#d9c69c"/></svg>';
  $('ranchShopArt').innerHTML = art.navIcon('guests');
  $('ranchBookArt').innerHTML = art.navIcon('journal');
  $('recipeGrid').innerHTML = RECIPES.map(r => `<article class="recipe-card" id="recipe-${r.id}"></article>`).join('');
  $('tableLayer').innerHTML = tablePositions.map(([x, y], i) => `<div id="table${i}" class="table-spot" style="left:${x}%;top:${y}%"></div>`).join('');
  $('chef').innerHTML = art.animal('otter', '#b99772', true);
  $('soundBtn').innerHTML = art.speaker(false);
  $('navGuestsArt').innerHTML = art.navIcon('guests');
  $('navKitchenArt').innerHTML = art.navIcon('kitchen');
  $('navJournalArt').innerHTML = art.navIcon('journal');
  function tableAction(i) {
    const c = game.state.tables[i];
    if (!c) return;
    if (c.phase === 'paying') return act(game.collect(i));
    if (c.phase === 'waiting') {
      if (!game.state.stock[c.order]) {
        selectPanel('kitchen', c.order);
        const card = $(`recipe-${c.order}`); card.classList.add('hint-pulse'); setTimeout(() => card.classList.remove('hint-pulse'), 3000);
        if (!game.state.stoves.some(v => v && v.recipe === c.order)) act(game.cook(c.order));
        else toast(`${game.recipe(c.order).name}正在备菜，再等一小会儿`);
      } else act(game.serve(i));
    }
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button || button.disabled) return;
    if (button.dataset.panel) selectPanel(button.dataset.panel);
    else if (button.dataset.cook) act(game.cook(button.dataset.cook));
    else if (button.dataset.unlock) act(game.unlock(button.dataset.unlock));
    else if (button.dataset.seat) act(game.seat(Number(button.dataset.seat)));
    else if (button.dataset.table !== undefined) tableAction(Number(button.dataset.table));
    else if (button.dataset.close) $(button.dataset.close).close();
  });
  $('pauseBtn').onclick = () => { game.state.paused = !game.state.paused; render(); save(); };
  $('resumeBtn').onclick = () => { game.state.paused = false; render(); save(); };
  $('speedBtn').onclick = () => { game.state.speed = game.state.speed === 1 ? 2 : game.state.speed === 2 ? 3 : 1; render(); save(); };
  $('soundBtn').onclick = () => { sound = !sound; $('soundBtn').innerHTML = art.speaker(sound); $('soundBtn').title = sound ? '关闭音效' : '开启音效'; $('soundBtn').setAttribute('aria-label', $('soundBtn').title); tone('ready'); };
  $('helpBtn').onclick = () => $('helpDialog').showModal();
  $('goalReward').onclick = () => act(game.claimGoal());
  $('reliefBtn').onclick = () => act(game.relief());
  $('newDayBtn').onclick = () => act(game.newDay());
  $('resetBtn').onclick = () => { $('helpDialog').close(); $('resetDialog').showModal(); };
  $('confirmReset').onclick = () => { game = new Game(); cache.clear(); $('resetDialog').close(); act({ ok: true }); toast('小馆重新开张，欢迎回来'); };
  $('allTab').onclick = () => { filter = 'all'; $('allTab').classList.add('active'); $('readyTab').classList.remove('active'); renderKitchen(); };
  $('readyTab').onclick = () => { filter = 'known'; $('readyTab').classList.add('active'); $('allTab').classList.remove('active'); renderKitchen(); };
  $('guideAction').onclick = () => {
    const s = game.state, paying = s.tables.findIndex(c => c && c.phase === 'paying'), ready = s.tables.findIndex(c => c && c.phase === 'waiting' && s.stock[c.order]), waiting = s.tables.find(c => c && c.phase === 'waiting');
    if (paying >= 0) tableAction(paying);
    else if (ready >= 0) tableAction(ready);
    else if (waiting) selectPanel('kitchen', waiting.order);
    else if (!s.open && !s.tables.some(Boolean) && !s.queue.length) selectPanel('journal');
    else if (s.queue.length && s.tables.some(t => !t) && s.tutorial > 0) { selectPanel('guests'); act(game.seat(s.queue[0].id)); }
    else selectPanel('kitchen', 'rice');
  };
  document.querySelector('.brand').onclick = e => { e.preventDefault(); selectPanel('guests'); };
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  let saveCounter = 0;
  setInterval(() => {
    if (document.querySelector('.phone-game').dataset.screen === 'ranch' || document.hidden || $('helpDialog').open || $('resetDialog').open) return;
    game.tick(.25 * game.state.speed); render(); flush();
    if (++saveCounter % 8 === 0) save();
  }, 250);
  render(); save();
})();

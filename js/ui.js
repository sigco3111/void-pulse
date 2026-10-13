// ============ UI：HUD / 菜单 / 升级卡牌 ============
import { formatTime, formatNum, clamp } from './utils.js';
import { XP_CURVE, PLAYER, ROUTES, ROUTE_TIERS, ULT } from './config.js';
import { TacticalHud } from './tactical_hud.js';
import { saveSettings } from './settings.js';
import { PLANETS } from './planets.js';
import { UPGRADES } from './upgrades.js';

const $ = (id) => document.getElementById(id);
const escapeText = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class UI {
  constructor(game) {
    this.game = game;
    this.tactical = new TacticalHud(game);
    this.settingsOpen = false;
    this.buildOpen = false;
    this.menuOpen = false;
    this.el = {
      hud: $('hud'), hpFill: $('hp-fill'), hpNum: $('hp-num'),
      xpFill: $('xp-fill'), levelNum: $('level-num'),
      sector: $('sector-label'), bossBanner: $('boss-banner'),
      score: $('score'), timer: $('timer'), kills: $('kills'), best: $('best-score'),
      dashRing: $('dash-ring'), pulseBar: $('pulse-bar'), pulseFill: $('pulse-fill'),
      title: $('title-screen'), titleBest: $('title-best'), startBtn: $('start-btn'),
      levelup: $('levelup-screen'), cards: $('cards'),
      pause: $('pause-screen'), resumeBtn: $('resume-btn'), quitBtn: $('quit-btn'),
      gameover: $('gameover-screen'), goStats: $('go-stats'), goNewBest: $('go-new-best'),
      retryBtn: $('retry-btn'), menuBtn: $('menu-btn'),
      flash: $('flash'), lowhp: $('lowhp'), muteIcon: $('mute-icon'), fps: $('fps'),
      chain: $('chain'), chainNum: $('chain-num'), toast: $('toast'),
      routes: $('routes'), ultBar: $('ult-bar'), ultFill: $('ult-fill'),
      roster: $('roster'),
      mpBtn: $('mp-btn'), mpPanel: $('mp-panel'), mpName: $('mp-name'),
      mpCreateBtn: $('mp-create-btn'), mpJoinBtn: $('mp-join-btn'),
      mpRoom: $('mp-room'), mpPass: $('mp-pass'), mpStatus: $('mp-status'),
      lobby: $('lobby-screen'), lobbyRoom: $('lobby-room'), lobbyPass: $('lobby-pass'),
      lobbyPlayers: $('lobby-players'), lobbyStartBtn: $('lobby-start-btn'),
      lobbyWait: $('lobby-wait'), lobbyQuitBtn: $('lobby-quit-btn'), lobbyRoomInfo: $('lobby-room-info'),
      respawn: $('respawn-overlay'), respawnCount: $('respawn-count'),
    };
    // Boss 血条（动态创建，置于顶部中心）
    const bw = document.createElement('div');
    bw.id = 'bosshp-wrap';
    bw.className = 'hidden';
    bw.innerHTML = `<div id="bosshp-name"></div><div class="bar" style="width:min(420px,52vw);height:9px;margin:6px auto 0;border-color:rgba(255,34,102,.6)"><div id="bosshp-fill" style="background:linear-gradient(90deg,#ff2266,#ff7a9f);box-shadow:0 0 12px rgba(255,34,102,.8)"></div></div>`;
    $('hud-center').appendChild(bw);
    this.bossWrap = bw;
    this.bossFill = bw.querySelector('#bosshp-fill');
    this.bossName = bw.querySelector('#bosshp-name');
    this.bossName.style.cssText = 'font-size:11px;letter-spacing:4px;color:#ff7a9f;text-shadow:0 0 8px rgba(255,34,102,.8)';

    this._fpsAcc = 0; this._fpsN = 0; this._fpsT = 0;
    this._lastChain = 0;
    this._toastTimer = null;
    this._returnFocus = {};
    document.addEventListener('keydown', (event) => this.trapFocus(event), true);
    if (this.game.input.isTouch) {
      $('controls-grid').innerHTML = '<div><b>왼쪽 드래그</b><span>이동 · 초록 파편 근처에서 업그레이드</span></div><div><b>자동 조준</b><span>근처 적 자동 공격</span></div><div><b>대시</b><span>위험 통과, 짧은 무적</span></div><div><b>오버드라이브 / 소멸</b><span>가득 차면 눌러서 스킬 사용</span></div><div><b>빌드</b><span>장비와 진화 레시피 보기</span></div><div><b>메뉴</b><span>설정 또는 나가기 · 멀티는 계속 진행</span></div>';
      $('pulse-key').textContent = '오버드라이브';
      $('ult-label').querySelector('span').textContent = '소멸';
      $('levelup-sub').querySelector('.key-hint').textContent = '카드를 눌러 선택';
      $('build-btn').textContent = '빌드';
      $('build-close').textContent = '돌아가기';
      $('cards-build-btn').textContent = '빌드·레시피';
      $('combat-menu-btn').textContent = '메뉴';
    }
    for (const id of ['title-planets', 'lobby-planets']) {
      const picker = $(id);
      picker.innerHTML = `<div class="planet-heading">목적지 선택 <span class="planet-authority"></span></div><div class="planet-grid">${PLANETS.map((p) =>
        `<button type="button" class="planet-card planet-${p.id}" data-planet="${p.id}" style="--planet-color:${p.color}" aria-pressed="false"><span class="planet-orb" aria-hidden="true"></span><span class="planet-code">${p.code}</span><b>${p.name}</b><span class="planet-biome">${p.biome}</span></button>`
      ).join('')}</div><div class="planet-brief" aria-live="polite"></div>`;
      picker.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-planet]');
        if (button) this.game.selectPlanet(button.dataset.planet);
      });
    }
  }

  refreshPlanets() {
    const g = this.game, planet = g.planet;
    if (g.state === 'title') this.el.titleBest.textContent = g.best > 0 ? `최고 기록 ${formatNum(g.best)}` : '아직 기록 없음 - 첫 기록에 도전하세요';
    for (const id of ['title-planets', 'lobby-planets']) {
      const picker = $(id);
      const locked = !!g.mp && !g.mp.isHost;
      picker.querySelector('.planet-authority').textContent = locked ? '방장 따라가기' : '이번 판 종료 후 다시 선택 가능';
      for (const button of picker.querySelectorAll('[data-planet]')) {
        button.setAttribute('aria-pressed', String(button.dataset.planet === planet.id));
        button.disabled = locked;
      }
      picker.querySelector('.planet-brief').innerHTML = `<strong style="color:${planet.color}">${planet.perk}</strong><span>${planet.threat}</span><small>${planet.tactics}</small>`;
    }
    $('planet-label').textContent = `${planet.name} / 전장 목표`;
    $('planet-label').style.color = planet.color;
    $('planet-label').title = planet.perk;
  }

  toast(text, color = '#ffd23e') {
    const t = this.el.toast;
    t.textContent = text;
    t.style.color = color;
    t.style.borderColor = color;
    t.classList.remove('hidden');
    t.style.animation = 'none';
    void t.offsetWidth;             // 重启动画
    t.style.animation = '';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.add('hidden'), 2400);
  }

  bind(callbacks) {
    $('reroll-btn').addEventListener('click', () => this.game.rerollCards());
    $('settings-btn').addEventListener('click', () => this.openSettings());
    $('settings-close').addEventListener('click', () => this.closeSettings());
    $('build-btn').addEventListener('click', () => this.openBuild());
    $('cards-build-btn').addEventListener('click', () => this.openBuild());
    $('build-close').addEventListener('click', () => this.closeBuild());
    $('combat-menu-btn').addEventListener('click', () => this.openMenu());
    $('menu-build-btn').addEventListener('click', () => this.openBuild());
    $('menu-settings-btn').addEventListener('click', () => this.openSettings());
    $('continue-endless-btn').addEventListener('click', () => this.game.continueEndless());
    $('quality').addEventListener('change', () => {
      this.game.settings.quality = $('quality').value;
      saveSettings(this.game.settings);
      this.game.setQuality?.(this.game.settings.quality);
    });
    for (const [id, key] of [['music-volume', 'music'], ['sfx-volume', 'sfx'], ['auto-aim', 'autoAim'], ['reduced-motion', 'reducedMotion']]) {
      $(id).addEventListener('input', () => {
        this.game.settings[key] = $(id).type === 'range' ? Number($(id).value) / 100 : $(id).checked;
        saveSettings(this.game.settings);
        this.game.audio.setVolumes();
        document.body.classList.toggle('reduced-motion', this.game.settings.reducedMotion);
      });
    }
    this.el.startBtn.addEventListener('click', callbacks.onStart);
    this.el.resumeBtn.addEventListener('click', () => this.closeMenu());
    this.el.quitBtn.addEventListener('click', callbacks.onQuit);
    this.el.retryBtn.addEventListener('click', callbacks.onRetry);
    this.el.menuBtn.addEventListener('click', callbacks.onQuit);
    // 联机
    this.el.mpBtn.addEventListener('click', () => {
      this.el.mpPanel.classList.toggle('hidden');
      if (!this.el.mpName.value) this.el.mpName.value = this.game.myName;
      if (!this.el.mpPanel.classList.contains('hidden')) this.el.mpName.focus();
    });
    this.el.mpCreateBtn.addEventListener('click', () => {
      const name = (this.el.mpName.value || '').trim() || this.game.myName;
      this.game.mpCreate(name);
    });
    this.el.mpJoinBtn.addEventListener('click', () => {
      const name = (this.el.mpName.value || '').trim() || this.game.myName;
      if (!this.el.mpRoom.value.trim() || !this.el.mpPass.value.trim()) {
        this.setMpStatus('방 이름과 비밀번호를 입력하세요');
        return;
      }
      this.game.mpJoin(name, this.el.mpRoom.value, this.el.mpPass.value);
    });
    this.el.lobbyStartBtn.addEventListener('click', () => this.game.mpBegin());
    this.el.lobbyQuitBtn.addEventListener('click', () => this.game.quitToTitle());
    // 点击复制房名/密码
    const copy = (el) => el.addEventListener('click', () => {
      const fallback = () => {
        const range = document.createRange(); range.selectNodeContents(el);
        const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
        this.toast('선택됨 · Ctrl/Cmd+C로 복사하세요', '#4dff88');
      };
      if (navigator.clipboard && el.textContent) navigator.clipboard.writeText(el.textContent).then(() => this.toast('복사됨', '#4dff88')).catch(fallback);
      else fallback();
    });
    copy(this.el.lobbyRoom); copy(this.el.lobbyPass);
  }

  setMpStatus(t) { this.el.mpStatus.textContent = t; }

  // ---------- 大厅 ----------
  showLobby(isHost, room, pass, roster) {
    this.refreshPlanets();
    $('touch-ui').classList.add('hidden');
    this.el.title.classList.add('hidden');
    this.el.gameover.classList.add('hidden');
    this.el.lobby.classList.remove('hidden');
    this.el.hud.classList.add('hidden');
    this.el.lobbyRoomInfo.style.display = room ? 'block' : 'none';
    if (room) this.el.lobbyRoom.textContent = room;
    if (pass) this.el.lobbyPass.textContent = pass;
    this.el.lobbyStartBtn.classList.toggle('hidden', !isHost);
    this.el.lobbyWait.classList.toggle('hidden', isHost);
    this.lobbyRefresh(roster, isHost);
    this.resetDialogs();
    $('combat-tools').classList.add('hidden');
    this.syncDialogs(isHost ? this.el.lobbyStartBtn : this.el.lobbyQuitBtn);
  }

  lobbyRefresh(roster, isHost) {
    if (!this.el.lobby.classList.contains('hidden')) {
      this.el.lobbyPlayers.innerHTML = roster.map((p) =>
        `<div class="lobby-player"><span>${escapeText(p.name)}</span><span>${p.host ? '방장' : '준비 완료'}</span></div>`
      ).join('');
    }
  }

  hideLobby() { this.el.lobby.classList.add('hidden'); this.syncDialogs(); }

  // ---------- 倒地重生 ----------
  respawnOverlay(show) { this.el.respawn.classList.toggle('hidden', !show); }
  respawnCountdown(t) {
    this.el.respawnCount.textContent = Math.ceil(Math.max(0, t));
    $('respawn-detail').textContent = this.game.rescueActive ? '팀원이 4m 이내에서 복구 지원 · 회복 속도 ×2' : '팀원이 4m 이내로 오면 복구 가속 · 전원 쓰러지면 미션 실패';
  }

  // ---------- 联机结算 ----------
  showMpGameOver(stats, isHost) {
    this.el.gameover.classList.remove('hidden');
    this.el.goNewBest.classList.toggle('hidden', !stats.isBest);
    this.el.goStats.innerHTML = `
      <div class="st hero"><span>小队得分</span><b>${formatNum(stats.score)}</b></div>
      <div class="st"><span>存活时间</span><b>${formatTime(stats.time)}</b></div>
      <div class="st"><span>击杀</span><b>${formatNum(stats.kills)}</b></div>
      <div class="st"><span>团队等级</span><b>${stats.level}</b></div>
      <div class="st"><span>抵达区域</span><b>SECTOR ${stats.sector}</b></div>
      <div class="st"><span>修复反应堆</span><b>${this.game.reactor.captures}</b></div>`;
    this.el.retryBtn.textContent = '로비로 [R]';
    this.respawnOverlay(false);
    this.finishSummary(isHost);
  }

  // ---------- 屏幕切换 ----------
  showTitle(best) {
    this.refreshPlanets();
    $('touch-ui').classList.add('hidden');
    this.el.title.classList.remove('hidden');
    this.el.hud.classList.add('hidden');
    this.el.gameover.classList.add('hidden');
    this.el.pause.classList.add('hidden');
    this.el.levelup.classList.add('hidden');
    this.el.lobby.classList.add('hidden');
    this.el.mpPanel.classList.add('hidden');
    this.el.roster.innerHTML = '';
    this.el.titleBest.textContent = best > 0 ? `최고 기록 ${formatNum(best)}` : '아직 기록 없음 - 첫 기록에 도전하세요';
    this.resetDialogs();
    $('combat-tools').classList.add('hidden');
    this.syncDialogs(this.el.startBtn);
  }
  showHud() {
    this.resetDialogs();
    this.refreshPlanets();
    $('touch-ui').classList.toggle('hidden', !this.game.input.isTouch);
    this.el.title.classList.add('hidden');
    this.el.hud.classList.remove('hidden');
    this.el.gameover.classList.add('hidden');
    this.el.pause.classList.add('hidden');
    $('combat-tools').classList.remove('hidden');
    this.syncDialogs();
    document.activeElement?.blur();
  }
  showPause(show) {
    this.menuOpen = show;
    this.el.pause.classList.toggle('hidden', !show);
    $('pause-title').textContent = this.game.mp ? '스쿼드 메뉴' : '일시정지됨';
    $('pause-note').textContent = this.game.mp ? '멀티 전투는 계속됩니다. 메뉴는 무적을 제공하지 않습니다.' : '메뉴를 닫으면 미션 계속';
    this.el.quitBtn.textContent = this.game.mp ? '방 나가기' : '메인 메뉴로';
    this.syncDialogs(show ? this.el.resumeBtn : null);
  }

  showLevelUp(cards, views, onPick) {
    this.el.hud.classList.toggle('choosing-upgrade', !!this.game.mp);
    this.el.levelup.classList.toggle('mp-cards', !!this.game.mp);
    $('levelup-sub').firstChild.textContent = this.game.mp ? '전투 계속 · 카드 선택 후 잠시 무적 ' : '강화 하나 선택 ';
    $('reroll-btn').textContent = `리롤 [R] · ${this.game.rerolls}회${views.some((v) => v.cls === 'r-evolve') ? ' · 진화 기회 보유' : ''}`;
    $('reroll-btn').disabled = this.game.rerolls <= 0;
    this.el.levelup.classList.remove('hidden');
    const wrap = this.el.cards;
    wrap.innerHTML = '';
    // 防误点：入场动画期间锁定点击
    wrap.classList.add('locked');
    clearTimeout(this._lockT);
    this._lockT = setTimeout(() => {
      wrap.classList.remove('locked');
      for (const button of wrap.querySelectorAll('button')) button.disabled = false;
      if (!this.blocksGameplayInput()) this.syncDialogs(wrap.querySelector('button'));
    }, this.game.settings.reducedMotion ? 180 : 480);
    views.forEach((v, i) => {
      const div = document.createElement('button');
      div.type = 'button';
      div.disabled = true;
      div.className = 'card ' + v.cls + (v.owned ? ' is-owned' : '');
      const routeMeta = v.route ? ROUTES[v.route] : null;
      if (routeMeta) div.style.setProperty('--route-c', routeMeta.color);
      div.innerHTML = `
        <div class="c-key">${i + 1}</div>
        ${v.isNew ? '<div class="c-ribbon">NEW</div>' : ''}
        <div class="c-icon">${v.icon}</div>
        <div class="c-tag">${v.tag}</div>${routeMeta ? `<div class="c-route">${routeMeta.icon} ${routeMeta.name}</div>` : ''}
        <div class="c-name">${v.name}</div>
        <div class="c-lv">${v.lvText}</div>
        ${v.pips ? `<div class="c-pips">${v.pips}</div>` : ''}
        <div class="c-desc">${escapeText(v.desc)}</div>${v.detail ? `<div class="c-detail">${escapeText(v.detail)}</div>` : ''}${v.recipe ? `<div class="c-recipe">${escapeText(v.recipe)}</div>` : ''}`;
      div.addEventListener('click', () => {
        if (!this.blocksGameplayInput() && !wrap.classList.contains('locked')) onPick(i);
      });
      wrap.appendChild(div);
    });
    this.syncDialogs();
  }
  hideLevelUp() {
    clearTimeout(this._lockT);
    this.el.levelup.classList.add('hidden'); this.el.hud.classList.remove('choosing-upgrade');
    this.syncDialogs();
    if (!this.blocksGameplayInput()) document.activeElement?.blur();
  }

  openSettings() {
    if (this.settingsOpen) return;
    this._returnFocus.settings = document.activeElement;
    this.settingsOpen = true;
    this.settingsPaused = !this.game.mp && this.game.state === 'playing';
    if (this.settingsPaused) this.game.togglePause(true);
    this.game.input.clear();
    const s = this.game.settings;
    $('music-volume').value = s.music * 100; $('sfx-volume').value = s.sfx * 100;
    $('auto-aim').checked = s.autoAim; $('reduced-motion').checked = s.reducedMotion;
    $('quality').value = s.quality || 'high';
    $('auto-aim').disabled = this.game.input.isTouch;
    if (this.game.input.isTouch) $('auto-aim').checked = true;
    $('settings-note').textContent = this.game.mp && this.game.state === 'playing' ? '멀티는 일시정지되지 않습니다. 먼저 안전한 위치를 찾으세요' : '설정은 이 기기에 자동 저장됩니다';
    $('settings-screen').classList.remove('hidden');
    this.syncDialogs($('settings-close'));
  }
  closeSettings() {
    if (!this.settingsOpen) return;
    this.settingsOpen = false;
    $('settings-screen').classList.add('hidden');
    this.game.input.clear();
    if (this.settingsPaused && this.game.state === 'paused') this.game.togglePause();
    this.settingsPaused = false;
    this.syncDialogs(this._returnFocus.settings);
  }

  showGameOver(stats, isBest) {
    this.el.gameover.classList.remove('hidden');
    this.el.goNewBest.classList.toggle('hidden', !isBest);
    this.el.retryBtn.textContent = '다시 출격 [R]';
    this.el.goStats.innerHTML = `
      <div class="st hero"><span>最终得分</span><b>${formatNum(stats.score)}</b></div>
      <div class="st"><span>存活时间</span><b>${formatTime(stats.time)}</b></div>
      <div class="st"><span>击杀</span><b>${formatNum(stats.kills)}</b></div>
      <div class="st"><span>等级</span><b>${stats.level}</b></div>
      <div class="st"><span>抵达区域</span><b>SECTOR ${stats.sector}</b></div>
      <div class="st"><span>修复反应堆</span><b>${this.game.reactor.captures}</b></div>`;
    this.finishSummary(true);
  }

  blocksGameplayInput() { return this.settingsOpen || this.buildOpen || this.menuOpen; }

  openMenu() {
    if (!['playing', 'paused', 'levelup'].includes(this.game.state) || this.settingsOpen || this.buildOpen) return;
    this._returnFocus.menu = document.activeElement;
    this.game.input.clear();
    if (!this.game.mp && this.game.state === 'playing') this.game.togglePause(true);
    else this.showPause(true);
  }

  closeMenu() {
    if (!this.menuOpen) return;
    this.game.input.clear();
    if (!this.game.mp && this.game.state === 'paused') this.game.togglePause();
    else this.showPause(false);
    this.syncDialogs(this._returnFocus.menu);
  }

  openBuild() {
    if (this.buildOpen || this.settingsOpen || !['playing', 'paused', 'levelup'].includes(this.game.state)) return;
    this._returnFocus.build = document.activeElement;
    this.buildOpen = true;
    this.buildPaused = !this.game.mp && this.game.state === 'playing';
    if (this.buildPaused) this.game.togglePause(true);
    this.game.input.clear();
    this.renderBuild();
    $('build-screen').classList.remove('hidden');
    this.syncDialogs($('build-close'));
  }

  closeBuild() {
    if (!this.buildOpen) return;
    this.buildOpen = false;
    $('build-screen').classList.add('hidden');
    this.game.input.clear();
    if (this.buildPaused && this.game.state === 'paused') this.game.togglePause();
    this.buildPaused = false;
    this.syncDialogs(this._returnFocus.build);
  }

  closeTopDialog() {
    if (this.settingsOpen) this.closeSettings();
    else if (this.buildOpen) this.closeBuild();
    else if (this.menuOpen) this.closeMenu();
  }

  resetDialogs() {
    this.settingsOpen = this.buildOpen = this.menuOpen = false;
    this.settingsPaused = this.buildPaused = false;
    for (const id of ['settings-screen', 'build-screen', 'pause-screen']) $(id).classList.add('hidden');
  }

  topDialog() {
    return ['settings-screen', 'build-screen', 'pause-screen', 'levelup-screen', 'gameover-screen', 'lobby-screen', 'title-screen']
      .map($).find((el) => !el.classList.contains('hidden')) || null;
  }

  dialogControls(dialog) {
    if (!dialog) return [];
    const controls = [...dialog.querySelectorAll('button, input, select, a[href], [tabindex="0"]')];
    if (['title-screen', 'lobby-screen'].includes(dialog.id)) controls.push($('settings-btn'));
    return controls.filter((el) => !el.disabled && !el.closest('[inert]') && el.getClientRects().length);
  }

  syncDialogs(preferred = null) {
    const top = this.topDialog();
    for (const dialog of document.querySelectorAll('.overlay')) dialog.inert = dialog !== top;
    const blocking = this.blocksGameplayInput() || !!top;
    $('touch-ui').inert = this.blocksGameplayInput() || (!!top && !(this.game.mp && top.id === 'levelup-screen'));
    $('combat-tools').inert = blocking;
    $('settings-btn').inert = !!top && !['title-screen', 'lobby-screen'].includes(top.id);
    if (!top) { document.activeElement?.blur(); return; }
    const controls = this.dialogControls(top);
    if (preferred && controls.includes(preferred)) preferred.focus({ preventScroll: true });
    else if (!controls.includes(document.activeElement)) controls[0]?.focus({ preventScroll: true });
  }

  trapFocus(event) {
    const top = this.topDialog();
    if (!top) return;
    if (['ArrowLeft', 'ArrowRight'].includes(event.key) && top === this.el.levelup && event.target.classList.contains('card')) {
      const cards = [...this.el.cards.querySelectorAll('button:not(:disabled)')];
      const index = cards.indexOf(event.target);
      if (index >= 0) cards[(index + (event.key === 'ArrowRight' ? 1 : cards.length - 1)) % cards.length]?.focus();
      event.preventDefault(); event.stopPropagation();
    }
    if (event.key !== 'Tab') return;
    const controls = this.dialogControls(top);
    if (!controls.length) { event.preventDefault(); return; }
    const index = controls.indexOf(document.activeElement);
    const next = index < 0 ? (event.shiftKey ? controls.length - 1 : 0) : (index + (event.shiftKey ? controls.length - 1 : 1)) % controls.length;
    event.preventDefault(); controls[next].focus();
  }

  renderBuild() {
    const g = this.game, upgrades = g.upgrades;
    $('build-note').textContent = (g.mp ? '멀티 전투 계속 · ' : '보는 동안 일시정지 · ') + '수치는 행성, 패시브, 계열, 현재 가속 보너스를 포함합니다. 피해는 비크리티컬 단일 명중 기준.';
    const rows = (kind) => UPGRADES.filter((u) => u.kind === kind).map((u) => {
      const lv = upgrades.level(u.id), evolved = g.weapons.evolved[u.id];
      const actual = kind === 'weapon' ? upgrades.weaponSummary(u.id) : upgrades.passiveValue(u.id);
      const next = lv < u.max ? `다음 단계: ${upgrades.nextBenefit(u)}` : '최고 레벨 달성';
      return `<article class="build-item${lv ? '' : ' unowned'}"><div class="build-item-heading"><b>${u.icon} ${escapeText(u.name)}</b><span>${evolved ? '진화 완료' : `LV ${lv} / ${u.max}`}</span></div><p>${escapeText(actual)}</p><p class="build-next">${escapeText(next)}</p>${kind === 'weapon' ? `<p class="build-recipe">${escapeText(upgrades.evolutionRecipe(u.id))}</p>` : ''}</article>`;
    }).join('');
    const effects = {
      pyro: ['무기 피해 +12%', '일반 적 처치 시 반경 2.6m, 피해 20의 폭발 발생', '무기와 계열 피해에 3초 점화 부여(Q / E는 점화 안 됨). 초당 피해는 해당 명중 피해의 20%, 같은 점화는 더 강한 쪽 유지'],
      volt: ['무기 발사 빈도 +12%', '처치 시 25% 확률 낙뢰, 반경 3m, 피해 50', '5초마다 가장 밀집한 적군 폭격, 반경 4m, 피해 90'],
      void: ['최대 체력 +20, 장갑 +1, 즉시 20 회복', '피격 시 반경 5.5m, 피해 32의 노바 발산, 쿨다운 3초', '8초마다 9m 이내 체력 ≤25% 일반 적 처형 · 처형당 2 회복, 최대 12'],
    };
    const routes = Object.entries(ROUTES).map(([id, route]) => `<article class="build-route" style="--route-c:${route.color}"><b>${route.icon} ${route.name} · 투자 ${g.routes[id]}레벨</b>${ROUTE_TIERS.map((threshold, i) => `<p class="${g.routes[id] >= threshold ? 'unlocked' : ''}">${g.routes[id] >= threshold ? '◆' : '◇'} ${threshold}레벨 · ${route.tiers[i]}: ${effects[id][i]}</p>`).join('')}</article>`).join('');
    $('build-content').innerHTML = `<h3>무기와 진화 레시피</h3><div class="build-grid">${rows('weapon')}</div><h3>패시브 모듈</h3><div class="build-grid">${rows('passive')}</div><h3>계열 각성</h3><p class="build-help">같은 계열의 무기나 패시브를 고를 때마다 투자 1 증가. 투자한 계열은 다시 나올 확률이 높아집니다(포인트당 +12%). 진화에는 다른 계열의 모듈이 필요할 수 있습니다. Q / E 스킬 처치는 추가 처치 폭발, 낙뢰, 연쇄 피해를 발동시키지 않습니다. 일반 적 처치로 되돌려 받는 오버드라이브 에너지는 발당 최대 25. 보스 보상은 별도 계산으로 오버드라이브 100, 소멸 40을 제공합니다.</p><div class="build-routes">${routes}</div>`;
  }

  finishSummary(isHost) {
    this.resetDialogs();
    this.hideLevelUp();
    $('touch-ui').classList.add('hidden');
    $('combat-tools').classList.add('hidden');
    const victory = this.game.runOutcome === 'victory';
    $('go-title').textContent = victory ? '에너지 복구 완료' : '신호 끊김';
    $('go-title').classList.toggle('victory', victory);
    $('continue-endless-btn').classList.toggle('hidden', !victory || !isHost);
    this.el.retryBtn.disabled = victory && !isHost;
    if (victory && !isHost) this.el.retryBtn.textContent = '방장의 다음 선택 대기 중';
    this.el.menuBtn.textContent = this.game.mp ? '방 나가기' : '메인 메뉴로';
    const summary = this.game.runSummary?.();
    if (summary) {
      const build = Array.isArray(summary.build) ? summary.build.map((item) => typeof item === 'string' ? item : `${item.name || item.id} ${item.level ? 'LV' + item.level : ''}`).join(' · ')
        : typeof summary.build === 'object' ? Object.entries(summary.build).map(([id, level]) => `${id} LV${level}`).join(' · ') : String(summary.build || '');
      $('go-summary').innerHTML = `<p><b>${escapeText(summary.planet || this.game.planet.name)} · ${escapeText(summary.mode || '')}</b></p><p>${escapeText(summary.cause || (victory ? '탈출 조건 완료' : '기체 파괴됨'))}</p><p>최종 빌드: ${escapeText(build)}</p>${summary.damage?.length ? `<div class="damage-summary">${summary.damage.map((row) => `<span>${escapeText(row.name)} <b>${formatNum(Math.round(row.value))}</b></span>`).join('')}</div>` : ''}${victory && !isHost ? '<p>방장이 엔드리스 계속 또는 스쿼드 로비 복귀를 선택할 때까지 대기. 방을 나갈 수도 있습니다.</p>' : ''}`;
    } else $('go-summary').textContent = '';
    this.syncDialogs(victory && isHost ? $('continue-endless-btn') : this.el.retryBtn);
  }

  // ---------- 每帧 HUD ----------
  update(dt) {
    this.tactical.update(dt);
    const g = this.game, p = g.player;
    // HP
    const hpF = clamp(p.hpFrac, 0, 1);
    this.el.hpFill.style.transform = `scaleX(${hpF})`;
    this.el.hpFill.className = hpF > 0.35 ? 'hp-ok' : '';
    this.el.hpFill.id = 'hp-fill';
    this.el.hpNum.textContent = `${Math.max(0, Math.ceil(p.stats.hp))} / ${p.stats.maxHp}`;
    // XP
    const need = XP_CURVE(p.level);
    this.el.xpFill.style.transform = `scaleX(${clamp(p.xp / need, 0, 1)})`;
    this.el.levelNum.textContent = p.level;
    // 顶部
    this.el.sector.textContent = `SECTOR ${g.sector}`;
    this.el.score.textContent = formatNum(Math.floor(g.score));
    this.el.timer.textContent = formatTime(g.time);
    this.el.kills.textContent = formatNum(p.kills);
    this.el.best.textContent = formatNum(Math.max(g.best, Math.floor(g.score)));
    // 冲刺冷却环
    const dashF = 1 - clamp(p.dashCdT / p.stats.dashCd, 0, 1);
    this.el.dashRing.style.strokeDashoffset = (100.5 * (1 - dashF)).toFixed(1);
    this.el.dashRing.style.stroke = dashF >= 1 ? '#2ee6ff' : 'rgba(46,230,255,.35)';
    // 超载
    const pulseF = clamp(g.pulse / 100, 0, 1);
    this.el.pulseFill.style.transform = `scaleX(${pulseF})`;
    this.el.pulseBar.classList.toggle('full', pulseF >= 1);
    // 湮灭协议
    const ultF = clamp(g.ult / ULT.max, 0, 1);
    this.el.ultFill.style.transform = `scaleX(${ultF})`;
    this.el.ultBar.classList.toggle('full', ultF >= 1);
    // 流派面板（变化时才重建）
    const sig = `${g.routes.pyro},${g.routes.volt},${g.routes.void}|${g.routeTiers.pyro},${g.routeTiers.volt},${g.routeTiers.void}`;
    if (sig !== this._routeSig) {
      this._routeSig = sig;
      let html = '';
      for (const [id, R] of Object.entries(ROUTES)) {
        const lv = g.routes[id];
        if (lv <= 0) continue;
        const tier = g.routeTiers[id];
        const pips = '◆'.repeat(tier) + '◇'.repeat(3 - tier);
        html += `<div class="route-row" style="color:${R.color}"><span class="r-icon">${R.icon}</span><span>${R.name}</span><span class="r-pips">${pips}</span><span class="r-lv">LV.${lv}${tier > 0 ? ' · ' + R.tiers[tier - 1] : ''}</span></div>`;
      }
      this.el.routes.innerHTML = html;
    }
    // 联机队伍面板
    if (g.mp) {
      let sig = '';
      for (const p of g.mp.peers.values()) sig += `${p.id}:${Math.round(p.hp)}:${p.dead ? 1 : 0};`;
      if (sig !== this._rosterSig) {
        this._rosterSig = sig;
        let html = '';
        for (const p of g.mp.peers.values()) {
          const f = clamp(p.hp / (p.maxHp || 100), 0, 1);
          html += `<div class="roster-row${p.dead ? ' dead' : ''}"><span class="rr-name">${escapeText(p.name)}</span><div class="rr-bar"><div class="rr-fill" style="transform:scaleX(${f})"></div></div></div>`;
        }
        this.el.roster.innerHTML = html;
      }
    }
    // 连锁
    const ch = g.chain;
    if (ch >= 5) {
      this.el.chain.classList.remove('hidden');
      this.el.chainNum.textContent = 'x' + ch;
      this.el.chain.className = ch >= 100 ? 't4' : ch >= 50 ? 't3' : ch >= 25 ? 't2' : '';
      if (ch !== this._lastChain) {
        this.el.chain.classList.add('pop');
        clearTimeout(this._chainPopT);
        this._chainPopT = setTimeout(() => this.el.chain.classList.remove('pop'), 90);
      }
    } else {
      this.el.chain.classList.add('hidden');
    }
    this._lastChain = ch;
    // 低血量红晕
    this.el.lowhp.style.opacity = hpF < 0.32 ? (g.settings.reducedMotion ? 0.4 : 0.5 + Math.sin(g.time * 6) * 0.3) * (1 - hpF / 0.32 + 0.3) : 0;
    // FPS
    this._fpsAcc += dt; this._fpsN++;
    if (this._fpsAcc > 0.5) {
      this.el.fps.textContent = `${Math.round(this._fpsN / this._fpsAcc)} FPS`;
      this._fpsAcc = 0; this._fpsN = 0;
    }
  }

  showBossBanner(show) { this.el.bossBanner.classList.toggle('hidden', !show); }

  setBossHp(frac, mark = 0) {
    if (frac < 0) { this.bossWrap.classList.add('hidden'); return; }
    this.bossWrap.classList.remove('hidden');
    this.bossName.textContent = mark > 0 ? `VOID OVERLORD MK.${mark + 1}` : 'VOID OVERLORD';
    this.bossFill.style.transform = `scaleX(${clamp(frac, 0, 1)})`;
  }

  flash(opacity = 0.55, ms = 90) {
    if (this.game.settings.reducedMotion) return;
    this.el.flash.style.transition = 'none';
    this.el.flash.style.opacity = opacity;
    requestAnimationFrame(() => {
      this.el.flash.style.transition = `opacity ${ms}ms ease-out`;
      this.el.flash.style.opacity = 0;
    });
  }

  setMuted(m) { this.el.muteIcon.classList.toggle('hidden', !m); }
}

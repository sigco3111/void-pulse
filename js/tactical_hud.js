import { REACTOR } from './reactor.js';
import { DIRECTOR } from './config.js';
import { MISSION } from './mission.js';

export class TacticalHud {
  constructor(game) {
    this.game = game; this.timer = 0;
    this.canvas = document.getElementById('radar');
    this.ctx = this.canvas.getContext('2d');
    this.title = document.getElementById('objective-title');
    this.detail = document.getElementById('objective-detail');
    this.fill = document.getElementById('objective-fill');
    this.wave = document.getElementById('wave-status');
    this.hint = document.getElementById('field-hint');
    this.mission = document.getElementById('mission-status');
  }
  update(dt) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.1;
    const g = this.game, r = g.reactor;
    const active = r.phase === 'active';
    const distance = Math.hypot(g.player.pos.x, g.player.pos.z);
    const left = Math.max(0, Math.ceil(MISSION.seconds - g.time));
    this.mission.textContent = g.endless ? `엔드리스 도전 · 복구 ${r.captures}회` : `탈출 조건: 복구 ${Math.min(MISSION.captures, r.captures)}/${MISSION.captures} · ${left > 0 ? `생존 ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : '생존 완료'}`;
    this.title.textContent = r.buffLeft > 0 ? `에너지 가속 · ${Math.ceil(r.buffLeft)}s` : active ? '원자로 확보' : `원자로 온라인까지 ${Math.ceil(r.left)}s`;
    this.detail.textContent = r.buffLeft > 0 ? '전원 연사 속도 +25% · 확보 ' + r.captures + ' 회'
      : active ? `${Math.ceil(r.left)}s 안에 완료 · ${distance <= REACTOR.radius ? (r.contested ? '적 방해 · 오라 안의 적 정리' : '충전 중 · 오라 안 최대 3명 가속') : `중심까지 ${Math.ceil(distance)}m · 황금 오라 진입`}`
      : '오라에서 7초 버티기 → 복구 / 오버드라이브 / 팀 가속';
    this.fill.style.transform = `scaleX(${r.buffLeft > 0 ? r.buffLeft / REACTOR.buff : active ? r.charge / REACTOR.hold : 0})`;
    this.fill.style.background = r.buffLeft > 0 ? '#4dff88' : '#ffd23e';
    const phase = g.enemies.paceAt(g.time).phase;
    const within = g.time % DIRECTOR.waveSeconds;
    const until = (phase === 'advance' ? DIRECTOR.surgeAt : phase === 'surge' ? DIRECTOR.respiteAt : DIRECTOR.waveSeconds) - within;
    const hazard = g.world.hazardInfo;
    this.wave.textContent = hazard.phase !== 'calm' ? (hazard.phase === 'warning' ? `⚠ ${hazard.central ? '중앙 ' : ''}${g.planet.hazard.name} 경고 · 점멸 구역에서 벗어나세요` : `⚡ ${g.planet.hazard.name} · 밝은 구역을 피하세요`)
      : `${{ advance: '진행', surge: '스웜 절정', respite: '숨 돌리기 · 파편 회수' }[phase]} · ${Math.ceil(until)}s`;
    const fallen = g.mp && [...g.mp.peers.values()].find((p) => p.ready && p.dead && !p.away);
    const nearFallen = fallen && Math.hypot(g.player.pos.x - fallen.x, g.player.pos.z - fallen.z);
    this.hint.textContent = g.mp?.hostAway ? '방장 자리 비움 · 팀 전체 일시정지'
      : g.player.dead ? (g.rescueActive ? '팀원이 복구 지원 중 · 회복 속도 ×2' : '복구 대기 중 · 팀원이 4m 이내 접근 시 가속')
      : fallen ? `팀원 쓰러짐 · 거리 ${Math.ceil(nearFallen)}m · 4m 이내에서 복구 지원`
      : g.player.level < 2 && g.time < 45 ? (g.input.isTouch ? '스틱을 위로 드래그해 앞의 초록 파편을 모아 업그레이드 완료' : 'W를 눌러 앞으로 이동해 초록 파편을 모아 첫 업그레이드 완료')
      : g.time < 24 ? '24초 후 원자로 온라인 · 중앙 황금 오라에 들어가 충전해 복구 완료'
      : g.time < 35 ? (g.input.isTouch ? '자동 발사 · 오른쪽 대시로 회피 · 빌드에서 강화와 진화 레시피 확인' : 'SPACE 대시 회피 · F 조준 전환 · B 빌드와 진화 레시피 보기')
      : g.pulse >= 100 ? (g.input.isTouch ? '오버드라이브 준비 완료 · 오른쪽 버튼으로 돌파' : 'Q 오버드라이브 준비 완료 · 포위됐을 때 사용') : '';
    document.getElementById('aim-mode').textContent = g.input.isTouch ? '터치 자동 조준' : g.settings.autoAim ? '자동 조준 [F]' : '마우스 조준 [F]';
    this.draw();
  }
  draw() {
    const g = this.game, c = this.ctx, size = this.canvas.width, margin = 7;
    const scale = (size - margin * 2) / (g.arena * 2);
    const xy = (n) => size / 2 + n * scale;
    c.clearRect(0, 0, size, size);
    c.fillStyle = '#081321'; c.fillRect(0, 0, size, size);
    c.strokeStyle = '#1c4558'; c.lineWidth = 1;
    c.strokeRect(margin, margin, size - margin * 2, size - margin * 2);
    c.beginPath(); c.moveTo(size / 2, margin); c.lineTo(size / 2, size - margin);
    c.moveTo(margin, size / 2); c.lineTo(size - margin, size / 2); c.stroke();
    const dot = (x, z, r, color) => { c.fillStyle = color; c.beginPath(); c.arc(xy(x), xy(z), r, 0, Math.PI * 2); c.fill(); };
    const hz = g.world.hazardInfo;
    if (hz.phase !== 'calm') {
      c.fillStyle = hz.phase === 'active' ? `#${g.planet.hazard.color.toString(16).padStart(6, '0')}88` : '#ffaa3355';
      const { offset, width } = hz;
      for (const sign of hz.central ? [1] : [-1, 1]) {
        if (hz.axis === 0) c.fillRect(xy(sign * offset - width / 2), margin, width * scale, size - margin * 2);
        else c.fillRect(margin, xy(sign * offset - width / 2), size - margin * 2, width * scale);
      }
    }
    for (const p of g.world.colliders) dot(p.x, p.z, Math.max(1.5, p.r * scale), '#466473');
    for (const e of g.enemies.list) if (e.active && !e.dying) dot(e.pos.x, e.pos.z, e.type === 'boss' ? 3 : 1.2, '#ff5679');
    c.fillStyle = g.reactor.phase === 'active' ? '#ffd23e' : '#3d9299';
    c.save(); c.translate(size / 2, size / 2); c.rotate(Math.PI / 4); c.fillRect(-3, -3, 6, 6); c.restore();
    c.fillStyle = '#ffd23e';
    for (const s of g.pickups.supplies) if (s.active) c.fillRect(xy(s.x) - 2, xy(s.z) - 2, 4, 4);
    if (g.mp) for (const p of g.mp.peers.values()) {
      if (g.mp.peerAvailable(p)) dot(p.x, p.z, 2.8, '#ffd23e');
      else if (p.ready && p.dead && !p.away) {
        dot(p.x, p.z, 3, '#ff5679');
        c.strokeStyle = '#ffffff'; c.beginPath();
        c.arc(xy(p.x), xy(p.z), 4 * scale, 0, Math.PI * 2); c.stroke();
      }
    }
    if (g.player.alive && !g.player.dead) {
      dot(g.player.pos.x, g.player.pos.z, 3.2, '#2ee6ff');
      c.strokeStyle = '#bffaff'; c.beginPath();
      c.moveTo(xy(g.player.pos.x), xy(g.player.pos.z));
      c.lineTo(xy(g.player.pos.x) + g.player.aimDir.x * 8, xy(g.player.pos.z) + g.player.aimDir.z * 8); c.stroke();
    }
  }
}

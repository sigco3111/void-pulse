// ============ 升级系统：卡牌池 / 抽取 / 生效 ============
import { MAX_WEAPON_LV, WEAPON_TABLES, EVO_TABLES } from './weapons.js';
import { pick } from './utils.js';
import { PLAYER } from './config.js';

const num = (n) => Number(n.toFixed(2)).toString();

// kind: weapon(新武器/武器升级) | passive | bonus
export const UPGRADES = [
  // —— 武器 ——
  {
    id: 'blaster', route: 'pyro', kind: 'weapon', icon: '🔫', name: '펄스 건', max: MAX_WEAPON_LV,
    tag: '주 무기',
    desc: (lv) => [
      '조준 방향으로 자동 사격하는 에너지 건.',
      '발당 피해와 발사 빈도 상승.',
      '탄환 1발 추가(부채꼴), 발사 빈도 상승.',
      '피해와 발사 빈도 상승, 탄환이 대상 1개를 추가 관통.',
      '탄환 1발 추가, 피해 전반 상승.',
    ][lv - 1] || '',
  },
  {
    id: 'blades', route: 'void', kind: 'weapon', icon: '🌀', name: '오르빗 블레이드', max: MAX_WEAPON_LV,
    tag: '보조 무기',
    desc: (lv) => [
      '해금: 에너지 블레이드 2개가 기체 주위를 돌며 접근하는 적을 파괴.',
      '에너지 블레이드 +1(총 3개), 피해·범위·회전 속도 상승.',
      '피해 +50%, 회전 속도 상승.',
      '에너지 블레이드 +1(총 4개), 피해·범위·회전 속도 상승.',
      '에너지 블레이드 +1(총 5개), 피해 대폭 상승.',
    ][lv - 1] || '',
  },
  {
    id: 'missiles', route: 'pyro', kind: 'weapon', icon: '🚀', name: '추적 미사일', max: MAX_WEAPON_LV,
    tag: '보조 무기',
    desc: (lv) => [
      '해금: 자동 추적 미사일을 주기적으로 발사, 명중 시 범위 폭발.',
      '미사일 +1(총 2개), 피해 상승 및 쿨다운 단축.',
      '쿨다운 단축 및 폭발 피해 상승.',
      '미사일 +1(총 3개), 폭발 범위 확대.',
      '미사일 +1(총 4개), 피해 대폭 상승.',
    ][lv - 1] || '',
  },
  {
    id: 'tesla', route: 'volt', kind: 'weapon', icon: '⚡', name: '테슬라 아크', max: MAX_WEAPON_LV,
    tag: '보조 무기',
    desc: (lv) => [
      '해금: 번개가 가장 가까운 적을 자동으로 치고 적 사이를 연쇄.',
      '연쇄 대상 +1(총 4개).',
      '쿨다운 단축, 연쇄 +1.',
      '연쇄 +1(총 6개), 피해 상승.',
      '연쇄 +2(총 8개), 피해 대폭 상승.',
    ][lv - 1] || '',
  },
  {
    id: 'nova', route: 'pyro', kind: 'weapon', icon: '💫', name: '노바 버스트', max: MAX_WEAPON_LV,
    tag: '보조 무기',
    desc: (lv) => [
      '해금: 주기적으로 충격 노바를 발산해 주변 적을 밀치고 피해.',
      '충격 반경 확대.',
      '쿨다운 단축, 피해 상승.',
      '피해 상승 및 쿨다운 단축.',
      '쿨다운 대폭 단축, 반경과 피해 전반 상승.',
    ][lv - 1] || '',
  },
  // —— 被动 ——
  {
    id: 'p_dmg', route: 'pyro', kind: 'passive', icon: '💥', name: '증폭 코어', max: 5, tag: '패시브',
    desc: () => '모든 무기 피해 +12%.',
    apply: (g) => { g.player.stats.dmgMul *= 1.12; },
  },
  {
    id: 'p_rate', route: 'volt', kind: 'passive', icon: '⏱️', name: '오버클럭 모듈', max: 5, tag: '패시브',
    desc: () => '모든 무기 연사 속도 / 발동 빈도 +10%.',
    apply: (g) => { g.player.stats.rateMul *= 1.10; },
  },
  {
    id: 'p_speed', route: 'volt', kind: 'passive', icon: '💨', name: '이온 추진기', max: 5, tag: '패시브',
    desc: () => '이동 속도 +8%.',
    apply: (g) => { g.player.stats.speedMul *= 1.08; },
  },
  {
    id: 'p_hp', route: 'void', kind: 'passive', icon: '❤️', name: '나노 장갑층', max: 5, tag: '패시브',
    desc: () => '최대 체력 +25, 즉시 25 회복.',
    apply: (g) => { g.player.stats.maxHp += 25; g.player.heal(25); },
  },
  {
    id: 'p_magnet', route: 'void', kind: 'passive', icon: '🧲', name: '중력 수집기', max: 5, tag: '패시브',
    desc: () => '파편 획득 범위 +50%.',
    apply: (g) => { g.player.stats.magnet *= 1.5; },
  },
  {
    id: 'p_armor', route: 'void', kind: 'passive', icon: '🛡️', name: '편향 실드', max: 5, tag: '패시브',
    desc: () => '받는 모든 피해 -2(최소 1 유지).',
    apply: (g) => { g.player.stats.armor += 2; },
  },
  {
    id: 'p_dash', route: 'void', kind: 'passive', icon: '✨', name: '위상 엔진', max: 5, tag: '패시브',
    desc: () => '대시 쿨다운 -12%.',
    apply: (g) => { g.player.stats.dashCd = Math.max(0.9, g.player.stats.dashCd * 0.88); },
  },
  {
    id: 'p_crit', route: 'pyro', kind: 'passive', icon: '🎯', name: '약점 스캐너', max: 5, tag: '패시브',
    desc: () => '크리티컬 확률 +8%(크리티컬은 220% 피해).',
    apply: (g) => { g.player.stats.critCh += 0.08; },
  },
  {
    id: 'p_chain', route: 'volt', kind: 'passive', icon: '🔗', name: '연쇄 리액터', max: 3, tag: '패시브',
    desc: () => '연쇄 유지 시간 +0.7초, 연쇄 점수 추가 +25%.',
    apply: (g) => { g.chainWindow += 0.7; g.chainScoreMul += 0.25; },
  },
];

// —— 进化卡：满级武器 + 对应被动 → 出现（金色，首槽必出）——
export const EVOLUTIONS = [
  {
    id: 'evo_blaster', base: 'blaster', needs: 'p_rate', kind: 'evolve',
    icon: '☄️', name: '소멸 광선', tag: '진화', needName: '오버클럭 모듈',
    desc: () => '부채꼴 3발을 하나의 중형 직선 광선으로 합쳐 더 강한 단일 화력과 무한 관통. 적 떼를 한 직선으로 유도해야 함.',
  },
  {
    id: 'evo_blades', base: 'blades', needs: 'p_speed', kind: 'evolve',
    icon: '🌪️', name: '폭풍 검역', tag: '진화', needName: '이온 추진기',
    desc: () => '에너지 블레이드 8개가 회전하며 베고, 주기적으로 8방향 관통 블레이드 스톰 발사.',
  },
  {
    id: 'evo_missiles', base: 'missiles', needs: 'p_dmg', kind: 'evolve',
    icon: '🐝', name: '스웜 하이브', tag: '진화', needName: '증폭 코어',
    desc: () => '한 번에 모자 미사일 8발 발사, 폭발 후 지연 폭탄으로 재분열.',
  },
  {
    id: 'evo_tesla', base: 'tesla', needs: 'p_crit', kind: 'evolve',
    icon: '🌩️', name: '천벌 뇌옥', tag: '진화', needName: '약점 스캐너',
    desc: () => '12연쇄 광뢰. 각 명중 지점에 지속 화상의 뇌옥 구역 생성.',
  },
  {
    id: 'evo_nova', base: 'nova', needs: 'p_hp', kind: 'evolve',
    icon: '💫', name: '초신성 붕괴', tag: '진화', needName: '나노 장갑층',
    desc: () => '중력 붕괴로 적을 중심으로 끌어당긴 뒤 폭발, 실드 1겹 생성.',
  },
];

const BONUS_CARDS = [
  {
    id: 'b_repair', kind: 'bonus', icon: '🔧', name: '긴급 수리', max: 99, tag: '보급',
    desc: () => '최대 체력의 40% 즉시 회복.',
    apply: (g) => { g.player.heal(g.player.stats.maxHp * 0.4); },
  },
  {
    id: 'b_score', kind: 'bonus', icon: '💎', name: '데이터 코어', max: 99, tag: '보급',
    desc: () => '즉시 800점 획득.',
    apply: (g) => { g.addScore(800); },
  },
  {
    id: 'b_pulse', kind: 'bonus', icon: '⚛️', name: '오버드라이브 배터리', max: 99, tag: '보급',
    desc: () => '오버드라이브 에너지 즉시 충전.',
    apply: (g) => { g.pulse = 100; },
  },
];

export class Upgrades {
  constructor(game) {
    this.game = game;
    this.reset();
  }

  reset() {
    this.taken = { blaster: 1 };   // 脉冲枪初始即 1 级
  }

  level(id) { return this.taken[id] || 0; }

  available() {
    return UPGRADES.filter((u) => {
      const lv = this.level(u.id);
      if (lv >= u.max) return false;
      // 副武器未解锁时也可选；脉冲枪从 1 级开始
      return true;
    });
  }

  availableEvolutions() {
    const g = this.game;
    return EVOLUTIONS.filter((ev) =>
      !this.level(ev.id) &&
      g.weapons.level(ev.base) >= MAX_WEAPON_LV &&
      this.level(ev.needs) >= 1
    );
  }

  rollCards(n = 3, previous = []) {
    const g = this.game;
    const all = this.available();
    const fresh = all.filter((u) => !previous?.some((p) => p.id === u.id));
    const pool = fresh.length >= n ? fresh : all;
    const cards = [];
    // 有可用进化 → 首槽必出
    const evos = this.availableEvolutions();
    const freshEvos = evos.filter((u) => !previous?.some((p) => p.id === u.id));
    if (evos.length > 0) cards.push(pick(freshEvos.length ? freshEvos : evos));
    const weights = pool.map((u) => {
      const lv = this.level(u.id);
      let w = 1.0;
      if (u.kind === 'weapon' && lv === 0) w = 1.3;      // 新武器略优先
      else if (u.kind === 'weapon') w = 1.1;
      // 已投入的流派更容易刷到 → 鼓励单一路线叠加
      const routeLv = g.routes ? g.routes[u.route] || 0 : 0;
      w *= 1 + routeLv * 0.12;
      return w;
    });
    for (let k = cards.length; k < n && pool.length > 0; k++) {
      let total = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      let idx = 0;
      for (; idx < pool.length; idx++) { r -= weights[idx]; if (r <= 0) break; }
      idx = Math.min(idx, pool.length - 1);
      cards.push(pool[idx]);
      pool.splice(idx, 1);
      weights.splice(idx, 1);
    }
    // 全满级时发补给卡
    while (cards.length < n) cards.push(pick(BONUS_CARDS));
    return cards;
  }

  apply(card) {
    const g = this.game;
    const lv = this.level(card.id);
    this.taken[card.id] = lv + 1;
    if (card.kind === 'evolve') {
      g.weapons.evolved[card.base] = true;
      g.onEvolution(card);
    } else if (card.kind === 'weapon') {
      g.weapons.levels[card.id] = lv + 1;
    } else {
      card.apply(g);
    }
  }

  // Numerical descriptions read the same tables and multipliers as combat.
  weaponSummary(id, level = this.level(id), evolved = !!this.game.weapons.evolved[id]) {
    const cfg = evolved ? EVO_TABLES[id] : WEAPON_TABLES[id]?.[level];
    if (!cfg) return '미장착';
    const g = this.game;
    const dmg = g.weapons.finalDmg(cfg.dmg, false);
    const rate = g.weapons.rateMul();
    const parts = [`단일 피해 ${dmg}`];
    if (cfg.rate) parts.push(`${num(cfg.rate * rate)}회/초`, `회당 ${cfg.shots}발`, cfg.pierce >= 99 ? '무한 관통' : `추가 관통 ${cfg.pierce}개`);
    if (cfg.cd) parts.push(`간격 ${num(cfg.cd / rate)}초`);
    if (cfg.n) parts.push(`${cfg.n} ${id === 'blades' ? '개 블레이드' : '개 미사일'}`);
    if (cfg.chains) parts.push(`${cfg.chains}연쇄`);
    if (cfg.aoe || cfg.radius) parts.push(`범위 ${num(cfg.aoe || cfg.radius)}m`);
    if (cfg.rot) parts.push(`회전 속도 ${num(cfg.rot * rate)} rad/s`, `같은 적 명중 간격 ≥${num(0.38 / rate)}초`);
    if (evolved && id === 'blades') parts.push(`${num(cfg.flingCd / rate)}초마다 블레이드 8개 발사(피해 ${g.weapons.finalDmg(cfg.flingDmg, false)})`);
    if (evolved && id === 'missiles') parts.push(`탄당 ${cfg.bomblets}개로 재분열(피해 ${g.weapons.finalDmg(cfg.bombletDmg, false)})`);
    if (evolved && id === 'tesla') parts.push(`명중 지점에 ${cfg.zoneDur}초 뇌옥 구역 생성`);
    if (evolved && id === 'nova') parts.push('적을 끌어당기고 실드 획득');
    return parts.join(' · ');
  }

  passiveValue(id, next = false) {
    const g = this.game, s = g.player.stats, n = next ? 1 : 0;
    switch (id) {
      case 'p_dmg': return `무기 피해 ×${num(s.dmgMul * g.routeFx.dmg * (1.12 ** n))}`;
      case 'p_rate': return `무기 빈도 ×${num(g.weapons.rateMul() * (1.1 ** n))}`;
      case 'p_speed': return `기본 이동 ${num(PLAYER.speed * s.speedMul * (1.08 ** n))}m/초`;
      case 'p_hp': return `최대 체력 ${s.maxHp + n * 25}${next ? ', 즉시 25 회복' : ''}`;
      case 'p_magnet': return `파편 흡수 반경 ${num(s.magnet * (1.5 ** n))}m`;
      case 'p_armor': return `피해 감소 ${s.armor + n * 2}, 최소 1 적용`;
      case 'p_dash': return `대시 쿨다운 ${num(Math.max(0.9, s.dashCd * (0.88 ** n)))}초`;
      case 'p_crit': return `크리티컬 확률 ${num(Math.min(1, s.critCh + n * 0.08) * 100)}%, 크리티컬 피해 ×${num(s.critMul)}`;
      case 'p_chain': return `연쇄 유지 ${num(g.chainWindow + n * 0.7)}초, 추가 점수 ×${num(g.chainScoreMul + n * 0.25)}`;
      default: return '';
    }
  }

  evolutionRecipe(base) {
    const ev = EVOLUTIONS.find((e) => e.base === base);
    if (!ev) return '';
    if (this.game.weapons.evolved[base]) return `진화 완료: ${ev.name}`;
    const weapon = UPGRADES.find((u) => u.id === base);
    const lv = this.game.weapons.level(base), passiveLv = this.level(ev.needs);
    const missing = [];
    if (lv < MAX_WEAPON_LV) missing.push(`${weapon.name} ${MAX_WEAPON_LV - lv}레벨 부족`);
    if (passiveLv < 1) missing.push(`${ev.needName} 필요`);
    return `진화 → ${ev.name}: ${weapon.name} LV${MAX_WEAPON_LV} + ${ev.needName} LV1. ${missing.length ? missing.join('; ') : '조건 충족, 다음 카드에서 등장 가능'}`;
  }

  nextBenefit(card) {
    const cur = this.level(card.id);
    if (card.kind === 'weapon') return this.weaponSummary(card.id, cur + 1, false);
    if (card.kind === 'passive') return `${this.passiveValue(card.id)} → ${this.passiveValue(card.id, true)}`;
    return card.desc(cur + 1);
  }

  // 卡牌显示数据
  cardView(card) {
    const cur = this.level(card.id);
    if (card.kind === 'evolve') {
      const baseU = UPGRADES.find((u) => u.id === card.base) || {};
      return {
        icon: card.icon, tag: '⚡ 진화', name: card.name,
        lvText: `${baseU.name || card.base} + ${card.needName} → EVOLVE`,
        desc: card.desc(), detail: `${this.weaponSummary(card.base)} → ${this.weaponSummary(card.base, MAX_WEAPON_LV, true)}`, recipe: '', cls: 'r-evolve',
        route: baseU.route, pips: '', isNew: false, owned: false,
      };
    }
    const isNew = card.kind === 'weapon' && cur === 0;
    const owned = cur > 0 && card.kind !== 'bonus';
    // 等级刻度（补给卡无）
    let pips = '';
    if (card.max <= 90) {
      const full = '●'.repeat(cur);
      const next = cur < card.max ? '◉' : '';
      const empty = '○'.repeat(Math.max(0, card.max - cur - 1));
      pips = full + next + empty;
    }
    return {
      icon: card.icon,
      tag: isNew ? '✦ 새 무기' : card.tag,
      name: card.name,
      lvText: card.max <= 90 ? (isNew ? 'UNLOCK' : `LV ${cur} → ${cur + 1}`) : 'SUPPLY',
      desc: card.desc(cur + 1),
      detail: card.kind === 'weapon' ? `${cur ? '현재: ' + this.weaponSummary(card.id) + ' → ' : ''}다음 단계: ${this.nextBenefit(card)}` : card.kind === 'passive' ? this.nextBenefit(card) : '',
      recipe: card.kind === 'weapon' ? this.evolutionRecipe(card.id) : EVOLUTIONS.filter((ev) => ev.needs === card.id).map((ev) => this.evolutionRecipe(ev.base)).join(' / '),
      cls: isNew ? 'r-weapon' : card.kind === 'weapon' ? 'r-upgrade' : card.kind === 'passive' ? 'r-passive' : 'r-weapon',
      route: card.route || null,
      pips,
      isNew,
      owned,
    };
  }
}

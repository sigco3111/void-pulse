// 星球规则是主客机共享的静态配置；网络只传已知 ID，不接受远端自定义数值。
export const PLANETS = [
  {
    id: 'station', name: '에너지 모항', code: '01 / NEXUS', color: '#61e7ff',
    biome: '궤도 시설 · 균형 전장', perk: '표준 기체 · 추가 보정 없음',
    threat: '혼합 스웜 · 단발 슈터 · 주기적 방전',
    tactics: '엄폐물과 원자로를 익히기 좋은 첫 출격지.',
    floor: null, tint: 0x8399b0, background: 0x05060f, fog: 0x070a18,
    accent: 0x55eaff, layout: 0, player: {}, regen: 0,
    roster: null, unlocks: {}, shot: 'single', summons: ['chaser', 'speeder'],
    hazard: { name: '에너지 방전', first: 75, every: 90, damage: 7, slow: 0.68, color: 0xff355d },
  },
  {
    id: 'cryo', name: '서리고리', code: '02 / BOREAL', color: '#9cdfff',
    biome: '빙결 위성 · 기동 시련', perk: '이동 속도 +12% · 대시 쿨다운 −20%',
    threat: '질주자 / 헌터 / 고드름 슈터 · 3방향 탄막',
    tactics: '대시로 고드름 사이를 통과하고 강력한 감속 한파를 피하세요.',
    floor: 'cryogenic-ground-v1.jpg', tint: 0x91a8bd, background: 0x07111e, fog: 0x102337,
    accent: 0x8bdfff, layout: 0.3, player: { speedMul: 1.12, dashCd: 0.8 }, regen: 0,
    roster: [['chaser', 65], ['speeder', 85], ['shooter', 46], ['hunter', 40], ['tank', 12]],
    unlocks: { speeder: 10, shooter: 32, hunter: 75, tank: 120 },
    shot: 'fan', summons: ['speeder', 'hunter'],
    hazard: { name: '극지 한파', first: 60, every: 82, damage: 4, slow: 0.45, color: 0x65c9ff },
  },
  {
    id: 'volcanic', name: '용핵', code: '03 / CINDER', color: '#ffab69',
    biome: '현무암 황야 · 폭파 시련', perk: '무기 피해 +18% · 최대 체력 +10',
    threat: '자폭 벌 / 중장전차 / 용암 슈터 · 원형 파편',
    tactics: '거리를 두고 벌 떼를 폭파하세요. 분출 사이 틈에 중앙을 지나고, 경고가 보이면 먼저 오라에서 나오세요.',
    floor: 'volcanic-ground-v1.jpg', tint: 0xc7a396, background: 0x180a0a, fog: 0x2b1415,
    accent: 0xff985c, layout: -0.25, player: { dmgMul: 1.18, maxHp: 1.1 }, regen: 0,
    roster: [['chaser', 75], ['bomber', 74], ['tank', 36], ['shooter', 32], ['speeder', 20]],
    unlocks: { bomber: 18, tank: 60, shooter: 40, speeder: 90 },
    shot: 'heavy', summons: ['bomber', 'tank'],
    hazard: { name: '용암 분출', first: 65, every: 88, damage: 10, slow: 0.85, color: 0xff582f },
  },
  {
    id: 'mycelium', name: '포자림', code: '04 / VERDANT', color: '#99f5a2',
    biome: '균사 밀림 · 공간 장악 시련', perk: '초당 0.6 HP 회복 · 획득 범위 +25%',
    threat: '분열체 / 그물술사 / 포자 슈터 · 독성 구역 봉쇄',
    tactics: '그물술사를 먼저 처치하세요. 경고 테두리가 있는 포자 구역은 지속 피해를 줍니다.',
    floor: 'mycelium-ground-v1.jpg', tint: 0x8eab9a, background: 0x07120e, fog: 0x10281c,
    accent: 0x9aef92, layout: 0.65, player: { magnet: 1.25 }, regen: 0.6,
    roster: [['chaser', 65], ['splitter', 75], ['weaver', 45], ['shooter', 25], ['speeder', 24]],
    unlocks: { splitter: 14, weaver: 42, shooter: 65, speeder: 100 },
    shot: 'spore', summons: ['splitter', 'weaver'],
    hazard: { name: '포자 파도', first: 70, every: 85, damage: 6, slow: 0.6, color: 0x8fdb55 },
  },
];

export function isPlanetId(id) { return PLANETS.some((p) => p.id === id); }
export function getPlanet(id) { return PLANETS.find((p) => p.id === id) || PLANETS[0]; }
export function applyPlanetStats(stats, planet) {
  // 仅在 Player.reset 后调用，重开/重生不会反复叠加。
  for (const [key, multiplier] of Object.entries(planet.player)) stats[key] *= multiplier;
  stats.maxHp = Math.round(stats.maxHp);
  stats.hp = stats.maxHp;
}

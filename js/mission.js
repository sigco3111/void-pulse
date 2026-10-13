export const MISSION = Object.freeze({ seconds: 600, captures: 3 });
export function missionComplete(time, captures, endless = false) {
  return !endless && time >= MISSION.seconds && captures >= MISSION.captures;
}
export const DAMAGE_NAMES = Object.freeze({
  blaster: '펄스 건', blades: '오르빗 블레이드', missiles: '추적 미사일', tesla: '테슬라 아크',
  nova: '노바 버스트', fling: '블레이드 스톰', storm: '뇌옥', burn: '점화',
  pulse: '오버드라이브 충격', ult: '소멸 프로토콜', route: '계열 각성', chain: '연쇄 반응', direct: '기타 피해',
});
export const ENEMY_NAMES = Object.freeze({
  chaser: '추격자', speeder: '질주자', splitter: '분열체', mini: '유체', shooter: '슈터',
  tank: '중장전차', bomber: '자폭 벌', hunter: '헌터', weaver: '그물술사', boss: '보이드 오버로드',
});

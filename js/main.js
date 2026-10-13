// ============ 启动入口 ============
import { Game } from './game.js';

const container = document.getElementById('app');
try {
  new Game(container);
} catch (err) {
  // WebGL 不可用等致命错误的兜底提示
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#ff6b81;font-family:monospace;font-size:16px;text-align:center;padding:20px;z-index:99;background:#05060f';
  div.textContent = '초기화 실패: ' + err.message + '(WebGL2 지원 브라우저가 필요합니다)';
  document.body.appendChild(div);
  console.error(err);
}

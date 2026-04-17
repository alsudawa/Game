# Sky Bounce - CLAUDE.md

## Project Overview
Sky Bounce는 모바일 원탭 하이퍼캐주얼 아케이드 게임. HTML5 Canvas + 순수 JavaScript, 외부 의존성 0, 에셋 파일 0 (모든 그래픽/오디오 프로시저럴).

## Tech Stack
- Vanilla JS (ES5), Canvas 2D, Web Audio API, localStorage, Service Worker (PWA)
- Global namespace `window.SB` 패턴 (file:// 호환)
- 빌드 도구 없음, 프레임워크 없음

## Branch
- 개발 브랜치: `claude/casual-game-design-FI7fN`
- 커밋 형식: `feat: Sprint N - feature1, feature2, ...`

## Architecture Rules
- **Object pooling 필수** — 게임플레이 루프에서 할당 금지 (GC 방지)
- **Fixed timestep** — 16.67ms tick, accumulator 패턴
- **Ring buffer** — ball trail은 고정 크기 링 버퍼
- **Swap-and-pop** — 배열 정리 시 splice 대신 writeIdx 패턴
- **Gradient caching** — 배경 그라디언트는 quantized difficulty key로 캐시
- **devicePixelRatio** — ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

## File Structure
```
js/main.js       → 부트스트랩, 게임루프, 리사이즈
js/game.js       → 핵심 오케스트레이터 (~1400줄), 상태머신
js/ui.js         → 모든 UI 렌더링 (~1290줄)
js/ball.js       → 공 물리 + 렌더링
js/obstacle.js   → 6종 장애물 + 풀
js/collectible.js → 별/코인 + 풀
js/powerup.js    → 4종 파워업 + 이펙트
js/spawner.js    → 스폰 시스템, 난이도 곡선, 패턴
js/particles.js  → 파티클 시스템 + 20개 프리셋
js/background.js → 배경 (하늘, 별, 구름, 패럴랙스)
js/audio.js      → Web Audio 오실레이터 사운드
js/utils.js      → 헬퍼 (clamp, lerp, collision 등)
js/physics.js    → 물리 상수
js/storage.js    → localStorage 래퍼
js/input.js      → 터치/마우스 입력
js/achievements.js → 24개 업적
js/progression.js  → XP/레벨
js/skins.js      → 8개 스킨
```

## Game Content Summary
- 장애물: Platform, Spike, Blade, Boomerang, Laser, Gravity Well
- 파워업: Shield, Magnet, Slow, Score_Mult
- 스폰 패턴: 11종 (Platform, Spike, Blade, Boomerang, Laser, Squeeze, Wave, Pincer, Corridor, Spiral, GravityWell)
- 업적: 24개, 스킨: 8개 (레벨 해금)
- 상태: START → PLAYING → PAUSED → REVIVE → GAME_OVER

## Sprint Methodology
- 스프린트당 4-5개 피처 구현
- 모든 수정 파일 `node -c` 문법 검사
- 커밋 후 push
- 현재까지: 131 스프린트, 146 커밋, 9,969줄

## Key Conventions
- `SB.frameTime` — RAF 타임스탬프 (매 프레임 캐시)
- `SB.canvasWidth/Height` — 캔버스 논리 크기
- `SB.reducedMotion` — prefers-reduced-motion 대응
- `SB.highContrast` — 고대비 모드
- `SB.TAU` — Math.PI * 2
- `SB.FX.*` — 파티클 프리셋 (particles.js에 정의)

## Common Pitfalls
- obstacle.js에서 `this.wellPhase = 0;`이 constructor와 init에 둘 다 있음 — 편집 시 컨텍스트 충분히 제공
- game.js에서 동일 패턴이 여러 번 등장 (예: `if (this.powerupEffects.magnet)`) — 편집 시 주변 코드로 유니크하게 식별
- hexToRGB: hex 컬러를 rgba로 변환할 때 `SB.hexToRGB()` 사용 (replace 패턴 사용 금지)
- 커밋 서명은 `alsudawa/game` 레포에서만 동작

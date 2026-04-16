# Sky Bounce - Technical Architecture

## Technology Stack

- **Rendering:** HTML5 Canvas 2D API
- **Language:** Vanilla JavaScript (ES5 compatible)
- **Audio:** Web Audio API (oscillator-based synthesis)
- **Storage:** localStorage
- **Offline:** Service Worker (cache v6)
- **PWA:** Web App Manifest (fullscreen, portrait orientation)
- **Build tools:** None — zero dependencies, runs from `file://`

## File Structure

```
/Game/
├── index.html           # Entry point, viewport meta, canvas, script loading
├── manifest.json        # PWA configuration
├── sw.js                # Service worker for offline caching (v6)
├── css/
│   └── style.css        # Fullscreen canvas, scroll prevention, orientation lock
└── js/
    ├── utils.js         # Helpers: clamp, lerp, randRange, collision, easing, hexToRGB
    ├── physics.js       # Physics constants (gravity, bounce, max speed)
    ├── audio.js         # Web Audio API sound synthesis (~520 lines)
    ├── storage.js       # localStorage read/write for all persistent data
    ├── input.js         # Touch + mouse tap detection, button hit testing
    ├── ball.js          # Ball entity: physics, trail ring buffer, rendering (~180 lines)
    ├── obstacle.js      # 6 obstacle types + object pool (~520 lines)
    ├── collectible.js   # Star/Coin collectibles + object pool (~242 lines)
    ├── powerup.js       # 4 powerup types + effects + pool
    ├── spawner.js       # Spawn system: difficulty curve, patterns, timing (~430 lines)
    ├── particles.js     # Particle system + 20 presets (~340 lines)
    ├── background.js    # Sky gradient, stars, clouds, parallax (~286 lines)
    ├── ui.js            # All UI: start, HUD, game over, popups (~1290 lines)
    ├── game.js          # Game orchestrator: state machine, update/render (~1400 lines)
    ├── main.js          # Bootstrap: canvas setup, resize, DPR, game loop (~87 lines)
    ├── achievements.js  # 24 achievements with stat tracking
    ├── progression.js   # XP/level system
    └── skins.js         # 8 ball skins with level unlocking
```

**Total: ~6,477 lines of JavaScript across 18 files**

## Global Namespace Pattern

All modules use `window.SB` (Sky Bounce) as a global namespace:

```javascript
window.SB = window.SB || {};
SB.Ball = function() { ... };
SB.Ball.prototype.update = function(dt) { ... };
```

This ensures compatibility with `file://` protocol (no module loader needed) and avoids CORS issues.

## Core Patterns

### Fixed Timestep Game Loop
```
TICK_RATE = 1000/60 (16.67ms per frame)
accumulator pattern → consistent physics on 60/90/120Hz displays
delta capped at 100ms to prevent tunneling after tab switch
```

### Object Pooling
Pre-allocated pools for GC-free hot paths:
- **ObstaclePool:** 30 pre-allocated obstacles
- **CollectiblePool:** 15 pre-allocated collectibles
- **PowerupPool:** 5 pre-allocated powerups
- **ParticleSystem:** 200 pre-allocated particles

### Ring Buffer Trail
Ball trail uses fixed-size ring buffer (14 slots) with head pointer — zero allocation, zero GC pressure during gameplay.

### Swap-and-Pop Array Cleanup
Active entity lists use write-index pattern instead of `splice()`:
```javascript
var writeIdx = 0;
for (var i = 0; i < array.length; i++) {
    if (array[i].alive) array[writeIdx++] = array[i];
}
array.length = writeIdx;
```

### Gradient Caching
Background gradient cached with quantized difficulty key (50 steps). Only rebuilt when difficulty bucket or canvas height changes.

### devicePixelRatio
Canvas internal resolution scaled by DPR via `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` for crisp rendering on retina displays.

## Rendering Pipeline (per frame)

1. **Background:** Gradient sky → stars (parallax) → clouds (parallax) → particles → shooting stars → speed lines → aurora
2. **Vignette:** Radial gradient darkening corners
3. **Camera parallax:** World objects shifted opposite to ball offset
4. **Obstacles:** With fade-in (spawnAge), danger glow, high-contrast outlines
5. **Collectibles:** With magnet lines, sparkle effects
6. **Powerups:** With pulsing glow
7. **Speed lines:** When ball falls fast
8. **Trajectory preview:** Dotted arc showing predicted path
9. **Death slow-mo vignette:** During death sequence
10. **Ball:** Trail → body (with squash/stretch/gravity distortion) → drop shadow
11. **Wall edge flash:** On wall bounce
12. **Particles:** All active particles
13. **Shield effect:** Rotating hexagonal segments
14. **Magnet effect:** Pulsing radius ring + converging dots
15. **Powerup timer arcs:** Around ball showing remaining duration
16. **Combo timer bar:** Below ball
17. **HUD:** Score, coins, high score, zone, combo popups, score popups
18. **Overlays:** Danger tint, zone glow, slow-mo tint
19. **Edge warnings:** Arrows for off-screen obstacles
20. **Screen flash:** White overlay
21. **Transition fade:** Black overlay

## Audio Architecture

All sounds are synthesized in real-time using Web Audio API oscillators:
- **No audio files** — zero loading time
- **Oscillator types:** sine, square, triangle, sawtooth
- **Effects:** Frequency ramps, gain envelopes, detune for harmony
- **BGM:** Chord progression changes by zone, volume scales 0.05→0.08 with difficulty
- **Sounds:** bounce, collect, combo, wall hit, near miss, death, milestone, zone warning, powerup pickup (4 unique), powerup expiry, shield break, coin collect, perfect bounce, score tick, level up, revive

## Accessibility

- **Reduced motion:** `prefers-reduced-motion: reduce` → disables screen shake, reduces particle count to 30%
- **High contrast mode:** Toggle in UI → thick outlines on ball/obstacles, yellow laser centers, enhanced visibility
- **Orientation lock:** Portrait-only with landscape warning overlay

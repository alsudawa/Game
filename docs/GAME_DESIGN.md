# Sky Bounce - Game Design Document

## Core Concept

One-tap arcade game where a ball bounces upward on tap, avoiding obstacles and collecting stars. Simple input (tap anywhere) with deep emergent gameplay through difficulty scaling, combo systems, and powerup synergies.

## Game States

```
START → (tap) → PLAYING → (death) → REVIVE → (tap/timeout) → GAME_OVER → (tap) → START
                    ↓                                              ↑
                 PAUSED ──────────────(quit)───────────────────────→
```

- **START:** Title screen, skin selector, achievement viewer, daily challenge display
- **PLAYING:** Active gameplay with HUD
- **PAUSED:** Overlay with Resume/Quit buttons
- **REVIVE:** 3-second countdown, costs 20 coins (one-time per run)
- **GAME_OVER:** Score display, XP result, stats, play again button

## Physics

| Constant | Value | Purpose |
|----------|-------|--------|
| GRAVITY | 22 | Downward acceleration per frame |
| BOUNCE_IMPULSE | -520 | Upward velocity on tap |
| MAX_FALL_SPEED | 720 | Terminal velocity cap |
| AIR_RESISTANCE | 0.99 | Horizontal velocity decay |
| HORIZONTAL_KICK | 280 | Lateral push from off-center taps |

### Ball Behavior
- **Tap:** Sets vy to BOUNCE_IMPULSE (not additive)
- **Directional steering:** Tap left/right of center to push ball horizontally
- **Wall bounce:** Reflects with 0.5x velocity damping
- **Ceiling bounce:** Reflects with 0.3x velocity damping
- **Double-tap:** Within 180ms, 1.25x bounce impulse + visual effects
- **Perfect bounce:** Ball falling fast (>65% max speed) + in bottom 60% of screen = +3 points

## Scoring System

| Source | Points | Condition |
|--------|--------|----------|
| Survival | 1-3/sec | Scales with difficulty |
| Star collection | 5 | Base value |
| Coin collection | 3 | Base value |
| Combo (2x) | 2x multiplier | 2 collectibles within 2 seconds |
| Combo (3x) | 3x multiplier | 3 consecutive |
| Combo (5x) | 4x multiplier | 5+ consecutive |
| Perfect bounce | +3 | High-speed + low-position tap |
| Power bounce | +2 | Double-tap within 180ms |
| Near-miss | 2 x streak | Pass within 8px of obstacle |
| Wall bounce streak | streak count | 3+ wall bounces in 1.5s |
| Score multiplier powerup | 2x all | 6-second duration |

### Milestones
- Celebrations at 25, 50, 100, 200 points (fireworks, screen flash)
- Zone transitions: CALM(0) → RISING(15) → INTENSE(25) → EXTREME(50)
- Mid-game PB notification when current score exceeds stored high score

## Difficulty Curve

```
difficulty = min(score / 50, 1.0)
extraDifficulty = max(0, min((score-50)/150, 1.0))
```

| Parameter | Easy (d=0) | Hard (d=1) |
|-----------|-----------|------------|
| Spawn interval | 1.8s | 0.45s |
| Speed multiplier | 1.0x | 3.5x |
| Obstacle variety | Platforms only | All 6 types + patterns |
| Background | Deep navy | Blood red → purple |
| BGM volume | 0.05 | 0.08 |

### Grace Period
- 2.0 seconds at start (reduced for veteran players)
- Shows countdown: 3, 2, 1, GO!
- No obstacles spawn during grace

## Zones

| Zone | Score Threshold | Sky Color | Trail Color | Audio |
|------|----------------|-----------|-------------|-------|
| CALM | 0 | Deep navy blue | Skin default | Quiet |
| RISING | 15 | Sunset orange | Orange tint | Warning tone |
| INTENSE | 25 | Blood red | Red tint | Intense warning |
| EXTREME | 50 | Deep purple | Purple tint | Maximum warning + aurora borealis |

## Controls

- **Tap anywhere:** Bounce ball upward
- **Tap left/right:** Steer ball horizontally
- **Double-tap (180ms):** Power bounce (1.25x)
- **Tap skin icons:** Select ball skin (start screen)
- **Tap achievement icon:** Open achievement viewer
- **Tap mute icon:** Toggle audio
- **Tap pause icon:** Pause game
- **Tap HC icon:** Toggle high contrast mode

# Sky Bounce - Content Catalog

## Obstacle Types (6)

| Type | Shape | Behavior | Appears At | Danger |
|------|-------|----------|-----------|--------|
| Platform | Horizontal bar (60-120px) | Moves left/right, optional vertical oscillation | Score 0+ | Collision = death |
| Spike | Triangle (16-28px) | Moves horizontally | Score 15+ (d>=0.15) | Collision = death |
| Blade | Rotating circle (18px radius) | Spins while moving horizontally | Score ~22+ (d>=0.45) | Collision = death |
| Boomerang | Rotating circle (18px) | Travels outward, then returns | Score ~22+ (d>=0.45) | Collision = death |
| Laser | Horizontal beam (full width) | Warning phase (1.5s) then Active beam (1.5s) | Score ~22+ (d>=0.45) | Active beam = death |
| Gravity Well | Purple vortex (80px pull radius) | Pulls ball toward center, no direct collision | Score 50+ (extraDiff>0.1) | Indirect (pulls into obstacles) |

### Visual Features
- **Fade-in:** 0.3s opacity transition on spawn
- **Swoosh:** Slide-in offset with easeOut during fade-in
- **Danger glow:** Red pulsing radial gradient when ball is within 60px
- **High contrast:** Thick white outlines, yellow laser center stripe

## Spawn Patterns (11)

| Pattern | Description | Requirement |
|---------|-------------|-------------|
| Platform | Single moving platform | Always |
| Spike | Single moving spike | d >= 0.15 |
| Blade | Rotating blade | d >= 0.45 |
| Boomerang | Returning projectile | d >= 0.45 |
| Laser | Full-width beam with warning | d >= 0.45 |
| Squeeze | Gap in center between two platforms | d >= 0.45 |
| Wave | 3 staggered spikes | d >= 0.45 |
| Pincer | Two converging platforms | d >= 0.45 |
| Corridor | Vertical narrowing passage | extraDiff > 0.05 |
| Spiral | 4 spikes in circular formation + center reward | extraDiff > 0.2 |
| Gravity Well | Pulling vortex | extraDiff > 0.1 |

## Collectible Types (2)

### Star
- **Points:** 5 (base, before combo/multiplier)
- **Coins:** 1
- **Visual:** 5-pointed gold star with gradient, sparkle particles
- **Animation:** Rotating, pulsing, vertical bobbing (sine wave)
- **Spawn interval:** 3.0 seconds

### Coin
- **Points:** 3 (base)
- **Coins:** 2
- **Visual:** Gold circle with 3D spin effect, dollar sign
- **Animation:** Horizontal movement with sine wave oscillation
- **Spawn interval:** 8.0 to 4.5s (scales with difficulty)
- **Appears at:** Score 10+

## Powerup Types (4)

| Type | Color | Duration | Effect | Visual |
|------|-------|----------|--------|--------|
| Shield | Blue (#5DADE2) | 5.0s | Absorbs one hit, destroys obstacle | Rotating hexagonal segments around ball |
| Magnet | Purple (#AF7AC5) | 4.0s | Attracts collectibles within 120px | Pulsing radius ring + converging dots + dashed lines |
| Slow | Green (#58D68D) | 3.0s | Obstacles move at 0.4x speed | Green screen overlay pulse |
| Score Mult | Gold (#FFD54F) | 6.0s | 2x all score gains | x2 badge on HUD with countdown |

- **Spawn interval:** 15 to 8s (scales with difficulty)
- **Appears at:** difficulty > 0.1
- **Timer arcs:** Displayed as colored arcs around ball showing remaining duration
- **Expiry warning:** Audio beep at 2 seconds remaining

## Skins (8)

| ID | Name | Core | Glow | Unlock Level |
|----|------|------|------|--------------|
| default | Classic | #FFFFFF | #FFD700 | 0 |
| fire | Fire | #FFEB3B | #FF5722 | 3 |
| ice | Ice | #E0F7FA | #00BCD4 | 5 |
| neon | Neon | #E8F5E9 | #76FF03 | 8 |
| phantom | Phantom | #E1BEE7 | #9C27B0 | 12 |
| solar | Solar | #FFF9C4 | #FF9800 | 15 |
| ocean | Ocean | #E0F7FA | #006064 | 20 |
| galaxy | Galaxy | #F3E5F5 | #E91E63 | 25 |

## Achievements (24)

| Name | Condition |
|------|-----------|
| First Bounce | 1 bounce |
| Sky Walker | Score 25 |
| Astronaut | Score 50 |
| Star Hunter | 10 stars in one run |
| Star Master | 50 stars total |
| Star Collector | 200 stars total |
| Combo King | 5x combo |
| Combo Master | 8x combo |
| Survivor | 30 seconds survived |
| Marathon | 120 seconds survived |
| Close Call | 1 near miss |
| Daredevil | 5 near misses total |
| Power Player | 5 powerups collected |
| Dedicated | 10 games played |
| Veteran | 50 games played |
| Legend | Score 100 |
| Endurance | 60 seconds survived |
| Bouncy | 100 bounces |
| Wall Rider | 20 wall bounces |
| Double Trouble | 10 double-tap bounces |
| Coin Hoarder | 100 coins earned |
| Into the Void | 1 gravity well survived |
| Perfectionist | 10 perfect bounces |

## Particle Effect Presets (20)

| Preset | Count | Use Case |
|--------|-------|----------|
| starCollect | 12 | Star pickup burst |
| coinCollect | 8 | Coin pickup burst |
| bounce | 5 | Regular bounce puff |
| bounceDust | 4 | Dust on heavy bounce |
| powerBounce | 8 | Double-tap bounce |
| deathExplosion | 28 | Ball death |
| shieldBreak | 16 | Shield absorb hit |
| comboExplosion | 18 | 5+ combo burst |
| milestoneFirework | 12 | Left-side firework |
| milestoneFireworkR | 12 | Right-side firework |
| milestoneFireworkDown | 10 | Top-down firework |
| reviveBurst | 20 | Revive effect |
| wallSparkLeft | 6 | Left wall bounce sparks |
| wallSparkRight | 6 | Right wall bounce sparks |
| powerupShield | 14 | Shield pickup |
| powerupMagnet | 14 | Magnet pickup |
| powerupSlow | 14 | Slow pickup |
| powerupScoreMult | 14 | Score mult pickup |

## Background Elements

- **Sky gradient:** Zone-based 4-stage color transition (navy to orange to red to purple)
- **Stars:** 40 twinkling stars with parallax offset (-2px based on ball position)
- **Clouds:** 7 drifting cloud ellipses with parallax (-5px)
- **Floating particles:** 15 drifting particles with sine wave alpha
- **Shooting stars:** Gradient trail + bright head dot (at difficulty > 0.3)
- **Speed lines:** Vertical streaks (at difficulty > 0.4)
- **Aurora borealis:** 3 colored curtains (at difficulty > 0.8, EXTREME zone only)

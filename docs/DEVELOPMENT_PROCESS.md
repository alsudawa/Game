# Sky Bounce - Development Process

## Methodology: Autonomous Sprint Cycle

### Sprint Structure
Each sprint follows a fixed cycle:
1. **Plan:** Select 4-5 features based on review panel feedback and game maturity
2. **Implement:** Code all features sequentially
3. **Validate:** Run `node -c` syntax checks on all modified files
4. **Commit:** Single commit per sprint with descriptive message listing all features
5. **Push:** Push to feature branch
6. **Review:** Virtual review panel evaluates the sprint

### Review Panel
After each sprint, a 4-person virtual review panel provides feedback:

| Role | Focus Area |
|------|------------|
| **Tester** | Bugs, edge cases, crash scenarios, input handling |
| **Game Designer** | Balance, difficulty curve, reward pacing, fun factor |
| **Casual Player** | Intuitiveness, visual clarity, satisfaction, confusion |
| **Senior Dev** | Performance, code quality, architecture, maintainability |

Each reviewer scores the sprint (1-5 stars) and provides specific feedback that informs the next sprint's feature selection.

### Standing Instruction
Sprint continuously without asking, until rate limit.

## Branch Strategy
- **Feature branch:** `claude/casual-game-design-FI7fN`
- **All development** happens on this branch
- **Commits** use conventional commit format: `feat: Sprint N - feature1, feature2, ...`

## Quality Gates

### Per-Sprint
- `node -c` syntax check on every modified `.js` file
- No external dependencies added
- No breaking changes to existing features
- Zero-allocation hot paths maintained (object pooling, ring buffers)

### Design Principles
1. **Zero assets:** All graphics + audio procedurally generated
2. **Instant load:** No loading screens, no network requests for gameplay
3. **Mobile-first:** Touch-optimized, portrait orientation, 60fps target
4. **Progressive enhancement:** Graceful degradation (vibration API, reduced motion, high contrast)
5. **Object pooling:** No allocation in gameplay loops
6. **Fixed timestep:** Consistent physics across all refresh rates

## Evolution Phases

### Phase 1: Core Gameplay (Sprints 0-6)
Foundation: ball physics, obstacles, collectibles, scoring, state machine, basic UI

### Phase 2: Content Expansion (Sprints 7-15)
New obstacle types, powerups, coins, revive, achievements, skins, progression, PWA

### Phase 3: Game Feel (Sprints 16-30)
Squash/stretch, screen shake, particles, combos, near-misses, perfect bounces, slow-mo death, trajectory preview

### Phase 4: Visual Polish (Sprints 31-40)
Background parallax, zone sky colors, milestone fireworks, powerup visuals, edge warnings, gradient caching, ring buffer optimization

### Phase 5: Immersion & Feedback (Sprints 41-52)
Tap ripples, obstacle fade-in, danger glow, double-tap power bounce, adaptive HUD, accessibility (reduced motion, high contrast), dynamic trail, combo bar, wall sparks, score shake

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Vanilla JS over framework | Zero build step, file:// compatible, minimal overhead |
| Global namespace over modules | CORS-free, works without server, simple dependency order |
| Object pools over dynamic allocation | 60fps on mobile requires zero GC pauses |
| Ring buffer for trail | Fixed memory, no array shifting |
| Quantized gradient cache | Avoid rebuilding gradient every frame |
| Web Audio oscillators over audio files | Zero loading, instant playback, dynamic parameters |
| Canvas 2D over WebGL | Simpler API, sufficient for 2D game, broader compatibility |
| Fixed timestep over variable dt | Deterministic physics regardless of display refresh rate |
| localStorage over IndexedDB | Simpler API, sufficient for small data, synchronous access |
| Service worker caching | Offline play support for PWA |

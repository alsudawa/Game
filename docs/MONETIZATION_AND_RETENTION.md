# Sky Bounce - Monetization & Retention Systems

## Economy

### Currency: Coins
- **Earn sources:**
  - Star collection: 1 coin per star
  - Coin collectible pickup: 2 coins per coin
  - Run floor bonus: minimum 3 coins per run (guaranteed)
- **Spend:**
  - Revive: 20 coins (one-time per run)

### Revive System
- **Cost:** 20 coins
- **Limit:** Once per run
- **Mechanic:** 3-second countdown timer, tap revive button or tap elsewhere to skip
- **On revive:**
  - Ball resets to 40% screen height
  - 3 seconds of invincibility (ball blinks)
  - Nearby obstacles (within 150px) are cleared
  - Burst particle effect
- **Design intent:** Gives players agency over spending, creates "one more chance" moment

## Progression System

### XP & Levels
- **XP earned per run:** Based on score + stars collected
- **Level-up:** XP thresholds increase per level
- **Rewards:** Skin unlocks at levels 3, 5, 8, 12, 15, 20, 25
- **Veteran bonus:** Experienced players (totalGames/15, max 0.2) get reduced grace period for faster starts

### Daily Challenge
- **Daily modifiers:** Randomized per day (gravity changes, ball size, obstacle speed/size, star value)
- **Bonus XP:** Awarded on daily challenge completion
- **Displayed on:** Start screen

### Play Streak
- **Tracking:** Consecutive days played
- **Stored:** Current streak, best streak, last play date
- **Displayed on:** Game over screen

## Retention Features

### Achievement System (24 achievements)
- **Categories:** Scoring, collection, survival, skill, dedication
- **Notifications:** Toast popups on unlock during game over
- **Viewer:** Scrollable achievement list from start screen
- **Progress tracking:** Stats accumulated across all runs

### Skin Collection (8 skins)
- **Unlock mechanism:** Level-gated (levels 0-25)
- **Visual impact:** Changes ball core color, glow color, trail color
- **Selection:** Tap skin icons on start screen
- **Locked feedback:** "Need Lv.X" message on locked skin tap

### Score Systems
- **High score:** Persistent best score
- **Leaderboard:** Top 10 scores with timestamps (local)
- **Recent runs:** Last 5 scores (for trend tracking)
- **Lifetime stats:** Total games, total coins, total score
- **Last run summary:** Score, stars, time, coins

### Feedback Loops
- **Mid-game PB flash:** "NEW PB!" notification when current score exceeds stored high score
- **Zone transitions:** Visual + audio + text announcement ("RISING ZONE")
- **Milestone celebrations:** Fireworks at 25/50/100/200 points
- **Combo system:** Escalating visual/audio feedback (popups, screen shake, explosions)
- **Near-miss rewards:** Bonus points + "DAREDEVIL" popup for close calls
- **Death cause display:** Shows what killed you ("Killed by: Spike")

### Session Design
- **Instant start:** No loading, no menus beyond start screen
- **Quick restart:** "Play Again" button on game over skips start screen
- **Short sessions:** Average run ~30-90 seconds
- **Game over cooldown:** 0.8s prevents accidental restarts
- **Tips rotation:** 10 gameplay tips cycle every 4s on start screen

## localStorage Keys

| Key | Type | Content |
|-----|------|--------|
| skyBounce_highScore | int | All-time high score |
| skyBounce_leaderboard | JSON[] | Top 10 {score, timestamp} |
| skyBounce_coins | int | Current coin balance |
| skyBounce_streak | JSON | {current, best, lastDay} |
| skyBounce_recentRuns | JSON[] | Last 5 scores |
| skyBounce_lifetime | JSON | {totalGames, totalCoins, totalScore} |
| skyBounce_lastRun | JSON | {score, stars, time, coins} |
| skyBounce_hc | string | High contrast mode (1/0) |
| skyBounce_achievements | JSON | {unlocked: [], stats: {}} |
| skyBounce_skin | string | Selected skin ID |
| skyBounce_progression | JSON | {xp, level} |

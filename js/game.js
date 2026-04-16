window.SB = window.SB || {};

SB.STATES = {
    START: 'start',
    PLAYING: 'playing',
    PAUSED: 'paused',
    REVIVE: 'revive',
    GAME_OVER: 'game_over'
};

SB.ZONES = {
    CALM: { name: 'CALM', threshold: 0 },
    RISING: { name: 'RISING', threshold: 15 },
    INTENSE: { name: 'INTENSE', threshold: 25 },
    EXTREME: { name: 'EXTREME', threshold: 50 }
};

SB.Game = function(canvas) {
    this.canvas = canvas;
    this.state = SB.STATES.START;
    this.ball = new SB.Ball();
    this.obstaclePool = new SB.ObstaclePool(30);
    this.collectiblePool = new SB.CollectiblePool(15);
    this.powerupPool = new SB.PowerupPool(5);
    this.powerupEffects = new SB.PowerupEffects();
    this.spawner = new SB.Spawner(this.obstaclePool, this.collectiblePool, this.powerupPool);
    this.background = new SB.Background();
    this.ui = new SB.UI();
    this.input = new SB.Input(canvas);
    this.achievements = new SB.AchievementManager();
    this.progression = new SB.Progression();
    this.skinManager = new SB.SkinManager();
    this.daily = new SB.DailyChallenge();
    this.particles = new SB.ParticleSystem(200);
    this.score = 0;
    this.dailyStarMult = 1;
    this.scoreTimer = 0;
    this.highScore = 0;
    this.isNewHigh = false;
    this.gameOverCooldown = 0;
    this.gameOverCooldownTime = 0.8;
    this.lastMilestone = 0;
    this.screenShake = 0;
    this.screenShakeIntensity = 0;
    this.screenFlash = 0;
    this.comboTimer = 0;
    this.comboCount = 0;
    this.runStars = 0;
    this.showTutorial = false;
    this.showAchievementViewer = false;
    this.tutorialTimer = 0;
    this.tutorialStep = 0;
    this.xpResult = null;
    this.transitionAlpha = 0;
    this.runMaxCombo = 0;
    this.runSurviveTime = 0;
    this.revived = false;
    this.reviveCountdown = 0;
    this.invincibleTimer = 0;
    this.currentZone = SB.ZONES.CALM;
    this.runCoins = 0;
    this.deathSlowMo = 0;
    this.deathPending = null; // stores death context during slow-mo
    this.hudCoins = 0; // cached for HUD (avoid localStorage reads per frame)
    this.hudHighScore = 0;

    SB.REVIVE_COST = 20;
};

SB.Game.prototype.init = function() {
    this.highScore = SB.Storage.getHighScore();
    this.hudCoins = SB.Storage.getCoins();
    this.hudHighScore = this.highScore;
    this.background.init(SB.canvasWidth, SB.canvasHeight);
    this.ball.reset(SB.canvasWidth, SB.canvasHeight);
    this._applySkin();
    // Show tutorial on first play
    this.showTutorial = (this.achievements.stats.totalGames === 0);
};

SB.Game.prototype._applySkin = function() {
    var skin = this.skinManager.getCurrentSkin();
    this.ball.coreColor = skin.core;
    this.ball.glowColor = skin.glow;
    this.ball.trailColor = skin.trail;
};

SB.Game.prototype.onResize = function(cw, ch) {
    this.background.init(cw, ch);
    if (this.ball) {
        this.ball.x = SB.clamp(this.ball.x, this.ball.radius, cw - this.ball.radius);
        this.ball.y = SB.clamp(this.ball.y, this.ball.radius, ch - this.ball.radius);
    }
};

SB.Game.prototype.update = function(dt) {
    this.ui.update(dt, this.state, this.powerupEffects, this.comboCount, this.comboTimer);
    this.background.update(dt, this.state === SB.STATES.PLAYING ? this.spawner.difficulty : 0);

    if (this.screenShake > 0) this.screenShake -= dt;
    if (this.screenFlash > 0) this.screenFlash -= dt;
    if (this.transitionAlpha > 0) this.transitionAlpha -= dt * 3;
    if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) this.comboCount = 0;
    }

    switch (this.state) {
        case SB.STATES.START:
            this._updateStart(dt);
            break;
        case SB.STATES.PLAYING:
            this._updatePlaying(dt);
            break;
        case SB.STATES.PAUSED:
            this._updatePaused(dt);
            break;
        case SB.STATES.REVIVE:
            this._updateRevive(dt);
            break;
        case SB.STATES.GAME_OVER:
            this._updateGameOver(dt);
            break;
    }
};

SB.Game.prototype._updateStart = function(dt) {
    // Achievement viewer toggle
    if (SB._achBtnTapped) {
        SB._achBtnTapped = null;
        this.showAchievementViewer = !this.showAchievementViewer;
        return;
    }
    // Dismiss achievement viewer
    if (this.showAchievementViewer) {
        if (this.input.consumeTap()) {
            this.showAchievementViewer = false;
        }
        return;
    }
    // Handle skin selection (set by input handler)
    if (SB._skinLocked) {
        this.ui.lockMsg = 'Need Lv.' + SB._skinLocked;
        this.ui.lockMsgTimer = 1.5;
        SB._skinLocked = null;
        return;
    }
    if (SB._skinTapped) {
        var skinId = SB._skinTapped;
        SB._skinTapped = null;
        this.skinManager.selectSkin(skinId);
        this._applySkin();
        return;
    }
    if (this.input.consumeTap()) {
        this._transitionTo(SB.STATES.PLAYING);
    }
};

SB.Game.prototype._updatePlaying = function(dt) {
    // Death slow-mo: heavily dilate time, then resolve
    if (this.deathSlowMo > 0) {
        this.deathSlowMo -= dt;
        if (this.deathSlowMo <= 0) {
            this._resolveDeathPending();
            return;
        }
        // 15% time speed during slow-mo, only update visuals
        var smDt = dt * 0.15;
        this.ball.update(smDt);
        this.particles.update(smDt);
        this.input.consumeTap(); // discard taps during slow-mo
        return;
    }

    // Check pause
    if (SB._pauseBtnTapped) {
        SB._pauseBtnTapped = null;
        this.state = SB.STATES.PAUSED;
        SB.audio.stopBGM();
        return;
    }

    var slowMult = this.powerupEffects.getSpeedMultiplier();

    // Multi-step tutorial
    if (this.showTutorial) {
        this.tutorialTimer += dt;
        if (this.input.consumeTap()) {
            this.ball.bounce(this.input.tapX);
            this.particles.emit(this.ball.x, this.ball.y + this.ball.radius, SB.FX.bounce);
            this.achievements.onBounce();
            SB.audio.playBounce();
            if (this.tutorialTimer > 0.4) {
                this.tutorialStep++;
                this.tutorialTimer = 0;
                if (this.tutorialStep >= 3) this.showTutorial = false;
            }
        }
    } else if (this.input.consumeTap()) {
        // Perfect bounce: ball falling fast + near bottom half of screen
        var isPerfect = this.ball.vy > SB.Physics.MAX_FALL_SPEED * 0.65 && this.ball.y > SB.canvasHeight * 0.6;
        this.ball.bounce(this.input.tapX);
        this.particles.emit(this.ball.x, this.ball.y + this.ball.radius, SB.FX.bounce);
        this.achievements.onBounce();
        if (isPerfect) {
            this.score += 3;
            this.ui.addScorePopup(this.ball.x, this.ball.y - 25, 'PERFECT +3', '#00FF88');
            SB.audio.playPerfectBounce();
            if (navigator.vibrate) navigator.vibrate(12);
        } else {
            SB.audio.playBounce();
        }
    }

    this.ball.update(dt);
    this.powerupEffects.update(dt);
    this.particles.update(dt);
    this.achievements.updateRunTime(dt);
    this.runSurviveTime += dt;

    // Invincibility countdown
    if (this.invincibleTimer > 0) {
        this.invincibleTimer -= dt;
        this.ball.blinking = true;
    } else {
        this.ball.blinking = false;
    }

    // Zone tracking
    this._updateZone();

    var cw = SB.canvasWidth;
    var ch = SB.canvasHeight;

    this.spawner.update(dt * slowMult, this.score, cw, ch);

    // --- Obstacles ---
    var obstacles = this.obstaclePool.getActive();
    var ballBounds = this.ball.getBounds();

    for (var i = obstacles.length - 1; i >= 0; i--) {
        var obs = obstacles[i];
        obs.update(dt * slowMult);

        if (obs.isOffScreen(cw, ch)) {
            obs.active = false;
            continue;
        }

        // Gravity well: apply pull force, no collision
        if (obs.type === SB.OBSTACLE_TYPES.GRAVITY_WELL) {
            var wcx = obs.x + obs.radius;
            var wcy = obs.y + obs.radius;
            var wdx = wcx - this.ball.x;
            var wdy = wcy - this.ball.y;
            var wdist = Math.sqrt(wdx * wdx + wdy * wdy);
            if (wdist < obs.pullRadius && wdist > 1) {
                var pullFactor = (1 - wdist / obs.pullRadius);
                var force = obs.pullStrength * pullFactor * pullFactor * dt;
                this.ball.vx += (wdx / wdist) * force;
                this.ball.vy += (wdy / wdist) * force;
            }
            continue;
        }

        var obsBounds = obs.getBounds();
        if (!obsBounds) continue;
        var hit = false;
        var isCircle = obs.type === SB.OBSTACLE_TYPES.BLADE || obs.type === SB.OBSTACLE_TYPES.BOOMERANG;
        if (isCircle) {
            hit = SB.circleCircleCollision(ballBounds, obsBounds);
        } else {
            hit = SB.circleRectCollision(ballBounds, obsBounds);
        }

        // Near-miss detection (within 8px margin, no invincibility)
        if (!hit && this.invincibleTimer <= 0 && !obs._nearMissed) {
            var nearDist = 8;
            var nearHit = false;
            if (isCircle) {
                var ndx = ballBounds.x - obsBounds.x;
                var ndy = ballBounds.y - obsBounds.y;
                nearHit = Math.sqrt(ndx * ndx + ndy * ndy) < ballBounds.radius + obsBounds.radius + nearDist;
            } else {
                var expanded = { x: obsBounds.x - nearDist, y: obsBounds.y - nearDist, width: obsBounds.width + nearDist * 2, height: obsBounds.height + nearDist * 2 };
                nearHit = SB.circleRectCollision(ballBounds, expanded);
            }
            if (nearHit) {
                obs._nearMissed = true;
                this.ui.nearMissTimer = 0.6;
                this.score += 2;
                this.achievements.onNearMiss();
                SB.audio.playNearMiss();
                if (navigator.vibrate) navigator.vibrate(15);
            }
        }

        if (hit) {
            if (this.invincibleTimer > 0) continue; // Post-revive invincibility
            if (this.powerupEffects.useShield()) {
                obs.active = false;
                this.screenShake = 0.25;
                this.screenShakeIntensity = 8;
                this.particles.emit(this.ball.x, this.ball.y, SB.FX.shieldBreak);
                this.achievements.onShieldUse();
                SB.audio.playShieldBreak();
                continue;
            }
            this.particles.emit(this.ball.x, this.ball.y, SB.FX.deathExplosion);
            this._emitBallShatter(this.ball.x, this.ball.y);
            this._handleDeath();
            return;
        }
    }

    // --- Collectibles ---
    var collectibles = this.collectiblePool.getActive();
    for (var j = collectibles.length - 1; j >= 0; j--) {
        var col = collectibles[j];
        col.update(dt);

        if (col.x < -50 || col.x > cw + 50 || col.y < -50 || col.y > ch + 50) {
            col.active = false;
            continue;
        }

        if (this.powerupEffects.magnet) {
            var dx = this.ball.x - col.x;
            var dy = this.ball.y - col.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
                col.x += dx * 5 * dt;
                col.y += dy * 5 * dt;
            }
        }

        if (SB.circleCircleCollision(ballBounds, col.getBounds())) {
            var isCoin = col.type === SB.COLLECTIBLE_TYPES.COIN;
            this.particles.emit(col.x, col.y, isCoin ? SB.FX.coinCollect : SB.FX.starCollect);
            col.active = false;
            this.comboTimer = 2.0;
            this.comboCount++;
            if (this.comboCount > this.runMaxCombo) this.runMaxCombo = this.comboCount;
            var cv = col.coinValue || 1;
            this.runStars++;
            this.runCoins += cv;
            SB.Storage.addCoins(cv);
            this.hudCoins = SB.Storage.getCoins();
            var comboMult = this.comboCount >= 5 ? 4 : (this.comboCount >= 3 ? 3 : (this.comboCount >= 2 ? 2 : 1));
            var bonus = col.pointValue * comboMult * this.dailyStarMult;
            this.score += bonus;
            var popColor = isCoin ? '#FFB300' : (this.comboCount >= 5 ? '#FF4444' : (this.comboCount >= 3 ? '#FF6B6B' : (this.comboCount >= 2 ? '#FF8C42' : '#FFD700')));
            this.ui.addScorePopup(col.x, col.y - 15, '+' + bonus + (cv > 1 ? ' +' + cv + 'c' : ''), popColor);
            this.achievements.onStarCollect();
            this.achievements.onCoinEarn(cv);
            this.achievements.onCombo(this.comboCount);
            if (isCoin) {
                this.screenShake = 0.08;
                this.screenShakeIntensity = 3;
                if (navigator.vibrate) navigator.vibrate(10);
                SB.audio.playCoinCollect();
            } else if (this.comboCount >= 2) {
                SB.audio.playCombo(this.comboCount);
            } else {
                SB.audio.playCollect();
            }
        }
    }

    // --- Powerups ---
    var powerups = this.powerupPool.getActive();
    for (var k = powerups.length - 1; k >= 0; k--) {
        var pu = powerups[k];
        pu.update(dt);

        if (pu.x < -50 || pu.x > cw + 50 || pu.y < -50 || pu.y > ch + 50) {
            pu.active = false;
            continue;
        }

        if (SB.circleCircleCollision(ballBounds, pu.getBounds())) {
            var puPreset = pu.type === 'shield' ? SB.FX.powerupShield
                         : pu.type === 'magnet' ? SB.FX.powerupMagnet
                         : SB.FX.powerupSlow;
            this.particles.emit(pu.x, pu.y, puPreset);
            pu.active = false;
            this.powerupEffects.activate(pu.type);
            this.achievements.onPowerupCollect();
            SB.audio.playMilestone();
        }
    }

    // --- Scoring (scales with difficulty) ---
    this.scoreTimer += dt;
    if (this.scoreTimer >= 1.0) {
        this.scoreTimer -= 1.0;
        this.score += 1 + Math.floor(this.spawner.difficulty * 2);
    }

    var currentMilestone = Math.floor(this.score / 10);
    if (currentMilestone > this.lastMilestone) {
        this.lastMilestone = currentMilestone;
        SB.audio.playMilestone();
        // Special celebrations at key milestones
        var milestoneScore = currentMilestone * 10;
        if (milestoneScore === 25 || milestoneScore === 50 || milestoneScore === 100 || milestoneScore === 200) {
            this.screenFlash = 0.1;
            this.particles.emit(cw / 2, ch * 0.3, SB.FX.starCollect);
            this.particles.emit(cw / 2, ch * 0.3, SB.FX.starCollect);
            this.ui.milestoneMsg = milestoneScore + ' POINTS!';
            this.ui.milestoneMsgTimer = 1.5;
            if (navigator.vibrate) navigator.vibrate(30);
        }
    }

    // Update BGM intensity with difficulty
    SB.audio.updateBGMIntensity(this.spawner.difficulty);

    // Check achievements mid-game
    this.achievements.checkAll();

    if (this.ball.y - this.ball.radius > ch) {
        if (this.invincibleTimer > 0) {
            // Bounce back up during invincibility
            this.ball.y = ch - this.ball.radius;
            this.ball.vy = SB.Physics.BOUNCE_IMPULSE * 0.6;
        } else {
            this.particles.emit(this.ball.x, ch, SB.FX.deathExplosion);
            this._emitBallShatter(this.ball.x, ch);
            this._handleDeath();
        }
    }
};

SB.Game.prototype._updatePaused = function(dt) {
    // Resume button
    if (SB._resumeBtnTapped) {
        SB._resumeBtnTapped = null;
        SB._resumeBtn = null;
        SB._quitBtn = null;
        this.state = SB.STATES.PLAYING;
        SB.audio.startBGM();
        return;
    }
    // Quit button
    if (SB._quitBtnTapped) {
        SB._quitBtnTapped = null;
        SB._resumeBtn = null;
        SB._quitBtn = null;
        this._transitionTo(SB.STATES.GAME_OVER);
        return;
    }
    // Fallback: any tap that wasn't on buttons resumes
    if (this.input.consumeTap()) {
        SB._resumeBtn = null;
        SB._quitBtn = null;
        this.state = SB.STATES.PLAYING;
        SB.audio.startBGM();
    }
};

SB.Game.prototype._handleDeath = function() {
    // Haptic feedback on death
    if (navigator.vibrate) navigator.vibrate(80);
    // Trigger slow-mo death sequence
    this.deathSlowMo = 0.3;
    var coins = SB.Storage.getCoins();
    this.deathPending = (!this.revived && coins >= SB.REVIVE_COST) ? 'revive' : 'gameover';
};

SB.Game.prototype._resolveDeathPending = function() {
    if (this.deathPending === 'revive') {
        this.state = SB.STATES.REVIVE;
        this.reviveCountdown = 3.0;
        SB.audio.stopBGM();
    } else {
        this._transitionTo(SB.STATES.GAME_OVER);
    }
    this.deathPending = null;
};

SB.Game.prototype._updateRevive = function(dt) {
    this.reviveCountdown -= dt;
    this.particles.update(dt);

    // Countdown expired — must check BEFORE button to avoid race
    if (this.reviveCountdown <= 0) {
        SB._reviveBtnTapped = null;
        this._transitionTo(SB.STATES.GAME_OVER);
        return;
    }

    // Revive button tapped
    if (SB._reviveBtnTapped) {
        SB._reviveBtnTapped = null;
        if (SB.Storage.spendCoins(SB.REVIVE_COST)) {
            this.hudCoins = SB.Storage.getCoins();
            this.revived = true;
            this.state = SB.STATES.PLAYING;
            this.invincibleTimer = 3.0;
            this.ball.blinking = true;
            this.ball.y = SB.canvasHeight * 0.4;
            this.ball.vy = SB.Physics.BOUNCE_IMPULSE * 0.5;
            this.ball.vx = 0;
            // Clear nearby obstacles (handle both rect and circular types)
            var obstacles = this.obstaclePool.getActive();
            for (var i = 0; i < obstacles.length; i++) {
                var obs = obstacles[i];
                var ocx = obs.radius ? obs.x + (obs.radius || 0) : obs.x + (obs.width || 0) / 2;
                var ocy = obs.radius ? obs.y + (obs.radius || 0) : obs.y + (obs.height || 0) / 2;
                var dx = this.ball.x - ocx;
                var dy = this.ball.y - ocy;
                if (dx * dx + dy * dy < 22500) { // 150^2
                    obs.active = false;
                }
            }
            SB.audio.startBGM();
            SB.audio.playRevive();
            return;
        }
    }

    // Skip revive (tap anywhere except button)
    if (this.input.consumeTap()) {
        this._transitionTo(SB.STATES.GAME_OVER);
    }
};

SB.Game.prototype._updateZone = function() {
    var prevZone = this.currentZone;
    if (this.score >= SB.ZONES.EXTREME.threshold) {
        this.currentZone = SB.ZONES.EXTREME;
    } else if (this.score >= SB.ZONES.INTENSE.threshold) {
        this.currentZone = SB.ZONES.INTENSE;
    } else if (this.score >= SB.ZONES.RISING.threshold) {
        this.currentZone = SB.ZONES.RISING;
    } else {
        this.currentZone = SB.ZONES.CALM;
    }
    if (prevZone !== this.currentZone && prevZone !== null) {
        this.ui.zoneMsg = this.currentZone.name;
        this.ui.zoneMsgTimer = 2.0;
        this.screenFlash = 0.12;
        // Zone transition sound
        if (this.currentZone === SB.ZONES.EXTREME) {
            SB.audio.playZoneWarning(2);
        } else if (this.currentZone === SB.ZONES.INTENSE) {
            SB.audio.playZoneWarning(1);
        } else if (this.currentZone === SB.ZONES.RISING) {
            SB.audio.playZoneWarning(0);
        }
    }
};

SB.Game.prototype._updateGameOver = function(dt) {
    this.gameOverCooldown += dt;
    this.particles.update(dt);

    // Process achievement notifications (spaced out)
    if (!this.ui.achievementToast) {
        var notif = this.achievements.popNotification();
        if (notif) {
            this.ui.showAchievementToast(notif);
        }
    }

    // Play Again button (skips start screen)
    if (SB._playAgainTapped && this.gameOverCooldown >= this.gameOverCooldownTime) {
        SB._playAgainTapped = null;
        SB._playAgainBtn = null;
        this._transitionTo(SB.STATES.PLAYING);
        return;
    }

    if (this.input.consumeTap() && this.gameOverCooldown >= this.gameOverCooldownTime) {
        this._transitionTo(SB.STATES.START);
    }
};

SB.Game.prototype._transitionTo = function(newState) {
    this.state = newState;

    if (newState === SB.STATES.PLAYING) {
        this.score = 0;
        this.scoreTimer = 0;
        this.lastMilestone = 0;
        this.comboTimer = 0;
        this.comboCount = 0;
        this.runStars = 0;
        this.tutorialTimer = 0;
        this.tutorialStep = 0;
        this.xpResult = null;
        this.showAchievementViewer = false;
        this.runMaxCombo = 0;
        this.runSurviveTime = 0;
        this.runCoins = 0;
        this.revived = false;
        this.invincibleTimer = 0;
        this.deathSlowMo = 0;
        this.deathPending = null;
        this.currentZone = SB.ZONES.CALM;
        this.transitionAlpha = 1;
        this.ball.reset(SB.canvasWidth, SB.canvasHeight);
        this.ball.blinking = false;
        this._applySkin();
        // Apply daily modifiers
        var mods = this.daily.getMods();
        if (mods.gravity) this.ball.gravityMult = mods.gravity;
        if (mods.ballSize) this.ball.radius = this.ball.baseRadius * mods.ballSize;
        this.dailyStarMult = mods.starValue || 1;
        // Veteran bonus: returning players get a faster start
        var vetBonus = Math.min(this.achievements.stats.totalGames / 15, 0.2);
        this.spawner.reset(vetBonus);
        if (mods.obstacleSpeed) this.spawner.dailySpeedMult = mods.obstacleSpeed;
        if (mods.obstacleSize) this.spawner.dailySizeMult = mods.obstacleSize;
        this.powerupEffects.reset();
        this.achievements.onRunStart();
        SB._skinBtns = null;
        SB._achBtn = null;
        SB._muteBtn = null;
        SB._hcBtn = null;
        SB._pauseBtn = null;
        SB._pauseBtnTapped = null;
        SB._resumeBtn = null;
        SB._quitBtn = null;
        SB._reviveBtn = null;
        SB._reviveBtnTapped = null;
        SB.audio.startBGM();
    } else if (newState === SB.STATES.GAME_OVER) {
        SB._reviveBtn = null;
        SB._reviveBtnTapped = null;
        SB._pauseBtn = null;
        SB._playAgainBtn = null;
        SB._playAgainTapped = null;
        this.screenFlash = 0.15;
        this.screenShake = 0.3;
        this.screenShakeIntensity = 10;
        // Coin floor: always earn at least 3 coins per run
        if (this.runCoins < 3) {
            var bonus = 3 - this.runCoins;
            SB.Storage.addCoins(bonus);
            this.runCoins = 3;
        }
        this.isNewHigh = SB.Storage.isNewHighScore(Math.floor(this.score));
        SB.Storage.setHighScore(Math.floor(this.score));
        SB.Storage.addToLeaderboard(this.score);
        this.highScore = SB.Storage.getHighScore();
        this.hudCoins = SB.Storage.getCoins();
        this.hudHighScore = this.highScore;
        this.gameOverCooldown = 0;
        this.achievements.onRunEnd(this.score);
        var dailyJustCompleted = this.daily.onRunEnd(this.score);
        var dailyBonusXP = this.daily.getBonusXP();
        this.xpResult = this.progression.addRunXP(this.score, this.runStars);
        if (dailyJustCompleted && dailyBonusXP > 0) {
            this.progression.xp += dailyBonusXP;
            this.progression._save();
        }
        if (this.xpResult && this.xpResult.leveledUp) SB.audio.playLevelUp();
        var streak = SB.Storage.updateStreak();
        var recentRuns = SB.Storage.addRecentRun(this.score);
        SB.Storage.updateLifetimeStats(this.score, this.runCoins);
        SB.Storage.saveLastRun({
            score: Math.floor(this.score),
            stars: this.runStars,
            time: Math.floor(this.runSurviveTime),
            coins: this.runCoins
        });
        this.ui.resetGameOver(this.score, this.xpResult, this.progression, dailyJustCompleted, {
            time: this.runSurviveTime,
            stars: this.runStars,
            maxCombo: this.runMaxCombo,
            coins: this.runCoins
        }, streak, recentRuns);
        SB.audio.stopBGM();
        SB.audio.playGameOver();
    } else if (newState === SB.STATES.START) {
        this.highScore = SB.Storage.getHighScore();
        this.hudCoins = SB.Storage.getCoins();
        this.hudHighScore = this.highScore;
        this.showTutorial = false;
        this.showAchievementViewer = false;
        // Clear all stale button references
        SB._shareBtn = null;
        SB._playAgainBtn = null;
        SB._playAgainTapped = null;
        SB._reviveBtn = null;
        SB._reviveBtnTapped = null;
        SB._pauseBtn = null;
        SB._pauseBtnTapped = null;
        SB._resumeBtn = null;
        SB._quitBtn = null;
    }
};

SB.Game.prototype.render = function(ctx, cw, ch) {
    ctx.save();

    if (this.screenShake > 0) {
        var shakeT = this.screenShake / 0.3;
        var intensity = this.screenShakeIntensity * shakeT;
        var shakeX = (Math.random() - 0.5) * intensity;
        var shakeY = (Math.random() - 0.5) * intensity;
        ctx.translate(shakeX, shakeY);
    }

    this.background.draw(ctx, cw, ch);

    switch (this.state) {
        case SB.STATES.START:
            this.ui.drawStartScreen(ctx, cw, ch, this.highScore, this.progression, this.achievements, this.skinManager, this.daily);
            if (this.showAchievementViewer) {
                this.ui.drawAchievementViewer(ctx, cw, ch, this.achievements);
            }
            break;

        case SB.STATES.PLAYING:
            this._renderGameplay(ctx, cw, ch);
            this.ui.drawHUD(ctx, cw, ch, this.score, this.currentZone, this.hudCoins, this.hudHighScore, this.comboTimer, this.comboCount);
            if (this.showTutorial) {
                this.ui.drawTutorial(ctx, cw, ch, this.tutorialStep);
            }
            // Danger indicator: red tint when ball in bottom 25%
            if (this.ball.y > ch * 0.75) {
                var dangerAlpha = ((this.ball.y - ch * 0.75) / (ch * 0.25)) * 0.25;
                ctx.fillStyle = 'rgba(231, 76, 60, ' + dangerAlpha.toFixed(2) + ')';
                ctx.fillRect(0, ch * 0.6, cw, ch * 0.4);
            }
            // Zone edge glow (subtle colored border for INTENSE/EXTREME)
            if (this.currentZone === SB.ZONES.INTENSE || this.currentZone === SB.ZONES.EXTREME) {
                var zGlowAlpha = this.currentZone === SB.ZONES.EXTREME ? 0.06 : 0.03;
                var zColor = this.currentZone === SB.ZONES.EXTREME ? '155,89,182' : '231,76,60';
                var zPulse = (Math.sin((SB.frameTime || 0) * 0.003) + 1) / 2 * zGlowAlpha;
                ctx.fillStyle = 'rgba(' + zColor + ',' + zPulse.toFixed(3) + ')';
                ctx.fillRect(0, 0, cw, ch);
            }
            // Edge danger indicators for off-screen obstacles
            this._drawEdgeWarnings(ctx, cw, ch);
            break;

        case SB.STATES.PAUSED:
            this._renderGameplay(ctx, cw, ch);
            this.ui.drawHUD(ctx, cw, ch, this.score, this.currentZone, this.hudCoins, this.hudHighScore, this.comboTimer, this.comboCount);
            this.ui.drawPauseScreen(ctx, cw, ch);
            break;

        case SB.STATES.REVIVE:
            this._renderGameplay(ctx, cw, ch);
            this.ui.drawRevivePrompt(ctx, cw, ch, this.reviveCountdown, SB.Storage.getCoins(), SB.REVIVE_COST);
            break;

        case SB.STATES.GAME_OVER:
            this._renderGameplay(ctx, cw, ch);
            this.ui.drawGameOver(ctx, cw, ch, this.score, this.highScore, this.isNewHigh);
            break;
    }

    // Achievement toast (renders on top of everything)
    this.ui.drawAchievementToast(ctx, cw, ch);

    if (this.screenFlash > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, ' + (this.screenFlash / 0.15) * 0.4 + ')';
        ctx.fillRect(0, 0, cw, ch);
    }

    if (this.transitionAlpha > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, ' + Math.max(0, this.transitionAlpha).toFixed(2) + ')';
        ctx.fillRect(0, 0, cw, ch);
    }

    ctx.restore();
};

SB.Game.prototype._renderGameplay = function(ctx, cw, ch) {
    var obstacles = this.obstaclePool.getActive();
    for (var i = 0; i < obstacles.length; i++) {
        obstacles[i].draw(ctx);
    }

    var collectibles = this.collectiblePool.getActive();
    for (var j = 0; j < collectibles.length; j++) {
        collectibles[j].draw(ctx);
    }

    var powerups = this.powerupPool.getActive();
    for (var k = 0; k < powerups.length; k++) {
        powerups[k].draw(ctx);
    }

    // Speed lines when ball falls fast
    if (this.state === SB.STATES.PLAYING && this.ball.vy > SB.Physics.MAX_FALL_SPEED * 0.5) {
        var speedFrac = (this.ball.vy - SB.Physics.MAX_FALL_SPEED * 0.5) / (SB.Physics.MAX_FALL_SPEED * 0.5);
        var lineAlpha = Math.min(speedFrac * 0.15, 0.15);
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,' + lineAlpha.toFixed(3) + ')';
        ctx.lineWidth = 1;
        for (var sl = 0; sl < 6; sl++) {
            var lx = this.ball.x + (sl - 2.5) * 20 + (Math.random() - 0.5) * 8;
            var ly = this.ball.y - 30 - Math.random() * 40;
            ctx.beginPath();
            ctx.moveTo(lx, ly);
            ctx.lineTo(lx + (Math.random() - 0.5) * 2, ly - 25 - Math.random() * 20);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Trajectory preview (faint dotted arc when ball is falling)
    if (this.state === SB.STATES.PLAYING && this.ball.vy > 2 && this.deathSlowMo <= 0) {
        ctx.save();
        var trajX = this.ball.x;
        var trajY = this.ball.y;
        var trajVx = this.ball.vx;
        var trajVy = this.ball.vy;
        var trajStep = 1 / 60;
        var trajGrav = SB.Physics.GRAVITY * this.ball.gravityMult;
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        for (var ti = 0; ti < 12; ti++) {
            trajVy += trajGrav * trajStep * 60;
            trajVx *= SB.Physics.AIR_RESISTANCE;
            trajX += trajVx * trajStep;
            trajY += trajVy * trajStep;
            if (trajY > ch || trajX < 0 || trajX > cw) break;
            ctx.beginPath();
            ctx.arc(trajX, trajY, 1.5, 0, SB.TAU);
            ctx.fill();
        }
        ctx.restore();
    }

    // Death slow-mo vignette
    if (this.deathSlowMo > 0) {
        var vigAlpha = (0.3 - this.deathSlowMo) / 0.3 * 0.35;
        ctx.fillStyle = 'rgba(0,0,0,' + Math.max(0, vigAlpha).toFixed(3) + ')';
        ctx.fillRect(0, 0, cw, ch);
    }

    this.ball.draw(ctx);
    this.particles.draw(ctx);

    if (this.powerupEffects.shield) {
        ctx.save();
        var shimmer = Math.sin((SB.frameTime || 0) * 0.005) * 0.15 + 0.35;
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, this.ball.radius + 8, 0, SB.TAU);
        ctx.strokeStyle = 'rgba(52, 152, 219, ' + shimmer + ')';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(52, 152, 219, 0.6)';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();
    }

    if (this.powerupEffects.magnet) {
        ctx.save();
        var magnetAlpha = Math.sin((SB.frameTime || 0) * 0.004) * 0.08 + 0.12;
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, 120, 0, SB.TAU);
        ctx.strokeStyle = 'rgba(155, 89, 182, ' + magnetAlpha + ')';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }
};

SB.Game.prototype._drawEdgeWarnings = function(ctx, cw, ch) {
    var obstacles = this.obstaclePool.getActive();
    var margin = 40; // How close to edge before warning appears
    ctx.save();
    for (var i = 0; i < obstacles.length; i++) {
        var obs = obstacles[i];
        if (obs.type === SB.OBSTACLE_TYPES.LASER || obs.type === SB.OBSTACLE_TYPES.GRAVITY_WELL) continue;
        var ocx, ocy;
        if (obs.radius) {
            ocx = obs.x + obs.radius;
            ocy = obs.y + obs.radius;
        } else {
            ocx = obs.x + (obs.width || 0) / 2;
            ocy = obs.y + (obs.height || 0) / 2;
        }
        // Only warn for obstacles just off-screen
        var fromLeft = (ocx < 0 && ocx > -margin);
        var fromRight = (ocx > cw && ocx < cw + margin);
        if (!fromLeft && !fromRight) continue;
        if (ocy < 0 || ocy > ch) continue;

        var arrowX = fromLeft ? 8 : cw - 8;
        var distFrac = fromLeft ? (1 + ocx / margin) : (1 - (ocx - cw) / margin);
        var arrowAlpha = distFrac * 0.6;

        ctx.fillStyle = 'rgba(231,76,60,' + arrowAlpha.toFixed(2) + ')';
        ctx.beginPath();
        if (fromLeft) {
            ctx.moveTo(arrowX + 6, ocy - 5);
            ctx.lineTo(arrowX, ocy);
            ctx.lineTo(arrowX + 6, ocy + 5);
        } else {
            ctx.moveTo(arrowX - 6, ocy - 5);
            ctx.lineTo(arrowX, ocy);
            ctx.lineTo(arrowX - 6, ocy + 5);
        }
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
};

SB.Game.prototype._emitBallShatter = function(x, y) {
    // Emit skin-colored fragments that scatter outward + fall with gravity
    var glowRGB = SB.hexToRGB(this.ball.glowColor || '#FFD700');
    var coreRGB = SB.hexToRGB(this.ball.coreColor || '#FFFFFF');
    this.particles.emit(x, y, {
        count: 10,
        spread: 6,
        speedMin: 100,
        speedMax: 280,
        lifeMin: 0.4,
        lifeMax: 0.9,
        sizeMin: 2,
        sizeMax: 5,
        color: glowRGB,
        gravity: 250,
        friction: 0.97
    });
    this.particles.emit(x, y, {
        count: 6,
        spread: 3,
        speedMin: 60,
        speedMax: 180,
        lifeMin: 0.3,
        lifeMax: 0.7,
        sizeMin: 1.5,
        sizeMax: 3.5,
        color: coreRGB,
        gravity: 200,
        friction: 0.96
    });
};

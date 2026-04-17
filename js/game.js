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
    this.trailBlendTimer = 0;
    this.runCoins = 0;
    this.deathSlowMo = 0;
    this.deathPending = null; // stores death context during slow-mo
    this.hudCoins = 0; // cached for HUD (avoid localStorage reads per frame)
    this.hudHighScore = 0;
    this.nearMissStreak = 0;
    this.nearMissStreakTimer = 0;
    this.lastBounceTime = 0;
    this.deathCause = '';
    this.runBounces = 0;
    this.wallFlashSide = 0;
    this.wallFlashTimer = 0;
    this.wallBounceStreak = 0;
    this.wallBounceStreakTimer = 0;
    this.scoreShake = 0;

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
    var bgDiff = this.state === SB.STATES.PLAYING ? this.spawner.difficulty : (this.state === SB.STATES.GAME_OVER ? this.spawner.difficulty * 0.3 : 0);
    this.background.update(dt, bgDiff);

    if (this.screenShake > 0) this.screenShake -= dt;
    if (this.screenFlash > 0) this.screenFlash -= dt;
    if (this.wallFlashTimer > 0) this.wallFlashTimer -= dt;
    if (this.wallBounceStreakTimer > 0) {
        this.wallBounceStreakTimer -= dt;
        if (this.wallBounceStreakTimer <= 0) this.wallBounceStreak = 0;
    }
    if (this.scoreShake > 0) this.scoreShake -= dt;
    if (this.transitionAlpha > 0) this.transitionAlpha -= dt * 3;
    if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) {
            if (this.comboCount >= 3) SB.audio.playComboBreak();
            this.comboCount = 0;
        }
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
        this.ui.addTapRipple(this.input.tapX, this.input.tapY);
        // Double-tap power bounce (within 180ms)
        var now = SB.frameTime || 0;
        var isDoubleTap = (now - this.lastBounceTime) < 180;
        this.lastBounceTime = now;
        // Perfect bounce: ball falling fast + near bottom half of screen
        var preBounceVy = this.ball.vy;
        var isPerfect = preBounceVy > SB.Physics.MAX_FALL_SPEED * 0.65 && this.ball.y > SB.canvasHeight * 0.6;
        this.ball.bounce(this.input.tapX);
        if (isDoubleTap) {
            this.ball.vy *= 1.25;
            this.screenFlash = 0.04;
            this.particles.emit(this.ball.x, this.ball.y + this.ball.radius, SB.FX.powerBounce);
            this.ui.addPickupRing(this.ball.x, this.ball.y + this.ball.radius, '93,173,226');
        } else {
            this.particles.emit(this.ball.x, this.ball.y + this.ball.radius, SB.FX.bounce);
            this.ui.addPickupRing(this.ball.x, this.ball.y + this.ball.radius, '255,255,255');
        }
        // Heavy landing impact ring
        if (preBounceVy > SB.Physics.MAX_FALL_SPEED * 0.4) {
            var impactFrac = Math.min((preBounceVy - SB.Physics.MAX_FALL_SPEED * 0.4) / (SB.Physics.MAX_FALL_SPEED * 0.6), 1);
            this.ui.addPickupRing(this.ball.x, this.ball.y + this.ball.radius, '255,255,255');
            if (impactFrac > 0.5) {
                this.ui.addPickupRing(this.ball.x, this.ball.y + this.ball.radius, '200,200,255');
            }
        }
        // Dust puff when bouncing while falling (heavier at higher speed)
        if (preBounceVy > 100) {
            this.particles.emit(this.ball.x - this.ball.radius, this.ball.y + this.ball.radius, SB.FX.bounceDust);
            this.particles.emit(this.ball.x + this.ball.radius, this.ball.y + this.ball.radius, SB.FX.bounceDust);
        }
        this.achievements.onBounce();
        this.runBounces++;
        if (isPerfect) {
            this.score += 3;
            this.ui.addScorePopup(this.ball.x, this.ball.y - 25, 'PERFECT +3', '#00FF88');
            SB.audio.playPerfectBounce();
            if (navigator.vibrate) navigator.vibrate(12);
        } else if (isDoubleTap) {
            this.score += 2;
            this.ui.addScorePopup(this.ball.x, this.ball.y - 25, 'POWER +2', '#5DADE2');
            SB.audio.playPerfectBounce();
            if (navigator.vibrate) navigator.vibrate(15);
        } else {
            SB.audio.playBounce();
        }
    }

    this.ball.comboIntensity = this.comboCount >= 5 ? 1.0 : (this.comboCount >= 3 ? 0.5 : 0);
    this.ball.update(dt);

    // Ground dust when ball is near bottom and falling
    if (this.ball.y > SB.canvasHeight * 0.85 && this.ball.vy > 200 && Math.random() < 0.3) {
        this.particles.emit(this.ball.x + SB.randRange(-8, 8), SB.canvasHeight, {
            count: 2,
            spread: 3,
            speedMin: 10,
            speedMax: 30,
            lifeMin: 0.2,
            lifeMax: 0.4,
            sizeMin: 1,
            sizeMax: 2,
            color: '180,180,200',
            angle: -Math.PI / 2,
            angleSpread: Math.PI / 3,
            gravity: -15,
            friction: 0.9
        });
    }

    // Wall hit feedback with sparks
    if (this.ball.wallHitSide !== 0) {
        var wx = this.ball.wallHitSide < 0 ? 0 : SB.canvasWidth;
        var sparkPreset = this.ball.wallHitSide < 0 ? SB.FX.wallSparkLeft : SB.FX.wallSparkRight;
        this.particles.emit(wx, this.ball.y, sparkPreset);
        var glowRGB = SB.hexToRGB(this.ball.glowColor || '#FFD700');
        this.particles.emit(wx, this.ball.y, {
            count: 3,
            spread: 2,
            speedMin: 40,
            speedMax: 120,
            lifeMin: 0.2,
            lifeMax: 0.4,
            sizeMin: 1.5,
            sizeMax: 3,
            color: glowRGB,
            angle: this.ball.wallHitSide < 0 ? 0 : Math.PI,
            angleSpread: Math.PI / 4,
            gravity: 80,
            friction: 0.94
        });
        this.wallFlashSide = this.ball.wallHitSide;
        this.wallFlashTimer = 0.15;
        if (this.wallBounceStreakTimer > 0) {
            this.wallBounceStreak++;
        } else {
            this.wallBounceStreak = 1;
        }
        this.wallBounceStreakTimer = 1.5;
        if (this.wallBounceStreak >= 3) {
            var wbBonus = this.wallBounceStreak;
            this.score += wbBonus;
            this.ui.addScorePopup(this.ball.x, this.ball.y - 20, 'WALL x' + this.wallBounceStreak + ' +' + wbBonus, '#5DADE2');
        }
        SB.audio.playWallHit();
        this.achievements.onWallBounce();
    }

    // Powerup expiry warning (play beep at 2s remaining)
    var pe = this.powerupEffects;
    if (pe.scoreMult && pe.scoreMultTimer <= 2.0 && pe.scoreMultTimer + dt > 2.0) {
        SB.audio.playPowerupExpiring();
    }
    if (pe.magnet && pe.magnetTimer <= 2.0 && pe.magnetTimer + dt > 2.0) {
        SB.audio.playPowerupExpiring();
    }
    if (pe.slow && pe.slowTimer <= 2.0 && pe.slowTimer + dt > 2.0) {
        SB.audio.playPowerupExpiring();
    }
    // Flash when score multiplier expires
    if (pe.scoreMult && pe.scoreMultTimer <= dt) {
        this.screenFlash = 0.06;
        this.ui.addScorePopup(SB.canvasWidth / 2, 60, 'x2 ENDED', 'rgba(255,213,79,0.6)');
    }

    // Near-miss streak timer decay
    if (this.nearMissStreakTimer > 0) {
        this.nearMissStreakTimer -= dt;
        if (this.nearMissStreakTimer <= 0) this.nearMissStreak = 0;
    }

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
    this.ball.gravityPullStrength = 0;
    var obstacles = this.obstaclePool.getActive();
    var ballBounds = this.ball.getBounds();

    for (var i = obstacles.length - 1; i >= 0; i--) {
        var obs = obstacles[i];
        obs.update(dt * slowMult);

        if (obs.isOffScreen(cw, ch)) {
            obs.active = false;
            continue;
        }

        // Danger proximity glow (within 60px)
        if (obs.type !== SB.OBSTACLE_TYPES.GRAVITY_WELL && obs.type !== SB.OBSTACLE_TYPES.LASER) {
            var dpCx, dpCy;
            if (obs.radius) {
                dpCx = obs.x + obs.radius;
                dpCy = obs.y + obs.radius;
            } else {
                dpCx = obs.x + (obs.width || 0) / 2;
                dpCy = obs.y + (obs.height || 0) / 2;
            }
            var dpDx = this.ball.x - dpCx;
            var dpDy = this.ball.y - dpCy;
            var dpDist = Math.sqrt(dpDx * dpDx + dpDy * dpDy);
            var dangerThreshold = 60;
            obs.dangerGlow = dpDist < dangerThreshold ? 1 - dpDist / dangerThreshold : 0;
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
                // Visual stretch toward well
                if (pullFactor > this.ball.gravityPullStrength) {
                    this.ball.gravityPullStrength = pullFactor;
                    this.ball.gravityPullAngle = Math.atan2(wdy, wdx);
                }
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
                // Streak tracking: consecutive near-misses within 3s
                if (this.nearMissStreakTimer > 0) {
                    this.nearMissStreak++;
                } else {
                    this.nearMissStreak = 1;
                }
                this.nearMissStreakTimer = 3.0;
                this.ui.nearMissStreak = this.nearMissStreak;
                var nmBonus = 2 * this.nearMissStreak;
                this.score += nmBonus;
                if (this.nearMissStreak >= 2) {
                    this.ui.addScorePopup(this.ball.x, this.ball.y - 30, 'DAREDEVIL x' + this.nearMissStreak + ' +' + nmBonus, '#F39C12');
                }
                this.achievements.onNearMiss();
                SB.audio.playNearMiss();
                if (navigator.vibrate) navigator.vibrate(15);
            }
        }

        if (hit) {
            if (this.invincibleTimer > 0) continue; // Post-revive invincibility
            if (this.powerupEffects.useShield()) {
                var obsCx = obs.radius ? obs.x + obs.radius : obs.x + (obs.width || 0) / 2;
                var obsCy = obs.radius ? obs.y + obs.radius : obs.y + (obs.height || 0) / 2;
                obs.active = false;
                this.screenShake = 0.25;
                this.screenShakeIntensity = 8;
                this.particles.emit(this.ball.x, this.ball.y, SB.FX.shieldBreak);
                // Obstacle destruction scatter (colored by obstacle type)
                var obsColor = obs.type === SB.OBSTACLE_TYPES.BLADE ? '180,180,190' :
                               obs.type === SB.OBSTACLE_TYPES.SPIKE ? '255,99,71' :
                               obs.type === SB.OBSTACLE_TYPES.BOOMERANG ? '255,152,0' : '231,76,60';
                this.particles.emit(obsCx, obsCy, {
                    count: 8,
                    spread: 4,
                    speedMin: 80,
                    speedMax: 220,
                    lifeMin: 0.3,
                    lifeMax: 0.6,
                    sizeMin: 2,
                    sizeMax: 4,
                    color: obsColor,
                    gravity: 180,
                    friction: 0.96
                });
                this.achievements.onShieldUse();
                SB.audio.playShieldBreak();
                continue;
            }
            this.deathCause = obs.type === SB.OBSTACLE_TYPES.PLATFORM ? 'Platform' :
                             obs.type === SB.OBSTACLE_TYPES.SPIKE ? 'Spike' :
                             obs.type === SB.OBSTACLE_TYPES.BLADE ? 'Blade' :
                             obs.type === SB.OBSTACLE_TYPES.BOOMERANG ? 'Boomerang' :
                             obs.type === SB.OBSTACLE_TYPES.LASER ? 'Laser' : 'Obstacle';
            this.particles.emit(this.ball.x, this.ball.y, SB.FX.deathExplosion);
            this._emitBallShatter(this.ball.x, this.ball.y);
            this._handleDeath();
            return;
        }
    }

    // Score multiplier (from powerup)
    var scorePuMult = this.powerupEffects.getScoreMultiplier();

    // --- Collectibles ---
    var collectibles = this.collectiblePool.getActive();
    for (var j = collectibles.length - 1; j >= 0; j--) {
        var col = collectibles[j];
        col.update(dt);

        var cpDx = this.ball.x - col.x;
        var cpDy = this.ball.y - col.y;
        var cpDist = Math.sqrt(cpDx * cpDx + cpDy * cpDy);
        col._proximity = cpDist < 80 ? 1 - cpDist / 80 : 0;

        if (col.x < -50 || col.x > cw + 50 || col.y < -50 || col.y > ch + 50) {
            col.active = false;
            continue;
        }

        // Coin trail sparkle
        if (col.type === SB.COLLECTIBLE_TYPES.COIN && Math.random() < 0.15 && !SB.reducedMotion) {
            this.particles.emit(col.x + SB.randRange(-4, 4), col.y + SB.randRange(-4, 4), {
                count: 1, spread: 0, speedMin: 5, speedMax: 15,
                lifeMin: 0.2, lifeMax: 0.4, sizeMin: 0.5, sizeMax: 1.5,
                color: '255,200,50', gravity: -10, friction: 0.95
            });
        }

        if (this.powerupEffects.magnet) {
            var dx = this.ball.x - col.x;
            var dy = this.ball.y - col.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
                col.x += dx * 5 * dt;
                col.y += dy * 5 * dt;
                col._magnetPull = 1 - dist / 120;
            } else {
                col._magnetPull = 0;
            }
        } else {
            col._magnetPull = 0;
        }

        if (SB.circleCircleCollision(ballBounds, col.getBounds())) {
            var isCoin = col.type === SB.COLLECTIBLE_TYPES.COIN;
            this.particles.emit(col.x, col.y, isCoin ? SB.FX.coinCollect : SB.FX.starCollect);
            this.ui.addPickupRing(col.x, col.y, isCoin ? '255,180,0' : '255,215,0');
            this.ball.bounceSquash = 0.4;
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
            var bonus = col.pointValue * comboMult * this.dailyStarMult * scorePuMult;
            this.score += bonus;
            var popColor = isCoin ? '#FFB300' : (this.comboCount >= 5 ? '#FF4444' : (this.comboCount >= 3 ? '#FF6B6B' : (this.comboCount >= 2 ? '#FF8C42' : '#FFD700')));
            this.ui.addScorePopup(col.x, col.y - 15, '+' + bonus + (cv > 1 ? ' +' + cv + 'c' : ''), popColor);
            if (bonus >= 10) this.scoreShake = 0.2;
            this.achievements.onStarCollect();
            this.achievements.onCoinEarn(cv);
            this.achievements.onCombo(this.comboCount);
            if (isCoin) {
                this.screenShake = 0.08;
                this.screenShakeIntensity = 3;
                this.ui.coinBump = 0.2;
                if (navigator.vibrate) navigator.vibrate(10);
                SB.audio.playCoinCollect();
            } else if (this.comboCount >= 2) {
                SB.audio.playCombo(this.comboCount);
                // Escalating combo feedback
                if (this.comboCount >= 5) {
                    this.screenFlash = 0.08;
                    this.screenShake = 0.12;
                    this.screenShakeIntensity = 5;
                    this.particles.emit(col.x, col.y, SB.FX.comboExplosion);
                    if (navigator.vibrate) navigator.vibrate(25);
                } else if (this.comboCount >= 3) {
                    this.screenShake = 0.06;
                    this.screenShakeIntensity = 3;
                    if (navigator.vibrate) navigator.vibrate(12);
                }
            } else {
                if (col._magnetPull > 0) {
                    SB.audio.playMagnetCollect();
                } else {
                    SB.audio.playCollect();
                }
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
                         : pu.type === 'score_mult' ? SB.FX.powerupScoreMult
                         : SB.FX.powerupSlow;
            this.particles.emit(pu.x, pu.y, puPreset);
            this.ui.addPickupRing(pu.x, pu.y, puPreset.color);
            pu.active = false;
            this.powerupEffects.activate(pu.type);
            this.achievements.onPowerupCollect();
            if (pu.type === SB.POWERUP_TYPES.SCORE_MULT) {
                this.achievements.onScoreMultUse();
            }
            // Type-specific pickup sounds
            if (pu.type === SB.POWERUP_TYPES.SHIELD) {
                SB.audio.playPowerupShield();
            } else if (pu.type === SB.POWERUP_TYPES.MAGNET) {
                SB.audio.playPowerupMagnet();
            } else if (pu.type === SB.POWERUP_TYPES.SLOW) {
                SB.audio.playPowerupSlow();
            } else if (pu.type === SB.POWERUP_TYPES.SCORE_MULT) {
                SB.audio.playPowerupScoreMult();
            } else {
                SB.audio.playMilestone();
            }
        }
    }

    // --- Scoring (scales with difficulty) ---
    this.scoreTimer += dt;
    if (this.scoreTimer >= 1.0) {
        this.scoreTimer -= 1.0;
        this.score += (1 + Math.floor(this.spawner.difficulty * 2)) * scorePuMult;
        SB.audio.playScoreTick();
    }

    // Mid-game PB notification (fire once)
    if (!this.isNewHigh && this.hudHighScore > 0 && this.score > this.hudHighScore) {
        this.isNewHigh = true;
        this.screenFlash = 0.08;
        this.ui.addScorePopup(cw / 2, ch * 0.15, 'NEW PB!', '#76FF03');
        SB.audio.playMilestone();
        if (navigator.vibrate) navigator.vibrate(25);
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
            // Fireworks from screen edges
            this.particles.emit(0, ch * 0.6, SB.FX.milestoneFirework);
            this.particles.emit(cw, ch * 0.6, SB.FX.milestoneFireworkR);
            if (milestoneScore >= 100) {
                this.particles.emit(cw * 0.3, 0, SB.FX.milestoneFireworkDown);
                this.particles.emit(cw * 0.7, 0, SB.FX.milestoneFireworkDown);
            }
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
            this.deathCause = 'Fell';
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
    // Brief white freeze-frame flash at moment of impact
    this.screenFlash = 0.12;
    // Strong death shake during slow-mo
    this.screenShake = 0.4;
    this.screenShakeIntensity = 14;
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
            this.particles.emit(this.ball.x, this.ball.y, SB.FX.reviveBurst);
            this.screenFlash = 0.08;
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
        this.ui.zoneWipeTimer = 0.5;
        this.ui.zoneWipeColor = ({ CALM: '93,173,226', RISING: '243,156,18', INTENSE: '231,76,60', EXTREME: '155,89,182' })[this.currentZone.name] || '255,255,255';
        this.screenFlash = 0.12;
        // Zone-based trail color tinting (smooth blend via timer)
        this.trailBlendTimer = 1.0;
        this._targetTrailColor = ({
            CALM: null,
            RISING: 'rgba(243,156,18,',
            INTENSE: 'rgba(231,76,60,',
            EXTREME: 'rgba(155,89,182,'
        })[this.currentZone.name] || this.skinManager.getCurrentSkin().trail;
        this.ball.trailColor = this._targetTrailColor;
        // Zone transition sound
        if (this.currentZone === SB.ZONES.EXTREME) {
            this.achievements.onReachExtreme();
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

    // Gentle particle rain during game over
    if (Math.random() < 0.15 && !SB.reducedMotion) {
        this.particles.emit(SB.randRange(0, SB.canvasWidth), -5, {
            count: 1,
            spread: 0,
            speedMin: 20,
            speedMax: 50,
            lifeMin: 2.0,
            lifeMax: 3.5,
            sizeMin: 1,
            sizeMax: 2,
            color: '255,215,0',
            angle: Math.PI / 2,
            angleSpread: Math.PI / 8,
            gravity: 15,
            friction: 0.99,
            shrink: false
        });
    }

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
        this.nearMissStreak = 0;
        this.nearMissStreakTimer = 0;
        this.lastBounceTime = 0;
        this.isNewHigh = false;
        this.deathCause = '';
        this.runBounces = 0;
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
        if (this.xpResult && this.xpResult.leveledUp) {
            SB.audio.playLevelUp();
            // Check if new level unlocks a skin
            for (var si = 0; si < SB.SKINS.length; si++) {
                if (SB.SKINS[si].unlockLevel === this.xpResult.newLevel) {
                    this.xpResult.unlockedSkin = SB.SKINS[si];
                    break;
                }
            }
        }
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
            coins: this.runCoins,
            zone: this.currentZone.name,
            deathCause: this.deathCause || 'Unknown'
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

    if (this.screenShake > 0 && !SB.reducedMotion) {
        var shakeT = this.screenShake / 0.3;
        var decay = shakeT * shakeT;
        var intensity = this.screenShakeIntensity * decay;
        var freq = (1 - shakeT) * 30 + 10; // faster vibration as shake ages
        var shakeX = Math.sin(freq * this.screenShake) * intensity * (Math.random() * 0.4 + 0.6);
        var shakeY = Math.cos(freq * this.screenShake * 1.3) * intensity * (Math.random() * 0.4 + 0.6);
        ctx.translate(shakeX, shakeY);
    }

    this.background.draw(ctx, cw, ch, this.ball.x, this.ball.y);

    switch (this.state) {
        case SB.STATES.START:
            this.ui.drawStartScreen(ctx, cw, ch, this.highScore, this.progression, this.achievements, this.skinManager, this.daily);
            if (this.showAchievementViewer) {
                this.ui.drawAchievementViewer(ctx, cw, ch, this.achievements);
            }
            break;

        case SB.STATES.PLAYING:
            this._renderGameplay(ctx, cw, ch);
            this.ui.runBounces = this.runBounces;
            this.ui.ballSpeedFrac = Math.min(Math.abs(this.ball.vy) / SB.Physics.MAX_FALL_SPEED, 1);
            this.ui.drawHUD(ctx, cw, ch, this.score, this.currentZone, this.hudCoins, this.hudHighScore, this.comboTimer, this.comboCount, this.spawner.difficulty, this.ball.y, this.scoreShake);
            // Grace period countdown: 3, 2, 1, GO!
            if (this.spawner.graceTimer < this.spawner.gracePeriod + 0.4 && !this.showTutorial) {
                var graceLeft = this.spawner.gracePeriod - this.spawner.graceTimer;
                var graceAlpha = graceLeft > 0 ? Math.min(graceLeft + 0.3, 1) : Math.max(0, 1 - (this.spawner.graceTimer - this.spawner.gracePeriod) / 0.4);
                ctx.save();
                ctx.globalAlpha = graceAlpha;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = '#5DADE2';
                ctx.shadowBlur = 12;

                if (graceLeft > 0) {
                    var countNum = Math.ceil(graceLeft);
                    var countFrac = graceLeft - Math.floor(graceLeft);
                    // Number scales up then settles
                    var countScale = countFrac > 0.7 ? 1 + (countFrac - 0.7) / 0.3 * 0.3 : 1.3 - (0.7 - countFrac) / 0.7 * 0.3;
                    ctx.font = 'bold ' + Math.floor(Math.min(cw * 0.12, 48) * countScale) + 'px ' + this.ui.font;
                    ctx.fillStyle = '#5DADE2';
                    ctx.fillText(countNum, cw / 2, ch * 0.28);
                    // Expanding ring per number
                    var ringR = 20 + (1 - countFrac) * 20;
                    var ringAlpha = countFrac * 0.4;
                    ctx.beginPath();
                    ctx.arc(cw / 2, ch * 0.28, ringR, 0, SB.TAU);
                    ctx.strokeStyle = 'rgba(93,173,226,' + ringAlpha.toFixed(2) + ')';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                } else {
                    // "GO!" burst
                    var goScale = 1.2 + (this.spawner.graceTimer - this.spawner.gracePeriod) / 0.4 * 0.3;
                    ctx.font = 'bold ' + Math.floor(Math.min(cw * 0.14, 56) * goScale) + 'px ' + this.ui.font;
                    ctx.fillStyle = '#2ECC71';
                    ctx.shadowColor = '#2ECC71';
                    ctx.fillText('GO!', cw / 2, ch * 0.28);
                }
                ctx.restore();
            }
            if (this.showTutorial) {
                this.ui.drawTutorial(ctx, cw, ch, this.tutorialStep);
            }
            // Danger indicator: red tint when ball in bottom 25%
            if (this.ball.y > ch * 0.75) {
                var dangerAlpha = ((this.ball.y - ch * 0.75) / (ch * 0.25)) * 0.25;
                ctx.fillStyle = 'rgba(231, 76, 60, ' + dangerAlpha.toFixed(2) + ')';
                ctx.fillRect(0, ch * 0.6, cw, ch * 0.4);
            }
            // Slow-motion powerup tint (subtle green overlay)
            if (this.powerupEffects.slow) {
                var slowPulse = (Math.sin((SB.frameTime || 0) * 0.003) + 1) / 2 * 0.02 + 0.02;
                ctx.fillStyle = 'rgba(46, 204, 113, ' + slowPulse.toFixed(3) + ')';
                ctx.fillRect(0, 0, cw, ch);
            }
            // Zone edge glow (subtle colored border for INTENSE/EXTREME)
            if (this.currentZone === SB.ZONES.INTENSE || this.currentZone === SB.ZONES.EXTREME) {
                var zGlowAlpha = this.currentZone === SB.ZONES.EXTREME ? 0.06 : 0.03;
                var zColor = this.currentZone === SB.ZONES.EXTREME ? '155,89,182' : '231,76,60';
                var zPulse = (Math.sin((SB.frameTime || 0) * 0.003) + 1) / 2 * zGlowAlpha;
                ctx.fillStyle = 'rgba(' + zColor + ',' + zPulse.toFixed(3) + ')';
                ctx.fillRect(0, 0, cw, ch);
            }
            // Heat haze in INTENSE/EXTREME (subtle wavy lines at bottom)
            if ((this.currentZone === SB.ZONES.INTENSE || this.currentZone === SB.ZONES.EXTREME) && !SB.reducedMotion) {
                var hft = (SB.frameTime || 0) * 0.001;
                var hAlpha = this.currentZone === SB.ZONES.EXTREME ? 0.04 : 0.025;
                ctx.save();
                ctx.strokeStyle = 'rgba(255,200,150,' + hAlpha.toFixed(3) + ')';
                ctx.lineWidth = 1;
                for (var hi = 0; hi < 4; hi++) {
                    var hY = ch * (0.75 + hi * 0.06);
                    ctx.beginPath();
                    for (var hx = 0; hx < cw; hx += 4) {
                        var hy = hY + Math.sin(hx * 0.03 + hft * 2 + hi) * 3;
                        if (hx === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
                    }
                    ctx.stroke();
                }
                ctx.restore();
            }
            // Edge danger indicators for off-screen obstacles
            this._drawEdgeWarnings(ctx, cw, ch);
            break;

        case SB.STATES.PAUSED:
            this._renderGameplay(ctx, cw, ch);
            this.ui.drawHUD(ctx, cw, ch, this.score, this.currentZone, this.hudCoins, this.hudHighScore, this.comboTimer, this.comboCount, this.spawner.difficulty, this.ball.y, this.scoreShake);
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
    // Subtle edge vignette (darkens corners for focus)
    if (!this._vignetteGrad || this._vigCw !== cw || this._vigCh !== ch) {
        var vcx = cw / 2, vcy = ch / 2;
        var vr = Math.sqrt(vcx * vcx + vcy * vcy);
        this._vignetteGrad = ctx.createRadialGradient(vcx, vcy, vr * 0.5, vcx, vcy, vr);
        this._vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
        this._vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.25)');
        this._vigCw = cw;
        this._vigCh = ch;
    }
    ctx.fillStyle = this._vignetteGrad;
    ctx.fillRect(0, 0, cw, ch);

    // Subtle camera parallax: shift world objects opposite to ball's offset from center
    var pxOff = 0, pyOff = 0;
    if (this.state === SB.STATES.PLAYING) {
        pxOff = (this.ball.x - cw / 2) / cw * -3;
        pyOff = (this.ball.y - ch / 2) / ch * -2;
    }

    // Cache active lists for this render pass (avoids rebuilding in _drawEdgeWarnings)
    this._renderObstacles = this.obstaclePool.getActive();
    var collectibles = this.collectiblePool.getActive();
    var powerups = this.powerupPool.getActive();

    ctx.save();
    ctx.translate(pxOff, pyOff);
    for (var i = 0; i < this._renderObstacles.length; i++) {
        this._renderObstacles[i].draw(ctx);
    }
    for (var j = 0; j < collectibles.length; j++) {
        collectibles[j].draw(ctx);
        if (collectibles[j]._magnetPull > 0) {
            ctx.save();
            ctx.strokeStyle = 'rgba(155,89,182,' + (collectibles[j]._magnetPull * 0.2).toFixed(2) + ')';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 6]);
            ctx.beginPath();
            ctx.moveTo(collectibles[j].x, collectibles[j].y);
            ctx.lineTo(this.ball.x - pxOff, this.ball.y - pyOff);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
    }
    for (var k = 0; k < powerups.length; k++) {
        powerups[k].draw(ctx);
    }
    ctx.restore();

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

    // Wall edge flash (brief glow on the edge the ball bounced off)
    if (this.wallFlashTimer > 0 && !SB.reducedMotion) {
        var wfAlpha = (this.wallFlashTimer / 0.15) * 0.3;
        var wfX = this.wallFlashSide < 0 ? 0 : cw - 30;
        var wfGrad = ctx.createLinearGradient(wfX, 0, wfX + (this.wallFlashSide < 0 ? 30 : 30), 0);
        if (this.wallFlashSide < 0) {
            wfGrad.addColorStop(0, 'rgba(255,255,255,' + wfAlpha.toFixed(3) + ')');
            wfGrad.addColorStop(1, 'rgba(255,255,255,0)');
        } else {
            wfGrad.addColorStop(0, 'rgba(255,255,255,0)');
            wfGrad.addColorStop(1, 'rgba(255,255,255,' + wfAlpha.toFixed(3) + ')');
        }
        ctx.fillStyle = wfGrad;
        ctx.fillRect(wfX, this.ball.y - 60, 30, 120);
    }

    if (this.powerupEffects.shield) {
        ctx.save();
        var ft = (SB.frameTime || 0) * 0.001;
        var shimmer = Math.sin(ft * 5) * 0.15 + 0.35;
        var shieldR = this.ball.radius + 8;
        ctx.translate(this.ball.x, this.ball.y);
        ctx.shadowColor = 'rgba(52, 152, 219, 0.6)';
        ctx.shadowBlur = 12 + Math.sin(ft * 3) * 4;
        // Draw 6 hexagonal segments with rotating gaps
        var segments = 6;
        var gapAngle = 0.12;
        var segAngle = (SB.TAU / segments) - gapAngle;
        var rotation = ft * 0.8;
        ctx.strokeStyle = 'rgba(52, 152, 219, ' + shimmer.toFixed(2) + ')';
        ctx.lineWidth = 2.5;
        for (var si = 0; si < segments; si++) {
            var startA = rotation + si * (SB.TAU / segments);
            ctx.beginPath();
            ctx.arc(0, 0, shieldR, startA, startA + segAngle);
            ctx.stroke();
        }
        // Inner faint ring
        ctx.strokeStyle = 'rgba(52, 152, 219, ' + (shimmer * 0.3).toFixed(2) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, shieldR - 3, 0, SB.TAU);
        ctx.stroke();
        ctx.restore();
    }

    if (this.powerupEffects.magnet) {
        ctx.save();
        var mft = (SB.frameTime || 0) * 0.001;
        var magnetAlpha = Math.sin(mft * 4) * 0.08 + 0.12;
        // Pulsing radius ring
        var magnetR = 120 + Math.sin(mft * 3) * 5;
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, magnetR, 0, SB.TAU);
        ctx.strokeStyle = 'rgba(155, 89, 182, ' + magnetAlpha.toFixed(2) + ')';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
        // Converging dots (4 rotating dots spiraling inward)
        ctx.fillStyle = 'rgba(155, 89, 182, 0.4)';
        for (var mi = 0; mi < 4; mi++) {
            var mAngle = mft * 2 + mi * (SB.TAU / 4);
            var mDist = 30 + (((mft * 80 + mi * 30) % 90));
            var mx = this.ball.x + Math.cos(mAngle) * mDist;
            var my = this.ball.y + Math.sin(mAngle) * mDist;
            ctx.beginPath();
            ctx.arc(mx, my, 1.5, 0, SB.TAU);
            ctx.fill();
        }
        ctx.restore();
    }

    // Powerup timer arcs around ball
    var pe = this.powerupEffects;
    var arcItems = [];
    if (pe.shield) arcItems.push({ frac: pe.shieldTimer / pe.shieldDuration, color: '52,152,219' });
    if (pe.magnet) arcItems.push({ frac: pe.magnetTimer / pe.magnetDuration, color: '155,89,182' });
    if (pe.slow) arcItems.push({ frac: pe.slowTimer / pe.slowDuration, color: '46,204,113' });
    if (pe.scoreMult) arcItems.push({ frac: pe.scoreMultTimer / pe.scoreMultDuration, color: '255,193,7' });
    if (arcItems.length > 0) {
        var arcR = this.ball.radius + 16;
        var arcSeg = SB.TAU / arcItems.length;
        ctx.save();
        for (var ai = 0; ai < arcItems.length; ai++) {
            var arcStart = -Math.PI / 2 + ai * arcSeg;
            var arcEnd = arcStart + arcSeg * arcItems[ai].frac;
            ctx.beginPath();
            ctx.arc(this.ball.x, this.ball.y, arcR + ai * 3, arcStart, arcEnd);
            ctx.strokeStyle = 'rgba(' + arcItems[ai].color + ',0.35)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.restore();
    }

    // Combo timer bar (small bar below ball when combo active)
    if (this.comboTimer > 0 && this.comboCount >= 2) {
        var cbW = 30;
        var cbH = 3;
        var cbX = this.ball.x - cbW / 2;
        var cbY = this.ball.y + this.ball.radius + 22;
        var cbFrac = this.comboTimer / 2.0;
        var cbColor = this.comboCount >= 5 ? '255,68,68' : (this.comboCount >= 3 ? '255,140,66' : '255,215,0');
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(cbX, cbY, cbW, cbH);
        ctx.fillStyle = 'rgba(' + cbColor + ',0.6)';
        ctx.fillRect(cbX, cbY, cbW * cbFrac, cbH);
        ctx.restore();
    }
};

SB.Game.prototype._drawEdgeWarnings = function(ctx, cw, ch) {
    var obstacles = this._renderObstacles || this.obstaclePool.getActive();
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

        // Left/right edge warnings
        var fromLeft = (ocx < 0 && ocx > -margin);
        var fromRight = (ocx > cw && ocx < cw + margin);
        if (fromLeft || fromRight) {
            if (ocy >= 0 && ocy <= ch) {
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
        }

        // Top edge warnings (obstacle approaching from above)
        var fromTop = (ocy < 0 && ocy > -margin);
        if (fromTop && ocx >= 0 && ocx <= cw) {
            var arrowY = 8;
            var topFrac = (1 + ocy / margin);
            var topAlpha = topFrac * 0.5;
            ctx.fillStyle = 'rgba(231,76,60,' + topAlpha.toFixed(2) + ')';
            ctx.beginPath();
            ctx.moveTo(ocx - 5, arrowY + 6);
            ctx.lineTo(ocx, arrowY);
            ctx.lineTo(ocx + 5, arrowY + 6);
            ctx.closePath();
            ctx.fill();
        }

        // Bottom edge warnings (obstacle approaching from below - rare but possible)
        var fromBottom = (ocy > ch && ocy < ch + margin);
        if (fromBottom && ocx >= 0 && ocx <= cw) {
            var bArrowY = ch - 8;
            var botFrac = (1 - (ocy - ch) / margin);
            var botAlpha = botFrac * 0.5;
            ctx.fillStyle = 'rgba(231,76,60,' + botAlpha.toFixed(2) + ')';
            ctx.beginPath();
            ctx.moveTo(ocx - 5, bArrowY - 6);
            ctx.lineTo(ocx, bArrowY);
            ctx.lineTo(ocx + 5, bArrowY - 6);
            ctx.closePath();
            ctx.fill();
        }
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

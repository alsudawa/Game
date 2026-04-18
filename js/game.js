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
    this.deathPending = null;
    this.deathRipple = 0;
    this.deathRippleX = 0;
    this.deathRippleY = 0;
    this.hudCoins = 0; // cached for HUD (avoid localStorage reads per frame)
    this.hudHighScore = 0;
    this.nearMissStreak = 0;
    this.nearMissStreakTimer = 0;
    this.nearMissSparkTimer = 0;
    this.lastBounceTime = 0;
    this._prevBounceInterval = 0;
    this._rhythmCount = 0;
    this._bounceStartY = 0;
    this._bounceApexShown = false;
    this._apexLineY = 0;
    this._apexLineTimer = 0;
    this.deathCause = '';
    this.runBounces = 0;
    this.wallFlashSide = 0;
    this.wallFlashTimer = 0;
    this.wallBounceStreak = 0;
    this.wallBounceStreakTimer = 0;
    this.scoreShake = 0;
    this.powerupFlashTimer = 0;
    this.powerupFlashColor = '255,255,255';
    this.cameraZoom = 0;
    this.lastCollectX = 0;
    this.lastCollectY = 0;
    this._prevCollectX = 0;
    this._prevCollectY = 0;
    this.collectChainTimer = 0;
    this.comboBreakFlash = 0;
    this._impactWaveX = 0;
    this._impactWaveY = 0;
    this._impactWaveTimer = 0;
    this._impactWaveStr = 0;
    this._deathMarkerX = 0;
    this._deathMarkerY = 0;
    this._deathMarkerTimer = 0;
    this._groundRippleX = 0;
    this._groundRippleTimer = 0;
    this._groundRippleStr = 0;
    this._milestoneRingTimer = 0;
    this._milestoneRingColor = '255,215,0';

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
    SB._difficulty = this.spawner.difficulty;
    this.background.comboBoost = this.comboCount >= 3 ? Math.min(this.comboCount / 7, 1) : 0;
    this.background.update(dt, bgDiff);

    if (this.screenShake > 0) this.screenShake -= dt;
    if (this.screenFlash > 0) this.screenFlash -= dt;
    if (this.powerupFlashTimer > 0) this.powerupFlashTimer -= dt;
    if (this.cameraZoom > 0) this.cameraZoom = Math.max(0, this.cameraZoom - dt * 5);
    if (this.wallFlashTimer > 0) this.wallFlashTimer -= dt;
    if (this.wallBounceStreakTimer > 0) {
        this.wallBounceStreakTimer -= dt;
        if (this.wallBounceStreakTimer <= 0) this.wallBounceStreak = 0;
    }
    if (this.scoreShake > 0) this.scoreShake -= dt;
    if (this.collectChainTimer > 0) this.collectChainTimer -= dt;
    if (this.comboBreakFlash > 0) this.comboBreakFlash -= dt;
    if (this._impactWaveTimer > 0) this._impactWaveTimer -= dt;
    if (this._deathMarkerTimer > 0) this._deathMarkerTimer -= dt;
    if (this._groundRippleTimer > 0) this._groundRippleTimer -= dt;
    if (this._milestoneRingTimer > 0) this._milestoneRingTimer -= dt;
    if (this.transitionAlpha > 0) this.transitionAlpha -= dt * 3;
    if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) {
            if (this.comboCount >= 3) {
                SB.audio.playComboBreak();
                this.screenShake = 0.1;
                this.screenShakeIntensity = 3;
                this.comboBreakFlash = 0.15;
                if (!SB.reducedMotion) {
                    var cbColor = this.comboCount >= 5 ? '255,68,68' : '255,140,66';
                    this.particles.emit(this.ball.x, this.ball.y, {
                        count: 6, spread: SB.TAU, speedMin: 30, speedMax: 80,
                        lifeMin: 0.2, lifeMax: 0.5, sizeMin: 1, sizeMax: 2.5,
                        color: cbColor, gravity: 60, friction: 0.92
                    });
                }
            }
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
    if (!SB.reducedMotion && Math.random() < 0.12) {
        this.particles.emit(Math.random() * SB.canvasWidth, -5, {
            count: 1, spread: 0.3, speedMin: 10, speedMax: 30,
            lifeMin: 1.5, lifeMax: 3.0, sizeMin: 0.5, sizeMax: 1.5,
            color: '255,215,0', angle: Math.PI / 2, angleSpread: 0.3,
            gravity: 15, friction: 0.99
        });
    }
    this.particles.update(dt);
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
        SB.audio.stopAmbient();
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
        var smDt = dt * 0.15;
        this.ball.update(smDt);
        this.particles.update(smDt);
        if (this.deathRipple > 0) this.deathRipple -= dt * 1.2;
        this.input.consumeTap();
        return;
    }

    // Check pause
    if (SB._pauseBtnTapped) {
        SB._pauseBtnTapped = null;
        this.state = SB.STATES.PAUSED;
        this.ui.pauseFade = 0;
        SB.audio.playPause();
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
                var tutMsgs = ['Nice!', 'Great!', 'Let\'s go!'];
                this.ui.addScorePopup(this.ball.x, this.ball.y - 20, tutMsgs[this.tutorialStep - 1] || 'Go!', '#5DADE2');
                if (this.tutorialStep >= 3) this.showTutorial = false;
            }
        }
    } else if (this.input.consumeTap()) {
        var tapColor = ({ CALM: '93,173,226', RISING: '243,156,18', INTENSE: '231,76,60', EXTREME: '155,89,182' })[this.currentZone.name] || '255,255,255';
        this.ui.addTapRipple(this.input.tapX, this.input.tapY, tapColor);
        // Double-tap power bounce (within 180ms)
        var now = SB.frameTime || 0;
        var isDoubleTap = (now - this.lastBounceTime) < 180;
        var bounceInterval = now - this.lastBounceTime;
        if (this._prevBounceInterval && bounceInterval > 200 && bounceInterval < 1500) {
            var ratio = Math.min(this._prevBounceInterval, bounceInterval) / Math.max(this._prevBounceInterval, bounceInterval);
            if (ratio > 0.8) {
                this._rhythmCount = (this._rhythmCount || 0) + 1;
                if (this._rhythmCount >= 3) {
                    var rbBonus = this._rhythmCount;
                    this.score += rbBonus;
                    this.ui.addScorePopup(this.ball.x, this.ball.y - 40, 'RHYTHM x' + this._rhythmCount + ' +' + rbBonus, '#5DADE2');
                    this.ball.trailBoost = Math.min(this.ball.trailBoost + 0.3, 1.5);
                }
            } else {
                this._rhythmCount = 0;
            }
        }
        this._prevBounceInterval = bounceInterval;
        this.lastBounceTime = now;
        // Perfect bounce: ball falling fast + near bottom half of screen
        var preBounceVy = this.ball.vy;
        var isPerfect = preBounceVy > SB.Physics.MAX_FALL_SPEED * 0.65 && this.ball.y > SB.canvasHeight * 0.6;
        this._bounceStartY = this.ball.y;
        this._bounceApexShown = false;
        this.ui.addTapRipple(this.ball.x, this.ball.y + this.ball.radius, '255,255,255');
        this.ball.bounce(this.input.tapX);
        this.background.bounceShift = 0.3 + Math.min(Math.abs(preBounceVy) / SB.Physics.MAX_FALL_SPEED, 1) * 0.4;
        if (isDoubleTap) {
            this.ball.vy *= 1.25;
            this.ball.trailBoost = 1.0;
            this.cameraZoom = 0.15;
            this.screenFlash = 0.04;
            this.particles.emit(this.ball.x, this.ball.y + this.ball.radius, SB.FX.powerBounce);
            this.ui.addPickupRing(this.ball.x, this.ball.y + this.ball.radius, '93,173,226');
            this.ui.addPickupRing(this.ball.x, this.ball.y, '150,200,255');
            this.background.bounceShift = 0.7;
            if (!SB.reducedMotion) {
                for (var pbi = 0; pbi < 6; pbi++) {
                    var pbAngle = SB.TAU * pbi / 6;
                    this.particles.emit(this.ball.x + Math.cos(pbAngle) * this.ball.radius, this.ball.y + Math.sin(pbAngle) * this.ball.radius, {
                        count: 1, spread: 0, speedMin: 80, speedMax: 150,
                        lifeMin: 0.15, lifeMax: 0.3, sizeMin: 1, sizeMax: 2.5,
                        color: '93,173,226', angle: pbAngle, angleSpread: 0.3,
                        gravity: 0, friction: 0.88
                    });
                }
            }
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
        if (preBounceVy > SB.Physics.MAX_FALL_SPEED * 0.4) {
            this._impactWaveX = this.ball.x;
            this._impactWaveY = this.ball.y + this.ball.radius;
            this._impactWaveTimer = 0.35;
            this._impactWaveStr = Math.min((preBounceVy - SB.Physics.MAX_FALL_SPEED * 0.4) / (SB.Physics.MAX_FALL_SPEED * 0.6), 1);
        }
        if (preBounceVy > SB.Physics.MAX_FALL_SPEED * 0.3) {
            this._groundRippleX = this.ball.x;
            this._groundRippleTimer = 0.4;
            this._groundRippleStr = Math.min((preBounceVy - SB.Physics.MAX_FALL_SPEED * 0.3) / (SB.Physics.MAX_FALL_SPEED * 0.7), 1);
        }
        // Ground impact crack lines (brief radial lines from bounce point)
        if (preBounceVy > SB.Physics.MAX_FALL_SPEED * 0.5 && !SB.reducedMotion) {
            var crackCount = preBounceVy > SB.Physics.MAX_FALL_SPEED * 0.8 ? 4 : 2;
            for (var ci = 0; ci < crackCount; ci++) {
                var cAngle = Math.PI + (ci / (crackCount - 1 || 1) - 0.5) * Math.PI * 0.6;
                this.particles.emit(this.ball.x, this.ball.y + this.ball.radius, {
                    count: 1, spread: 0, speedMin: 60, speedMax: 120,
                    lifeMin: 0.1, lifeMax: 0.2, sizeMin: 0.5, sizeMax: 1,
                    color: '200,200,220', angle: cAngle, angleSpread: 0.15,
                    gravity: 200, friction: 0.85
                });
            }
        }
        // Dust puff when bouncing while falling (heavier at higher speed, directional)
        if (preBounceVy > 100) {
            this.particles.emit(this.ball.x - this.ball.radius, this.ball.y + this.ball.radius, SB.FX.bounceDust);
            this.particles.emit(this.ball.x + this.ball.radius, this.ball.y + this.ball.radius, SB.FX.bounceDust);
            if (preBounceVy > SB.Physics.MAX_FALL_SPEED * 0.5 && !SB.reducedMotion) {
                var dustAngle = this.ball.vx > 0 ? Math.PI * 0.8 : Math.PI * 0.2;
                this.particles.emit(this.ball.x, this.ball.y + this.ball.radius, {
                    count: 2, spread: 0, speedMin: 30, speedMax: 60,
                    lifeMin: 0.2, lifeMax: 0.4, sizeMin: 1, sizeMax: 2,
                    color: '180,180,180', angle: dustAngle, angleSpread: 0.4,
                    gravity: 40, friction: 0.92
                });
            }
        }
        this.achievements.onBounce();
        this.runBounces++;
        if (isPerfect) {
            this._perfectStreak = (this._perfectStreak || 0) + 1;
            var pfBonus = 3 + Math.min(this._perfectStreak - 1, 5);
            this.score += pfBonus;
            var pfLabel = this._perfectStreak >= 2 ? 'PERFECT x' + this._perfectStreak + ' +' + pfBonus : 'PERFECT +' + pfBonus;
            this.ui.addScorePopup(this.ball.x, this.ball.y - 25, pfLabel, '#00FF88');
            this.particles.emit(this.ball.x, this.ball.y, { count: 8 + this._perfectStreak * 2, spread: SB.TAU, speedMin: 60, speedMax: 140, lifeMin: 0.3, lifeMax: 0.6, sizeMin: 1.5, sizeMax: 3, color: '0,255,136', gravity: 50, friction: 0.92 });
            this.ui.addPickupRing(this.ball.x, this.ball.y, '0,255,136');
            this.ui.addPickupRing(this.ball.x, this.ball.y, '255,215,0');
            this.cameraZoom = 0.1 + Math.min(this._perfectStreak, 3) * 0.03;
            SB.audio.playPerfectBounce();
            if (navigator.vibrate) navigator.vibrate(12);
        } else if (isDoubleTap) {
            this._perfectStreak = 0;
            this._doubleTapStreak = (this._doubleTapStreak || 0) + 1;
            var dtBonus = 2 + Math.min(this._doubleTapStreak - 1, 3);
            this.score += dtBonus;
            var dtLabel = this._doubleTapStreak >= 2 ? 'POWER x' + this._doubleTapStreak + ' +' + dtBonus : 'POWER +' + dtBonus;
            this.ui.addScorePopup(this.ball.x, this.ball.y - 25, dtLabel, '#5DADE2');
            SB.audio.playPerfectBounce();
            if (navigator.vibrate) navigator.vibrate(15);
        } else {
            this._perfectStreak = 0;
            this._doubleTapStreak = 0;
            SB.audio.playBounce();
        }
        if (this.runBounces > 0 && this.runBounces % 25 === 0) {
            this.screenFlash = 0.06;
        }
        if (this.runBounces === 50 || this.runBounces === 100 || this.runBounces === 200) {
            this.ui.addScorePopup(this.ball.x, this.ball.y - 40, this.runBounces + ' BOUNCES!', '#5DADE2');
            SB.audio.playMilestone(this.runBounces >= 200 ? 3 : this.runBounces >= 100 ? 2 : 1);
        }
    }

    this.ball.comboIntensity = this.comboCount >= 5 ? 1.0 : (this.comboCount >= 3 ? 0.5 : 0);
    var prevVy = this.ball.vy;
    this.ball.update(dt);
    SB._ballVx = this.ball.vx;
    if (prevVy < 0 && this.ball.vy >= 0 && !this._bounceApexShown && this._bounceStartY) {
        this._bounceApexShown = true;
        var apexHeight = this._bounceStartY - this.ball.y;
        if (apexHeight > 80) {
            this._apexLineY = this.ball.y;
            this._apexLineTimer = 0.4;
        }
        if (apexHeight > 50) {
            this.ball.bounceGlow = Math.min(this.ball.bounceGlow + 0.4, 1);
        }
    }
    if (this._apexLineTimer > 0) this._apexLineTimer -= dt;

    // Fast-fall sparkle particles behind ball
    var fallFrac = Math.abs(this.ball.vy) / SB.Physics.MAX_FALL_SPEED;
    if (fallFrac > 0.5 && Math.random() < (fallFrac - 0.5) * 0.6 && !SB.reducedMotion) {
        var glowRGB = SB.hexToRGB(this.ball.glowColor || '#FFD700');
        this.particles.emit(this.ball.x + SB.randRange(-4, 4), this.ball.y - this.ball.radius * (this.ball.vy > 0 ? -1 : 1), {
            count: 1, spread: 0, speedMin: 15, speedMax: 40,
            lifeMin: 0.1, lifeMax: 0.25, sizeMin: 0.5, sizeMax: 2,
            color: glowRGB, gravity: 0, friction: 0.9
        });
    }

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
        // Vertical spread particles along wall
        if (!SB.reducedMotion) {
            for (var wsi = 0; wsi < 3; wsi++) {
                this.particles.emit(wx, this.ball.y + (wsi - 1) * 8, {
                    count: 1, spread: 0, speedMin: 10, speedMax: 30,
                    lifeMin: 0.15, lifeMax: 0.25, sizeMin: 0.8, sizeMax: 1.5,
                    color: '255,255,255', angle: this.ball.wallHitSide < 0 ? 0 : Math.PI,
                    angleSpread: 0.3, gravity: 60, friction: 0.9
                });
            }
        }
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
            this.ui.addPickupRing(this.ball.x, this.ball.y, '93,173,226');
            if (this.wallBounceStreak >= 5) {
                this.screenFlash = 0.04;
                this.cameraZoom = 0.08;
            }
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
    if (pe.scoreMult && pe.scoreMultTimer <= dt) {
        this.screenFlash = 0.06;
        this.ui.addScorePopup(SB.canvasWidth / 2, 60, 'x2 ENDED', 'rgba(255,213,79,0.6)');
    }
    if (pe.shield && pe.shieldTimer <= dt) {
        this.screenFlash = 0.04;
    }
    if (pe.magnet && pe.magnetTimer <= dt) {
        this.screenFlash = 0.04;
    }
    if (pe.slow && pe.slowTimer <= dt) {
        this.screenFlash = 0.04;
    }

    // Near-miss streak timer decay
    if (this.nearMissStreakTimer > 0) {
        this.nearMissStreakTimer -= dt;
        if (this.nearMissStreakTimer <= 0) this.nearMissStreak = 0;
    }
    if (this.nearMissSparkTimer > 0) this.nearMissSparkTimer -= dt;

    this.powerupEffects.update(dt);
    this.particles.update(dt);
    this.achievements.updateRunTime(dt);
    this.runSurviveTime += dt;

    // Powerup active shimmer particles orbiting ball
    if ((pe.shield || pe.magnet || pe.slow || pe.scoreMult) && Math.random() < 0.25 && !SB.reducedMotion) {
        var puColor = pe.shield ? '52,152,219' : pe.magnet ? '155,89,182' : pe.slow ? '46,204,113' : '255,193,7';
        var puAngle = Math.random() * SB.TAU;
        var puDist = this.ball.radius + 10 + Math.random() * 8;
        this.particles.emit(this.ball.x + Math.cos(puAngle) * puDist, this.ball.y + Math.sin(puAngle) * puDist, {
            count: 1, spread: 0, speedMin: 5, speedMax: 15,
            lifeMin: 0.2, lifeMax: 0.4, sizeMin: 0.5, sizeMax: 1.5,
            color: puColor, gravity: -20, friction: 0.9
        });
    }

    if (this.invincibleTimer > 0) {
        this.invincibleTimer -= dt;
        this.ball.blinking = true;
        if (!SB.reducedMotion && Math.random() < 0.3) {
            var isAngle = Math.random() * SB.TAU;
            this.particles.emit(this.ball.x + Math.cos(isAngle) * this.ball.radius, this.ball.y + Math.sin(isAngle) * this.ball.radius, {
                count: 1, spread: 0.5, speedMin: 5, speedMax: 20,
                lifeMin: 0.2, lifeMax: 0.5, sizeMin: 0.5, sizeMax: 1.5,
                color: '255,215,0', angle: isAngle + Math.PI, angleSpread: 0.3,
                gravity: -10, friction: 0.95
            });
        }
    } else {
        this.ball.blinking = false;
    }

    // Zone tracking
    this._updateZone();

    var cw = SB.canvasWidth;
    var ch = SB.canvasHeight;

    this.spawner.update(dt * slowMult, this.score, cw, ch);

    if (this.spawner.lastSpawnedPowerup) {
        this.spawner.lastSpawnedPowerup = false;
        this.screenFlash = 0.06;
    }
    if (this.spawner.lastSpawnedObstacle) {
        this.spawner.lastSpawnedObstacle = false;
        SB.audio.playObstacleWarn();
        var activeObs = this.obstaclePool.getActive();
        if (activeObs.length > 0) {
            var newest = activeObs[activeObs.length - 1];
            var nCx = newest.radius ? newest.x + newest.radius : newest.x + (newest.width || 0) / 2;
            var nCy = newest.radius ? newest.y + newest.radius : newest.y + (newest.height || 0) / 2;
            this.ui.addPickupRing(nCx, nCy, '231,76,60');
        }
    }

    // --- Obstacles ---
    this._maxDangerGlow = 0;
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

        if (obs.type === SB.OBSTACLE_TYPES.BOOMERANG && obs.returnFlash > 0.28) {
            SB.audio.playBoomerangReturn();
            var brRx = obs.x + (obs.radius || 10);
            var brRy = obs.y + (obs.radius || 10);
            this.ui.addPickupRing(brRx, brRy, '255,152,0');
        }

        if (obs.type === SB.OBSTACLE_TYPES.LASER && obs.laserPhase === 'charge' && !SB.reducedMotion && Math.random() < 0.5) {
            var lcX = SB.randRange(0, cw);
            this.particles.emit(lcX, obs.y + SB.randRange(-3, 3), {
                count: 1, spread: 0, speedMin: 30, speedMax: 80,
                lifeMin: 0.1, lifeMax: 0.2, sizeMin: 0.5, sizeMax: 1.5,
                color: '100,200,255', angle: lcX < cw / 2 ? 0 : Math.PI, angleSpread: 0.3,
                gravity: 0, friction: 0.9
            });
        }

        if (!SB.reducedMotion && Math.random() < 0.2) {
            if (obs.type === SB.OBSTACLE_TYPES.BOOMERANG) {
                var brCx = obs.x + (obs.radius || 10);
                var brCy = obs.y + (obs.radius || 10);
                this.particles.emit(brCx + SB.randRange(-5, 5), brCy + SB.randRange(-5, 5), {
                    count: 1, spread: 0, speedMin: 5, speedMax: 15,
                    lifeMin: 0.15, lifeMax: 0.3, sizeMin: 0.5, sizeMax: 1.5,
                    color: '231,76,60', gravity: 0, friction: 0.9
                });
            } else if (obs.type === SB.OBSTACLE_TYPES.BLADE) {
                var blCx = obs.x + (obs.radius || 10);
                var blCy = obs.y + (obs.radius || 10);
                this.particles.emit(blCx + SB.randRange(-3, 3), blCy + SB.randRange(-3, 3), {
                    count: 1, spread: 0, speedMin: 8, speedMax: 20,
                    lifeMin: 0.1, lifeMax: 0.25, sizeMin: 0.5, sizeMax: 1,
                    color: '180,180,190', gravity: 0, friction: 0.85
                });
            } else if (obs.type === SB.OBSTACLE_TYPES.GRAVITY_WELL) {
                var gwCx = obs.x + (obs.radius || 30);
                var gwCy = obs.y + (obs.radius || 30);
                var gwA = obs.wellPhase + Math.random() * SB.TAU;
                var gwDist = (obs.radius || 30) * (0.5 + Math.random() * 0.6);
                this.particles.emit(gwCx + Math.cos(gwA) * gwDist, gwCy + Math.sin(gwA) * gwDist, {
                    count: 1, spread: 0, speedMin: 5, speedMax: 15,
                    lifeMin: 0.2, lifeMax: 0.5, sizeMin: 0.5, sizeMax: 1.5,
                    color: '155,89,182', angle: gwA + Math.PI * 0.5, angleSpread: 0.3,
                    gravity: 0, friction: 0.8
                });
            }
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
            if (obs.dangerGlow > (this._maxDangerGlow || 0)) this._maxDangerGlow = obs.dangerGlow;
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
                // Purple attraction glow on ball
                if (pullFactor > 0.3 && !SB.reducedMotion && Math.random() < pullFactor * 0.4) {
                    var gwAngle = Math.atan2(wdy, wdx) + SB.randRange(-0.5, 0.5);
                    this.particles.emit(this.ball.x + Math.cos(gwAngle) * this.ball.radius, this.ball.y + Math.sin(gwAngle) * this.ball.radius, {
                        count: 1, spread: 0, speedMin: 15, speedMax: 40,
                        lifeMin: 0.1, lifeMax: 0.25, sizeMin: 0.5, sizeMax: 1.5,
                        color: '155,89,182', angle: gwAngle, angleSpread: 0.3,
                        gravity: 0, friction: 0.85
                    });
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
                this.ui.addPickupRing(this.ball.x, this.ball.y, '243,156,18');
                if (!SB.reducedMotion) {
                    var nmColor = obs.type === SB.OBSTACLE_TYPES.BLADE ? '180,180,190' : obs.type === SB.OBSTACLE_TYPES.SPIKE ? '255,100,80' : '200,200,200';
                    var nmCy = obs.radius ? obs.y + obs.radius : obs.y;
                    this.particles.emit(this.ball.x, nmCy, { count: 4, spread: SB.TAU, speedMin: 15, speedMax: 40, lifeMin: 0.2, lifeMax: 0.4, sizeMin: 0.5, sizeMax: 1.5, color: nmColor, gravity: 30, friction: 0.9 });
                }
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
                if (navigator.vibrate) navigator.vibrate(15);
                SB.audio.playNearMiss(this.nearMissStreak);
                this.nearMissSparkTimer = 0.5;
                if (this.nearMissStreak >= 2) {
                    this.ball.trailBoost = Math.min(this.ball.trailBoost + 0.4, 1.5);
                }
                if (navigator.vibrate) navigator.vibrate(15);
            }
        }

        if (hit) {
            if (this.invincibleTimer > 0) {
                obs.active = false;
                this.particles.emit(this.ball.x, this.ball.y, { count: 5, spread: SB.TAU, speedMin: 40, speedMax: 100, lifeMin: 0.2, lifeMax: 0.4, sizeMin: 1, sizeMax: 2, color: '255,255,255', gravity: 0, friction: 0.9 });
                continue;
            }
            if (this.powerupEffects.useShield()) {
                var obsCx = obs.radius ? obs.x + obs.radius : obs.x + (obs.width || 0) / 2;
                var obsCy = obs.radius ? obs.y + obs.radius : obs.y + (obs.height || 0) / 2;
                obs.active = false;
                this.screenShake = 0.25;
                this.screenShakeIntensity = 8;
                this.screenFlash = 0.08;
                this.powerupFlashTimer = 0.2;
                this.powerupFlashColor = '52,152,219';
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
                this.ui.addPickupRing(this.ball.x, this.ball.y, '52,152,219');
                this.ui.addPickupRing(this.ball.x, this.ball.y, '52,152,219');
                this.ui.addPickupRing(obsCx, obsCy, obsColor);
                if (!SB.reducedMotion) {
                    for (var sbi = 0; sbi < 8; sbi++) {
                        var sbAngle = SB.TAU * sbi / 8;
                        this.particles.emit(this.ball.x + Math.cos(sbAngle) * (this.ball.radius + 8), this.ball.y + Math.sin(sbAngle) * (this.ball.radius + 8), {
                            count: 1, spread: 0, speedMin: 60, speedMax: 120,
                            lifeMin: 0.2, lifeMax: 0.35, sizeMin: 1, sizeMax: 2,
                            color: '52,152,219', angle: sbAngle, angleSpread: 0.2,
                            gravity: 0, friction: 0.85
                        });
                    }
                    var stAngle = Math.atan2(this.ball.y - obsCy, this.ball.x - obsCx);
                    for (var sti = 0; sti < 3; sti++) {
                        var stFrac = (sti + 1) / 4;
                        var stX = obsCx + (this.ball.x - obsCx) * stFrac;
                        var stY = obsCy + (this.ball.y - obsCy) * stFrac;
                        this.particles.emit(stX, stY, {
                            count: 2, spread: 0.5, speedMin: 20, speedMax: 50,
                            lifeMin: 0.15, lifeMax: 0.3, sizeMin: 0.5, sizeMax: 1.5,
                            color: '52,152,219', angle: stAngle, angleSpread: 0.8,
                            gravity: 0, friction: 0.9
                        });
                    }
                }
                continue;
            }
            this.deathCause = obs.type === SB.OBSTACLE_TYPES.PLATFORM ? 'Platform' :
                             obs.type === SB.OBSTACLE_TYPES.SPIKE ? 'Spike' :
                             obs.type === SB.OBSTACLE_TYPES.BLADE ? 'Blade' :
                             obs.type === SB.OBSTACLE_TYPES.BOOMERANG ? 'Boomerang' :
                             obs.type === SB.OBSTACLE_TYPES.LASER ? 'Laser' : 'Obstacle';
            var deathColor = obs.type === SB.OBSTACLE_TYPES.SPIKE ? '255,100,50' :
                             obs.type === SB.OBSTACLE_TYPES.BLADE ? '180,180,200' :
                             obs.type === SB.OBSTACLE_TYPES.LASER ? '100,200,255' :
                             obs.type === SB.OBSTACLE_TYPES.BOOMERANG ? '255,152,0' : '231,76,60';
            this.particles.emit(this.ball.x, this.ball.y, { count: 18, spread: SB.TAU, speedMin: 80, speedMax: 250, lifeMin: 0.3, lifeMax: 0.7, sizeMin: 2, sizeMax: 5, color: deathColor, gravity: 200, friction: 0.95 });
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

        if (col._proximity > 0.5 && col.type === SB.COLLECTIBLE_TYPES.STAR && Math.random() < col._proximity * 0.3 && !SB.reducedMotion) {
            this.particles.emit(col.x + SB.randRange(-8, 8), col.y + SB.randRange(-8, 8), {
                count: 1, spread: 0, speedMin: 10, speedMax: 25, lifeMin: 0.15, lifeMax: 0.3, sizeMin: 0.5, sizeMax: 1.5, color: '255,215,0', gravity: -15, friction: 0.9
            });
        }

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
            if (!isCoin && !SB.reducedMotion) {
                this.particles.emit(col.x, col.y, {
                    count: 3, spread: 0, speedMin: 40, speedMax: 80,
                    lifeMin: 0.3, lifeMax: 0.5, sizeMin: 0.8, sizeMax: 1.5,
                    color: '255,215,0', angle: -Math.PI / 2, angleSpread: 0.6,
                    gravity: 60, friction: 0.95
                });
            }
            var zoneRingColor = isCoin ? '255,180,0' : (({ CALM: '255,215,0', RISING: '255,200,100', INTENSE: '255,150,100', EXTREME: '200,150,255' })[this.currentZone.name] || '255,215,0');
            this.ui.addPickupRing(col.x, col.y, zoneRingColor);
            if (!isCoin) this.ui.addPickupRing(col.x, col.y, '255,255,255');
            if (!isCoin && this.comboCount >= 2) {
                this.ui.addPickupRing(col.x, col.y, zoneRingColor);
            }
            if (!isCoin && !SB.reducedMotion) {
                this.particles.emit(col.x, col.y, {
                    count: 4, spread: SB.TAU, speedMin: 15, speedMax: 40,
                    lifeMin: 0.4, lifeMax: 0.7, sizeMin: 0.5, sizeMax: 1.2,
                    color: '255,230,120', gravity: 80, friction: 0.97
                });
            }
            if (this.collectChainTimer > 0 && this.comboCount >= 1) {
                this.ui.addChainLine(this.lastCollectX, this.lastCollectY, col.x, col.y, this.comboCount);
            }
            this._prevCollectX = this.lastCollectX;
            this._prevCollectY = this.lastCollectY;
            this.lastCollectX = col.x;
            this.lastCollectY = col.y;
            this.collectChainTimer = 2.0;
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
                if (!SB.reducedMotion) {
                    var flyAngle = Math.atan2(10 - col.y, cw - 12 - col.x);
                    this.particles.emit(col.x, col.y, {
                        count: 3, spread: 0, speedMin: 200, speedMax: 350,
                        lifeMin: 0.3, lifeMax: 0.5, sizeMin: 1, sizeMax: 2,
                        color: '255,215,0', angle: flyAngle, angleSpread: 0.2,
                        gravity: -50, friction: 0.96
                    });
                }
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
            this.ui.addPickupRing(pu.x, pu.y, '255,255,255');
            if (!SB.reducedMotion) {
                this.particles.emit(pu.x, pu.y, {
                    count: 6, spread: SB.TAU, speedMin: 60, speedMax: 120,
                    lifeMin: 0.2, lifeMax: 0.4, sizeMin: 1, sizeMax: 2.5,
                    color: puPreset.color || '255,255,255', gravity: 0, friction: 0.9
                });
            }
            pu.active = false;
            this.powerupEffects.activate(pu.type);
            this.powerupFlashTimer = 0.15;
            this.powerupFlashColor = puPreset.color || '255,255,255';
            this.cameraZoom = 0.12;
            this.achievements.onPowerupCollect();
            if (pu.type === SB.POWERUP_TYPES.SCORE_MULT) {
                this.achievements.onScoreMultUse();
                this.screenFlash = 0.1;
                this.ui.addScorePopup(pu.x, pu.y - 20, 'x2 SCORE!', '#FFD54F');
            }
            var puLabels = { shield: 'SHIELD!', magnet: 'MAGNET!', slow: 'SLOW-MO!', score_mult: 'x2 SCORE!' };
            var puLabelColors = { shield: '#5DADE2', magnet: '#AF7AC5', slow: '#58D68D', score_mult: '#FFD54F' };
            if (pu.type !== SB.POWERUP_TYPES.SCORE_MULT) {
                this.ui.addScorePopup(pu.x, pu.y - 20, puLabels[pu.type] || 'POWERUP!', puLabelColors[pu.type] || '#FFFFFF');
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
        this.ball.bounceGlow = Math.max(this.ball.bounceGlow, 0.3);
    }

    // Mid-game PB notification (fire once)
    if (!this.isNewHigh && this.hudHighScore > 0 && this.score > this.hudHighScore) {
        this.isNewHigh = true;
        this.screenFlash = 0.1;
        this.cameraZoom = 0.12;
        this.ui.addScorePopup(cw / 2, ch * 0.15, 'NEW PB!', '#76FF03');
        this.ui.addPickupRing(cw / 2, ch * 0.15, '118,255,3');
        this.ui.addPickupRing(this.ball.x, this.ball.y, '118,255,3');
        if (!SB.reducedMotion) {
            this.particles.emit(cw / 2, ch * 0.15, {
                count: 10, spread: SB.TAU, speedMin: 50, speedMax: 120,
                lifeMin: 0.3, lifeMax: 0.6, sizeMin: 1, sizeMax: 2.5,
                color: '118,255,3', gravity: 40, friction: 0.93
            });
        }
        SB.audio.playMilestone(2);
        if (navigator.vibrate) navigator.vibrate(30);
    }

    var currentMilestone = Math.floor(this.score / 10);
    if (currentMilestone > this.lastMilestone) {
        this.lastMilestone = currentMilestone;
        var msTier = currentMilestone >= 20 ? 3 : currentMilestone >= 10 ? 2 : currentMilestone >= 5 ? 1 : 0;
        SB.audio.playMilestone(msTier);
        this.ui.addPickupRing(this.ball.x, this.ball.y, '255,215,0');
        this.ui.scoreFlash = 0.4;
        this.ui.scoreSizePulse = 0.4;
        this._milestoneRingTimer = 0.5;
        this._milestoneRingColor = msTier >= 2 ? '255,100,100' : (msTier >= 1 ? '255,180,50' : '255,215,0');
        // Special celebrations at key milestones
        var milestoneScore = currentMilestone * 10;
        if (milestoneScore === 25 || milestoneScore === 50 || milestoneScore === 100 || milestoneScore === 200) {
            this.background.triggerShootingStar(milestoneScore >= 100 ? 3 : 2);
            this.screenFlash = 0.1;
            this.cameraZoom = milestoneScore >= 100 ? 0.15 : 0.08;
            this.particles.emit(cw / 2, ch * 0.3, SB.FX.starCollect);
            this.particles.emit(cw / 2, ch * 0.3, SB.FX.starCollect);
            // Fireworks from screen edges
            this.particles.emit(0, ch * 0.6, SB.FX.milestoneFirework);
            this.particles.emit(cw, ch * 0.6, SB.FX.milestoneFireworkR);
            this.particles.emit(cw * 0.2, 0, SB.FX.milestoneConfettiL);
            this.particles.emit(cw * 0.8, 0, SB.FX.milestoneConfettiR);
            if (milestoneScore >= 100) {
                this.particles.emit(cw * 0.3, 0, SB.FX.milestoneFireworkDown);
                this.particles.emit(cw * 0.7, 0, SB.FX.milestoneFireworkDown);
                this.particles.emit(cw * 0.5, 0, SB.FX.milestoneConfettiL);
                this.particles.emit(cw * 0.5, 0, SB.FX.milestoneConfettiR);
            }
            this.ui.milestoneMsg = milestoneScore + ' POINTS!';
            this.ui.milestoneMsgTimer = 1.5;
            if (navigator.vibrate) navigator.vibrate(30);
        }
    }

    // Update BGM intensity with difficulty
    SB.audio.updateBGMIntensity(this.spawner.difficulty);

    var ballDanger = SB.clamp((this.ball.y - ch * 0.7) / (ch * 0.3), 0, 1);
    SB.audio.setBGMDanger(ballDanger);

    var preAchCount = this.achievements.pendingNotifications.length;
    this.achievements.checkAll();
    if (this.achievements.pendingNotifications.length > preAchCount) {
        this.screenFlash = 0.15;
        this.cameraZoom = 0.1;
        this.particles.emit(cw / 2, ch * 0.12, { count: 12, spread: SB.TAU, speedMin: 40, speedMax: 100, lifeMin: 0.4, lifeMax: 0.8, sizeMin: 1, sizeMax: 2.5, color: '255,215,0', gravity: 40, friction: 0.95 });
    }

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
    this.ball.y += Math.sin((SB.frameTime || 0) * 0.002) * 0.15;
    this.ball.bounceGlow = 0.1 + (Math.sin((SB.frameTime || 0) * 0.003) + 1) / 2 * 0.15;
    if (SB._resumeBtnTapped) {
        SB._resumeBtnTapped = null;
        SB._resumeBtn = null;
        SB._quitBtn = null;
        this.state = SB.STATES.PLAYING;
        SB.audio.playResume();
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
        SB.audio.playResume();
        SB.audio.startBGM();
    }
};

SB.Game.prototype._handleDeath = function() {
    if (navigator.vibrate) navigator.vibrate(80);
    this.screenFlash = 0.12;
    this.screenShake = 0.4;
    this.screenShakeIntensity = 14;
    this.ui.addPickupRing(this.ball.x, this.ball.y, '231,76,60');
    this.ui.addPickupRing(this.ball.x, this.ball.y, '255,100,100');
    this.deathRipple = 1.0;
    this.deathRippleX = this.ball.x;
    this.deathRippleY = this.ball.y;
    this.deathSlowMo = 0.3;
    this._deathMarkerX = this.ball.x;
    this._deathMarkerY = this.ball.y;
    this._deathMarkerTimer = 2.0;
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
            this.screenFlash = 0.2;
            this.cameraZoom = 0.15;
            this.ui.addPickupRing(SB.canvasWidth / 2, SB.canvasHeight * 0.4, '255,215,0');
            this.ui.addPickupRing(SB.canvasWidth / 2, SB.canvasHeight * 0.4, '255,255,255');
            this.ui.addPickupRing(SB.canvasWidth / 2, SB.canvasHeight * 0.4, '200,200,255');
            this.particles.emit(SB.canvasWidth / 2, SB.canvasHeight * 0.4, {
                count: 16, spread: SB.TAU, speedMin: 60, speedMax: 150,
                lifeMin: 0.5, lifeMax: 1.0, sizeMin: 1.5, sizeMax: 3,
                color: '255,215,0', gravity: 40, friction: 0.92
            });
            this.particles.emit(SB.canvasWidth / 2, SB.canvasHeight * 0.4, SB.FX.starCollect);
            this.ball.y = SB.canvasHeight * 0.4;
            this.ball.vy = SB.Physics.BOUNCE_IMPULSE * 0.5;
            this.ball.vx = 0;
            // Clear nearby obstacles with fade-out (handle both rect and circular types)
            var obstacles = this.obstaclePool.getActive();
            for (var i = 0; i < obstacles.length; i++) {
                var obs = obstacles[i];
                var ocx = obs.radius ? obs.x + (obs.radius || 0) : obs.x + (obs.width || 0) / 2;
                var ocy = obs.radius ? obs.y + (obs.radius || 0) : obs.y + (obs.height || 0) / 2;
                var dx = this.ball.x - ocx;
                var dy = this.ball.y - ocy;
                if (dx * dx + dy * dy < 22500) { // 150^2
                    obs.fadeOut = 1.0;
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
        SB.audio.playZoneTransition(this.currentZone.threshold);
        this.ui.zoneMsg = this.currentZone.name;
        this.ui.zoneMsgTimer = 2.0;
        this.ui.zoneWipeTimer = 0.5;
        this.ui.zoneWipeColor = ({ CALM: '93,173,226', RISING: '243,156,18', INTENSE: '231,76,60', EXTREME: '155,89,182' })[this.currentZone.name] || '255,255,255';
        this.screenFlash = 0.12;
        var zoneColor = this.ui.zoneWipeColor;
        this.particles.emit(SB.canvasWidth / 2, SB.canvasHeight * 0.5, { count: 12, spread: SB.TAU, speedMin: 80, speedMax: 200, lifeMin: 0.4, lifeMax: 0.8, sizeMin: 1.5, sizeMax: 3, color: zoneColor, gravity: 0, friction: 0.9 });
        // Zone-based trail color tinting (smooth blend via timer)
        this.trailBlendTimer = 1.0;
        this._targetTrailColor = ({
            CALM: null,
            RISING: 'rgba(243,156,18,',
            INTENSE: 'rgba(231,76,60,',
            EXTREME: 'rgba(155,89,182,'
        })[this.currentZone.name] || this.skinManager.getCurrentSkin().trail;
        this.ball.trailColor = this._targetTrailColor;
        var zoneGlow = ({ CALM: null, RISING: '#F39C12', INTENSE: '#E74C3C', EXTREME: '#9B59B6' })[this.currentZone.name];
        this.ball.glowColor = zoneGlow || this.skinManager.getCurrentSkin().glow;
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
    if (SB._shareTapped) {
        SB._shareTapped = false;
        this.ui.shareTapFlash = 0.3;
    }

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
            SB.audio.playAchievement();
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
        this._prevCollectX = 0;
        this._prevCollectY = 0;
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
        this.nearMissSparkTimer = 0;
        this.lastBounceTime = 0;
        this._prevBounceInterval = 0;
        this._rhythmCount = 0;
        this.isNewHigh = false;
        this.deathCause = '';
        this.runBounces = 0;
        this.currentZone = SB.ZONES.CALM;
        this.transitionAlpha = 1;
        this.screenFlash = 0.1;
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
        SB.audio.playGameStart();
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
        var prevRun = SB.Storage.getLastRun();
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
            deathCause: this.deathCause || 'Unknown',
            bounces: this.runBounces
        }, streak, recentRuns, prevRun);
        this.ui.achCount = this.achievements.getUnlockedCount();
        SB.audio.stopBGM();
        SB.audio.playGameOver();
    } else if (newState === SB.STATES.START) {
        this.highScore = SB.Storage.getHighScore();
        this.hudCoins = SB.Storage.getCoins();
        this.hudHighScore = this.highScore;
        SB.audio.startAmbient();
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
        var freq = (1 - shakeT) * 30 + 10;
        var shakeX = Math.sin(freq * this.screenShake) * intensity * (Math.random() * 0.4 + 0.6);
        var shakeY = Math.cos(freq * this.screenShake * 1.3) * intensity * (Math.random() * 0.4 + 0.6);
        ctx.translate(shakeX, shakeY);
    }
    if (this.cameraZoom > 0 && !SB.reducedMotion) {
        var zs = 1 + this.cameraZoom * 0.04;
        ctx.translate(cw / 2, ch / 2);
        ctx.scale(zs, zs);
        ctx.translate(-cw / 2, -ch / 2);
    }
    if (this.comboBreakFlash > 0 && !SB.reducedMotion) {
        var tiltAngle = (this.comboBreakFlash / 0.15) * 0.01 * Math.sin(this.comboBreakFlash * 40);
        ctx.translate(cw / 2, ch / 2);
        ctx.rotate(tiltAngle);
        ctx.translate(-cw / 2, -ch / 2);
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
            this.ui.runSurviveTime = this.runSurviveTime;
            this.ui.ballSpeedFrac = Math.min(Math.abs(this.ball.vy) / SB.Physics.MAX_FALL_SPEED, 1);
            this.ui.currentZone = this.currentZone.name;
            if (!this.daily.completed) {
                this.ui.dailyTarget = this.daily.challenge.target;
                this.ui.dailyProgress = this.score;
            } else {
                this.ui.dailyTarget = 0;
            }
            this.ui._obsCount = this._renderObstacles ? this._renderObstacles.length : 0;
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
                // Safe zone border glow during grace
                if (graceLeft > 0 && !SB.reducedMotion) {
                    var gzA = graceAlpha * 0.08;
                    ctx.strokeStyle = 'rgba(93,173,226,' + gzA.toFixed(3) + ')';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(1, 1, cw - 2, ch - 2);
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
                if (!SB.reducedMotion) {
                    var dbPulse = (Math.sin((SB.frameTime || 0) * 0.015) + 1) / 2;
                    var dbBarH = 3 + dangerAlpha * 4;
                    var dbBarA = dangerAlpha * (0.3 + dbPulse * 0.4);
                    ctx.fillStyle = 'rgba(231,76,60,' + dbBarA.toFixed(3) + ')';
                    ctx.fillRect(0, ch - dbBarH, cw, dbBarH);
                }
            }
            // Slow-motion powerup tint (subtle green overlay + radial lines)
            if (this.powerupEffects.slow) {
                var slowPulse = (Math.sin((SB.frameTime || 0) * 0.003) + 1) / 2 * 0.02 + 0.02;
                ctx.fillStyle = 'rgba(46, 204, 113, ' + slowPulse.toFixed(3) + ')';
                ctx.fillRect(0, 0, cw, ch);
                if (!SB.reducedMotion) {
                    ctx.save();
                    ctx.strokeStyle = 'rgba(46,204,113,0.03)';
                    ctx.lineWidth = 1;
                    var slCx = cw / 2, slCy = ch / 2;
                    for (var sli = 0; sli < 8; sli++) {
                        var slAngle = SB.TAU * sli / 8 + (SB.frameTime || 0) * 0.0003;
                        ctx.beginPath();
                        ctx.moveTo(slCx + Math.cos(slAngle) * 30, slCy + Math.sin(slAngle) * 30);
                        ctx.lineTo(slCx + Math.cos(slAngle) * Math.max(cw, ch), slCy + Math.sin(slAngle) * Math.max(cw, ch));
                        ctx.stroke();
                    }
                    ctx.restore();
                }
                // Subtle desaturation wash
                ctx.fillStyle = 'rgba(200,220,200,0.02)';
                ctx.fillRect(0, 0, cw, ch);
            }
            // Powerup active border pulse (flashes faster when expiring)
            var pe = this.powerupEffects;
            if ((pe.shield || pe.magnet || pe.slow || pe.scoreMult) && !SB.reducedMotion) {
                var pbColor = pe.shield ? '52,152,219' : pe.magnet ? '155,89,182' : pe.slow ? '46,204,113' : '255,193,7';
                var pbExpiring = (pe.shield && pe.shieldTimer <= 2) || (pe.magnet && pe.magnetTimer <= 2) || (pe.slow && pe.slowTimer <= 2) || (pe.scoreMult && pe.scoreMultTimer <= 2);
                var pbSpeed = pbExpiring ? 0.018 : 0.005;
                var pbPulse = (Math.sin((SB.frameTime || 0) * pbSpeed) + 1) / 2;
                var pbAlpha = pbExpiring ? 0.06 + pbPulse * 0.1 : 0.03 + pbPulse * 0.04;
                var pbW = pbExpiring ? 4 : 3;
                ctx.fillStyle = 'rgba(' + pbColor + ',' + pbAlpha.toFixed(3) + ')';
                ctx.fillRect(0, 0, pbW, ch);
                ctx.fillRect(cw - pbW, 0, pbW, ch);
                ctx.fillRect(0, 0, cw, pbW);
                ctx.fillRect(0, ch - pbW, cw, pbW);
            }
            // Zone edge glow (subtle colored border for INTENSE/EXTREME)
            if (this.currentZone === SB.ZONES.INTENSE || this.currentZone === SB.ZONES.EXTREME) {
                var zGlowAlpha = this.currentZone === SB.ZONES.EXTREME ? 0.06 : 0.03;
                var zColor = this.currentZone === SB.ZONES.EXTREME ? '155,89,182' : '231,76,60';
                var zPulse = (Math.sin((SB.frameTime || 0) * 0.003) + 1) / 2 * zGlowAlpha;
                ctx.fillStyle = 'rgba(' + zColor + ',' + zPulse.toFixed(3) + ')';
                ctx.fillRect(0, 0, cw, ch);
            }
            // Radial vignette in INTENSE/EXTREME
            if (!SB.reducedMotion) {
                var vigStr = this.currentZone === SB.ZONES.EXTREME ? 0.12 : 0.06;
                var vigR = Math.max(cw, ch) * 0.7;
                var vigGrad = ctx.createRadialGradient(cw / 2, ch / 2, vigR * 0.5, cw / 2, ch / 2, vigR);
                vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
                vigGrad.addColorStop(1, 'rgba(0,0,0,' + vigStr.toFixed(2) + ')');
                ctx.fillStyle = vigGrad;
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
            // Laser active screen tint
            var laserActive = false;
            var obs2 = this._renderObstacles;
            for (var li = 0; li < obs2.length; li++) {
                if (obs2[li].type === SB.OBSTACLE_TYPES.LASER && obs2[li].laserPhase === 'active') {
                    laserActive = true;
                    break;
                }
            }
            if (laserActive && !SB.reducedMotion) {
                var laPulse = (Math.sin((SB.frameTime || 0) * 0.015) + 1) / 2;
                ctx.fillStyle = 'rgba(100,200,255,' + (0.02 + laPulse * 0.02).toFixed(3) + ')';
                ctx.fillRect(0, 0, cw, ch);
            }
            // Gravity well proximity purple tint
            if (!SB.reducedMotion) {
                var gwObs = this._renderObstacles;
                for (var gwi = 0; gwi < gwObs.length; gwi++) {
                    if (gwObs[gwi].type === SB.OBSTACLE_TYPES.GRAVITY_WELL && gwObs[gwi].active) {
                        var gwcx = gwObs[gwi].x + gwObs[gwi].radius;
                        var gwcy = gwObs[gwi].y + gwObs[gwi].radius;
                        var gwBdx = gwcx - this.ball.x;
                        var gwBdy = gwcy - this.ball.y;
                        var gwBd = Math.sqrt(gwBdx * gwBdx + gwBdy * gwBdy);
                        var gwPr = gwObs[gwi].pullRadius || 120;
                        if (gwBd < gwPr) {
                            var gwStr = (1 - gwBd / gwPr);
                            var gwTintA = gwStr * gwStr * 0.06;
                            var gwGrad = ctx.createRadialGradient(gwcx, gwcy, 0, gwcx, gwcy, gwPr);
                            gwGrad.addColorStop(0, 'rgba(155,89,182,' + gwTintA.toFixed(3) + ')');
                            gwGrad.addColorStop(1, 'rgba(155,89,182,0)');
                            ctx.fillStyle = gwGrad;
                            ctx.fillRect(gwcx - gwPr, gwcy - gwPr, gwPr * 2, gwPr * 2);
                        }
                    }
                }
            }
            // Proximity heartbeat pulse
            if (this._maxDangerGlow > 0.5 && !SB.reducedMotion) {
                var hbFrac = (this._maxDangerGlow - 0.5) / 0.5;
                var hbPulse = (Math.sin((SB.frameTime || 0) * 0.012) + 1) / 2;
                var hbA = hbFrac * hbPulse * 0.04;
                ctx.fillStyle = 'rgba(231,50,50,' + hbA.toFixed(3) + ')';
                ctx.fillRect(0, 0, cw, ch);
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
    if (this.powerupFlashTimer > 0) {
        var puFA = (this.powerupFlashTimer / 0.15) * 0.08;
        ctx.fillStyle = 'rgba(' + this.powerupFlashColor + ',' + puFA.toFixed(3) + ')';
        ctx.fillRect(0, 0, cw, ch);
    }
    if (this.state === SB.STATES.PLAYING && !SB.reducedMotion) {
        var peW = this.powerupEffects;
        var peExpItems = [];
        if (peW.shield && peW.shieldTimer < 2) peExpItems.push('52,152,219');
        if (peW.magnet && peW.magnetTimer < 2) peExpItems.push('155,89,182');
        if (peW.slow && peW.slowTimer < 2) peExpItems.push('46,204,113');
        if (peW.scoreMult && peW.scoreMultTimer < 2) peExpItems.push('255,193,7');
        for (var pei = 0; pei < peExpItems.length; pei++) {
            var peEP = (Math.sin((SB.frameTime || 0) * 0.012 + pei * 2) + 1) / 2;
            var peEA = peEP * 0.06;
            var peEW = 4;
            ctx.fillStyle = 'rgba(' + peExpItems[pei] + ',' + peEA.toFixed(3) + ')';
            ctx.fillRect(0, 0, peEW, ch);
            ctx.fillRect(cw - peEW, 0, peEW, ch);
        }
    }
    if (this.comboBreakFlash > 0) {
        var cbfA = (this.comboBreakFlash / 0.15) * 0.12;
        ctx.fillStyle = 'rgba(100,50,0,' + cbfA.toFixed(3) + ')';
        ctx.fillRect(0, 0, cw, ch);
        if (!SB.reducedMotion) {
            var crFrac = this.comboBreakFlash / 0.15;
            ctx.save();
            ctx.strokeStyle = 'rgba(255,140,66,' + (crFrac * 0.2).toFixed(3) + ')';
            ctx.lineWidth = 1;
            var crCx = this.ball.x, crCy = this.ball.y;
            for (var cri = 0; cri < 4; cri++) {
                var crAngle = cri * 1.3 + 0.5;
                var crLen = 20 + (1 - crFrac) * 30;
                ctx.beginPath();
                ctx.moveTo(crCx + Math.cos(crAngle) * 10, crCy + Math.sin(crAngle) * 10);
                ctx.lineTo(crCx + Math.cos(crAngle + 0.2) * crLen, crCy + Math.sin(crAngle + 0.2) * crLen);
                ctx.stroke();
            }
            ctx.restore();
        }
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

    // BGM beat pulse — subtle brightness flash on the beat
    if (SB.audio.beatPulse > 0 && !SB.reducedMotion) {
        var bpA = SB.audio.beatPulse * 0.03;
        ctx.fillStyle = 'rgba(255,255,255,' + bpA.toFixed(3) + ')';
        ctx.fillRect(0, 0, cw, ch);
    }

    // Danger zone border glow in INTENSE/EXTREME
    if (this.state === SB.STATES.PLAYING && this.currentZone.threshold >= 25 && !SB.reducedMotion) {
        var zPulse = (Math.sin(SB.frameTime * 0.003) + 1) / 2;
        var zAlpha = (this.currentZone.threshold >= 50 ? 0.12 : 0.06) + zPulse * 0.04;
        var zCol = this.currentZone.threshold >= 50 ? '155,50,180' : '220,60,50';
        var zW = 3 + zPulse * 2;
        ctx.save();
        ctx.shadowColor = 'rgba(' + zCol + ',0.6)';
        ctx.shadowBlur = 10 + zPulse * 8;
        ctx.fillStyle = 'rgba(' + zCol + ',' + zAlpha.toFixed(3) + ')';
        ctx.fillRect(0, 0, zW, ch);
        ctx.fillRect(cw - zW, 0, zW, ch);
        ctx.fillRect(0, 0, cw, zW);
        ctx.fillRect(0, ch - zW, cw, zW);
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // Spawn warning indicators
    var warnings = this.spawner.getWarnings();
    for (var wi = 0; wi < warnings.length; wi++) {
        this._drawSpawnWarning(ctx, cw, ch, warnings[wi]);
    }

    // Spawn flash effect when warnings expire and obstacles materialize
    var flashes = this.spawner.getSpawnFlashes();
    for (var fi = 0; fi < flashes.length; fi++) {
        var sf = flashes[fi];
        var sfA = (sf.timer / 0.25) * 0.3;
        var sfR = (1 - sf.timer / 0.25) * 30;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,200,100,' + sfA.toFixed(2) + ')';
        ctx.lineWidth = 2;
        if (sf.side === 0) {
            ctx.beginPath(); ctx.arc(sf.x, sf.y, sfR, 0, SB.TAU); ctx.stroke();
        } else if (sf.side === 2) {
            ctx.beginPath(); ctx.arc(0, sf.y, sfR, 0, SB.TAU); ctx.stroke();
            ctx.beginPath(); ctx.arc(cw, sf.y, sfR, 0, SB.TAU); ctx.stroke();
        } else {
            var sfX = sf.side < 0 ? 0 : cw;
            ctx.beginPath(); ctx.arc(sfX, sf.y, sfR, 0, SB.TAU); ctx.stroke();
        }
        ctx.restore();
    }

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
    // Collect chain line (fading arc between sequential pickups)
    if (this.collectChainTimer > 0 && this.lastCollectX && this._prevCollectX) {
        var ccA = this.collectChainTimer / 0.8 * 0.2;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,215,0,' + ccA.toFixed(3) + ')';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 5]);
        var ccMidX = (this.lastCollectX + this._prevCollectX) / 2;
        var ccMidY = Math.min(this.lastCollectY, this._prevCollectY) - 20;
        ctx.beginPath();
        ctx.moveTo(this._prevCollectX, this._prevCollectY);
        ctx.quadraticCurveTo(ccMidX, ccMidY, this.lastCollectX, this.lastCollectY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
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

    // Bounce apex height indicator
    if (this._apexLineTimer > 0 && !SB.reducedMotion) {
        var alA = this._apexLineTimer / 0.4 * 0.2;
        var alW = 30;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,' + alA.toFixed(3) + ')';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(this.ball.x - alW / 2, this._apexLineY);
        ctx.lineTo(this.ball.x + alW / 2, this._apexLineY);
        ctx.stroke();
        ctx.setLineDash([]);
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

    if (this.deathRipple > 0 && !SB.reducedMotion) {
        var drFrac = 1 - this.deathRipple;
        var drR = drFrac * Math.max(cw, ch) * 0.8;
        var drA = this.deathRipple * 0.35;
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.deathRippleX, this.deathRippleY, drR, 0, SB.TAU);
        ctx.strokeStyle = 'rgba(231,76,60,' + drA.toFixed(3) + ')';
        ctx.lineWidth = 3 * this.deathRipple;
        ctx.stroke();
        if (drR > 20) {
            ctx.beginPath();
            ctx.arc(this.deathRippleX, this.deathRippleY, drR * 0.6, 0, SB.TAU);
            ctx.strokeStyle = 'rgba(255,100,80,' + (drA * 0.5).toFixed(3) + ')';
            ctx.lineWidth = 2 * this.deathRipple;
            ctx.stroke();
        }
        ctx.restore();
    }

    if (this._deathMarkerTimer > 0 && !SB.reducedMotion) {
        var dmA = Math.min(this._deathMarkerTimer, 1) * 0.3;
        var dmS = 6 + (2 - Math.min(this._deathMarkerTimer, 2)) * 3;
        ctx.save();
        ctx.strokeStyle = 'rgba(231,76,60,' + dmA.toFixed(2) + ')';
        ctx.lineWidth = 2;
        ctx.translate(this._deathMarkerX, this._deathMarkerY);
        ctx.beginPath();
        ctx.moveTo(-dmS, -dmS); ctx.lineTo(dmS, dmS);
        ctx.moveTo(dmS, -dmS); ctx.lineTo(-dmS, dmS);
        ctx.stroke();
        var dmPulse = (Math.sin((SB.frameTime || 0) * 0.008) + 1) / 2;
        var dmRingR = dmS + 4 + dmPulse * 6;
        var dmRingA = dmA * (0.3 + dmPulse * 0.3);
        ctx.beginPath();
        ctx.arc(0, 0, dmRingR, 0, SB.TAU);
        ctx.strokeStyle = 'rgba(231,76,60,' + dmRingA.toFixed(3) + ')';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }

    if (this.deathSlowMo > 0) {
        var deathProgress = (0.3 - this.deathSlowMo) / 0.3;
        var vigAlpha = deathProgress * 0.35;
        ctx.fillStyle = 'rgba(0,0,0,' + Math.max(0, vigAlpha).toFixed(3) + ')';
        ctx.fillRect(0, 0, cw, ch);
        var redTint = deathProgress * deathProgress * 0.12;
        ctx.fillStyle = 'rgba(180,30,30,' + redTint.toFixed(3) + ')';
        ctx.fillRect(0, 0, cw, ch);
        this.ball.radius = this.ball.baseRadius * (1 + deathProgress * 0.4);
        if (!SB.reducedMotion) {
            var rlCount = 8;
            var rlA = deathProgress * 0.15;
            ctx.save();
            ctx.strokeStyle = 'rgba(255,255,255,' + rlA.toFixed(3) + ')';
            ctx.lineWidth = 1;
            for (var rli = 0; rli < rlCount; rli++) {
                var rlAngle = (rli / rlCount) * SB.TAU + deathProgress * 0.5;
                var rlInner = 30 + deathProgress * 20;
                var rlOuter = rlInner + 20 + deathProgress * 40;
                ctx.beginPath();
                ctx.moveTo(this.ball.x + Math.cos(rlAngle) * rlInner, this.ball.y + Math.sin(rlAngle) * rlInner);
                ctx.lineTo(this.ball.x + Math.cos(rlAngle) * rlOuter, this.ball.y + Math.sin(rlAngle) * rlOuter);
                ctx.stroke();
            }
            ctx.restore();
        }
        ctx.save();
        ctx.globalAlpha = 1 - deathProgress * 0.6;
    } else {
        this.ball.radius = this.ball.baseRadius;
    }

    // Velocity direction arrow
    var velMag = Math.sqrt(this.ball.vx * this.ball.vx + this.ball.vy * this.ball.vy);
    if (velMag > 3 && this.state === SB.STATES.PLAYING && !SB.reducedMotion && this.deathSlowMo <= 0) {
        var vaFrac = Math.min(velMag / SB.Physics.MAX_FALL_SPEED, 1);
        var vaAngle = Math.atan2(this.ball.vy, this.ball.vx);
        var vaDist = this.ball.radius + 14 + vaFrac * 6;
        var vaLen = 5 + vaFrac * 8;
        var vaX = this.ball.x + Math.cos(vaAngle) * vaDist;
        var vaY = this.ball.y + Math.sin(vaAngle) * vaDist;
        var vaA = vaFrac * 0.12;
        ctx.save();
        ctx.translate(vaX, vaY);
        ctx.rotate(vaAngle);
        ctx.strokeStyle = 'rgba(255,255,255,' + vaA.toFixed(3) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-vaLen, 0);
        ctx.lineTo(vaLen, 0);
        ctx.lineTo(vaLen - 3, -3);
        ctx.moveTo(vaLen, 0);
        ctx.lineTo(vaLen - 3, 3);
        ctx.stroke();
        ctx.restore();
    }

    // Horizontal speed wake lines
    var hSpeed = Math.abs(this.ball.vx);
    if (hSpeed > 3 && this.state === SB.STATES.PLAYING && !SB.reducedMotion && this.deathSlowMo <= 0) {
        var hwFrac = Math.min(hSpeed / 8, 1);
        var hwDir = this.ball.vx > 0 ? -1 : 1;
        var hwA = hwFrac * 0.1;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,' + hwA.toFixed(3) + ')';
        ctx.lineWidth = 0.8;
        for (var hwi = 0; hwi < 3; hwi++) {
            var hwY = this.ball.y + (hwi - 1) * (this.ball.radius * 0.7);
            var hwX = this.ball.x + hwDir * (this.ball.radius + 3);
            var hwLen = 6 + hwFrac * 10;
            ctx.beginPath();
            ctx.moveTo(hwX, hwY);
            ctx.lineTo(hwX + hwDir * hwLen, hwY);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Ball ground shadow
    if (this.state === SB.STATES.PLAYING && !SB.reducedMotion) {
        var gsDist = ch - this.ball.y;
        var gsA = Math.max(0, 0.08 - gsDist / ch * 0.08);
        if (gsA > 0.005) {
            var gsScale = 0.3 + (1 - gsDist / ch) * 0.7;
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,' + gsA.toFixed(3) + ')';
            ctx.translate(this.ball.x, ch - 5);
            ctx.scale(gsScale, 0.15);
            ctx.beginPath();
            ctx.arc(0, 0, this.ball.radius + 4, 0, SB.TAU);
            ctx.fill();
            ctx.restore();
        }
    }

    // Falling speed wind lines around ball
    var fallFrac = Math.abs(this.ball.vy) / SB.Physics.MAX_FALL_SPEED;
    if (fallFrac > 0.5 && this.deathSlowMo <= 0 && !SB.reducedMotion) {
        var wlAlpha = (fallFrac - 0.5) / 0.5 * 0.15;
        var wlCount = fallFrac > 0.8 ? 4 : 3;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,' + wlAlpha.toFixed(3) + ')';
        ctx.lineWidth = 1;
        for (var wli = 0; wli < wlCount; wli++) {
            var wlX = this.ball.x + (wli - (wlCount - 1) / 2) * (this.ball.radius * 0.8);
            var wlY = this.ball.y - this.ball.radius - 4 - wli * 3;
            var wlLen = 8 + fallFrac * 12;
            ctx.beginPath();
            ctx.moveTo(wlX, wlY);
            ctx.lineTo(wlX, wlY - wlLen);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Danger glow ring when ball is low
    if (this.state === SB.STATES.PLAYING && this.ball.y > ch * 0.7 && !SB.reducedMotion) {
        var dgFrac = (this.ball.y - ch * 0.7) / (ch * 0.3);
        var dgPulse = (Math.sin((SB.frameTime || 0) * 0.01) + 1) / 2;
        var dgAlpha = dgFrac * (0.15 + dgPulse * 0.1);
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, this.ball.radius + 6, 0, SB.TAU);
        ctx.strokeStyle = 'rgba(231,76,60,' + dgAlpha.toFixed(3) + ')';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        var bzH = ch * 0.12 * dgFrac;
        var bzAlpha = dgFrac * (0.15 + dgPulse * 0.08);
        var bzGrad = ctx.createLinearGradient(0, ch, 0, ch - bzH);
        bzGrad.addColorStop(0, 'rgba(231,50,40,' + bzAlpha.toFixed(3) + ')');
        bzGrad.addColorStop(1, 'rgba(231,50,40,0)');
        ctx.fillStyle = bzGrad;
        ctx.fillRect(0, ch - bzH, cw, bzH);
    }

    if (this._impactWaveTimer > 0 && !SB.reducedMotion) {
        var iwFrac = 1 - this._impactWaveTimer / 0.35;
        var iwR1 = iwFrac * 60 * this._impactWaveStr;
        var iwR2 = iwFrac * 40 * this._impactWaveStr;
        var iwA = (1 - iwFrac) * 0.2 * this._impactWaveStr;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,' + iwA.toFixed(3) + ')';
        ctx.lineWidth = 1.5 * (1 - iwFrac);
        ctx.beginPath();
        ctx.ellipse(this._impactWaveX, this._impactWaveY, iwR1, iwR1 * 0.3, 0, 0, SB.TAU);
        ctx.stroke();
        if (iwR2 > 5) {
            ctx.strokeStyle = 'rgba(255,255,255,' + (iwA * 0.5).toFixed(3) + ')';
            ctx.beginPath();
            ctx.ellipse(this._impactWaveX, this._impactWaveY, iwR2, iwR2 * 0.3, 0, 0, SB.TAU);
            ctx.stroke();
        }
        ctx.restore();
    }

    if (this._groundRippleTimer > 0 && !SB.reducedMotion) {
        var grFrac = 1 - this._groundRippleTimer / 0.4;
        var grW = grFrac * 80 * this._groundRippleStr;
        var grA = (1 - grFrac) * 0.25 * this._groundRippleStr;
        var grY = ch - 2;
        ctx.save();
        ctx.strokeStyle = 'rgba(200,220,255,' + grA.toFixed(3) + ')';
        ctx.lineWidth = 2 * (1 - grFrac);
        ctx.beginPath();
        ctx.moveTo(this._groundRippleX - grW, grY);
        ctx.quadraticCurveTo(this._groundRippleX, grY - 6 * (1 - grFrac) * this._groundRippleStr, this._groundRippleX + grW, grY);
        ctx.stroke();
        ctx.restore();
    }

    if (this._milestoneRingTimer > 0 && !SB.reducedMotion) {
        var mrFrac = 1 - this._milestoneRingTimer / 0.5;
        var mrR = mrFrac * Math.max(cw, ch) * 0.6;
        var mrA = (1 - mrFrac) * 0.15;
        ctx.save();
        ctx.strokeStyle = 'rgba(' + this._milestoneRingColor + ',' + mrA.toFixed(3) + ')';
        ctx.lineWidth = 3 * (1 - mrFrac);
        ctx.beginPath();
        ctx.arc(cw / 2, ch / 2, mrR, 0, SB.TAU);
        ctx.stroke();
        ctx.restore();
    }

    if (this.powerupEffects.slow && !SB.reducedMotion) {
        var smRingCount = 3;
        var smPhase = ((SB.frameTime || 0) * 0.002) % 1;
        for (var smi = 0; smi < smRingCount; smi++) {
            var smFrac = (smPhase + smi / smRingCount) % 1;
            var smR = this.ball.radius + 8 + smFrac * 30;
            var smA = (1 - smFrac) * 0.12;
            ctx.beginPath();
            ctx.arc(this.ball.x, this.ball.y, smR, 0, SB.TAU);
            ctx.strokeStyle = 'rgba(46,204,113,' + smA.toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.save();
        ctx.font = 'bold 9px ' + this.ui.font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(46,204,113,0.3)';
        ctx.fillText('SLOW', this.ball.x, this.ball.y + this.ball.radius + 40);
        ctx.restore();
    }

    if (this.powerupEffects.magnet && !SB.reducedMotion) {
        var mgR = this.ball.radius + 20 + (Math.sin((SB.frameTime || 0) * 0.005) + 1) / 2 * 10;
        var mgGrad = ctx.createRadialGradient(this.ball.x, this.ball.y, this.ball.radius, this.ball.x, this.ball.y, mgR);
        mgGrad.addColorStop(0, 'rgba(155,89,182,0.08)');
        mgGrad.addColorStop(1, 'rgba(155,89,182,0)');
        ctx.fillStyle = mgGrad;
        ctx.fillRect(this.ball.x - mgR, this.ball.y - mgR, mgR * 2, mgR * 2);
        var mgCols = this.collectiblePool.getActive();
        ctx.save();
        ctx.lineWidth = 0.8;
        for (var mgi = 0; mgi < mgCols.length; mgi++) {
            var mgCol = mgCols[mgi];
            var mgDx = mgCol.x - this.ball.x;
            var mgDy = mgCol.y - this.ball.y;
            var mgDist = Math.sqrt(mgDx * mgDx + mgDy * mgDy);
            if (mgDist < 180) {
                var mgLA = (1 - mgDist / 180) * 0.15;
                ctx.strokeStyle = 'rgba(155,89,182,' + mgLA.toFixed(3) + ')';
                ctx.beginPath();
                ctx.moveTo(this.ball.x, this.ball.y);
                ctx.lineTo(mgCol.x, mgCol.y);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    if (this.powerupEffects.shield && !SB.reducedMotion) {
        var shAngle = ((SB.frameTime || 0) * 0.003) % SB.TAU;
        var shR = this.ball.radius + 10;
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, shR, shAngle, shAngle + 0.8);
        ctx.strokeStyle = 'rgba(150,220,255,0.25)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, shR, shAngle + Math.PI, shAngle + Math.PI + 0.5);
        ctx.strokeStyle = 'rgba(150,220,255,0.15)';
        ctx.stroke();
        ctx.restore();
    }

    if (this.invincibleTimer > 0 && !SB.reducedMotion) {
        // Golden invincible glow ring
        var invPulse = (Math.sin(this.invincibleTimer * 8) + 1) / 2;
        var invR = this.ball.radius + 10 + invPulse * 4;
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, invR, 0, SB.TAU);
        ctx.strokeStyle = 'rgba(255,215,0,' + (0.2 + invPulse * 0.15).toFixed(2) + ')';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = 0.5 + Math.abs(Math.sin(this.invincibleTimer * 12)) * 0.5;
    }
    this.ball.draw(ctx);
    if (this.nearMissSparkTimer > 0 && !SB.reducedMotion) {
        var nmsFrac = this.nearMissSparkTimer / 0.5;
        var nmsA = nmsFrac * 0.6;
        ctx.save();
        for (var nmi = 0; nmi < 3; nmi++) {
            var nmsAngle = ((SB.frameTime || 0) * 0.015 + nmi * 2.1) % SB.TAU;
            var nmsDist = this.ball.radius + 4 + (1 - nmsFrac) * 8;
            var nmsX = this.ball.x + Math.cos(nmsAngle) * nmsDist;
            var nmsY = this.ball.y + Math.sin(nmsAngle) * nmsDist;
            var nmsSize = 1.5 * nmsFrac;
            ctx.beginPath();
            ctx.arc(nmsX, nmsY, nmsSize, 0, SB.TAU);
            ctx.fillStyle = 'rgba(243,156,18,' + nmsA.toFixed(2) + ')';
            ctx.fill();
        }
        ctx.restore();
    }
    if (this.invincibleTimer > 0 && !SB.reducedMotion) {
        ctx.restore();
    }
    if (this.deathSlowMo > 0) {
        ctx.restore();
    }
    this.particles.draw(ctx);

    // Wall edge flash (brief glow on the edge the ball bounced off)
    if (this.wallFlashTimer > 0 && !SB.reducedMotion) {
        var wfFrac = this.wallFlashTimer / 0.15;
        var wfAlpha = wfFrac * 0.3;
        var wfStreak = Math.min(this.wallBounceStreak, 5);
        var wfColor = wfStreak >= 3 ? '93,173,226' : '255,255,255';
        var wfW = 30 + wfStreak * 5;
        var wfH = 120 + wfStreak * 20;
        var wfX = this.wallFlashSide < 0 ? 0 : cw - wfW;
        var wfGrad = ctx.createLinearGradient(wfX, 0, wfX + wfW, 0);
        if (this.wallFlashSide < 0) {
            wfGrad.addColorStop(0, 'rgba(' + wfColor + ',' + wfAlpha.toFixed(3) + ')');
            wfGrad.addColorStop(1, 'rgba(' + wfColor + ',0)');
        } else {
            wfGrad.addColorStop(0, 'rgba(' + wfColor + ',0)');
            wfGrad.addColorStop(1, 'rgba(' + wfColor + ',' + wfAlpha.toFixed(3) + ')');
        }
        ctx.fillStyle = wfGrad;
        ctx.fillRect(wfX, this.ball.y - wfH / 2, wfW, wfH);
        if (wfStreak >= 2) {
            ctx.save();
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = this.wallFlashSide < 0 ? 'left' : 'right';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(' + wfColor + ',' + (wfFrac * 0.7).toFixed(2) + ')';
            var wsX = this.wallFlashSide < 0 ? 6 : cw - 6;
            ctx.fillText('x' + wfStreak, wsX, this.ball.y - 20);
            ctx.restore();
        }
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
        // Shimmer sweep highlight
        if (!SB.reducedMotion) {
            var sweepA = (ft * 2) % SB.TAU;
            ctx.beginPath();
            ctx.arc(0, 0, shieldR, sweepA, sweepA + 0.8);
            ctx.strokeStyle = 'rgba(180,220,255,' + (shimmer * 0.5).toFixed(2) + ')';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
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
        // Inner field rings (pulsing inward)
        for (var mri = 1; mri <= 2; mri++) {
            var mrR = magnetR * (0.4 + mri * 0.2) + Math.sin(mft * 4 + mri) * 3;
            ctx.beginPath();
            ctx.arc(this.ball.x, this.ball.y, mrR, 0, SB.TAU);
            ctx.strokeStyle = 'rgba(155,89,182,' + (magnetAlpha * 0.4).toFixed(3) + ')';
            ctx.lineWidth = 0.8;
            ctx.setLineDash([3, 6]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        // Radial pull lines
        if (!SB.reducedMotion) {
            ctx.strokeStyle = 'rgba(155,89,182,0.06)';
            ctx.lineWidth = 0.8;
            for (var rli = 0; rli < 6; rli++) {
                var rlA = mft * 0.5 + rli * SB.TAU / 6;
                ctx.beginPath();
                ctx.moveTo(this.ball.x + Math.cos(rlA) * magnetR, this.ball.y + Math.sin(rlA) * magnetR);
                ctx.lineTo(this.ball.x + Math.cos(rlA) * 20, this.ball.y + Math.sin(rlA) * 20);
                ctx.stroke();
            }
        }
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
    if (pe.shield) arcItems.push({ frac: pe.shieldTimer / pe.shieldDuration, color: '52,152,219', expiring: pe.shieldTimer < 1 });
    if (pe.magnet) arcItems.push({ frac: pe.magnetTimer / pe.magnetDuration, color: '155,89,182', expiring: pe.magnetTimer < 1 });
    if (pe.slow) arcItems.push({ frac: pe.slowTimer / pe.slowDuration, color: '46,204,113', expiring: pe.slowTimer < 1 });
    if (pe.scoreMult) arcItems.push({ frac: pe.scoreMultTimer / pe.scoreMultDuration, color: '255,193,7', expiring: pe.scoreMultTimer < 1 });
    if (arcItems.length > 0) {
        var arcR = this.ball.radius + 16;
        var arcSeg = SB.TAU / arcItems.length;
        ctx.save();
        for (var ai = 0; ai < arcItems.length; ai++) {
            var arcStart = -Math.PI / 2 + ai * arcSeg;
            var arcEnd = arcStart + arcSeg * arcItems[ai].frac;
            var arcAlpha = 0.35;
            if (arcItems[ai].expiring) {
                arcAlpha = Math.sin((SB.frameTime || 0) * 0.015) > 0 ? 0.5 : 0.1;
            }
            ctx.shadowColor = 'rgba(' + arcItems[ai].color + ',' + (arcAlpha * 0.6).toFixed(2) + ')';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(this.ball.x, this.ball.y, arcR + ai * 3, arcStart, arcEnd);
            ctx.strokeStyle = 'rgba(' + arcItems[ai].color + ',' + arcAlpha.toFixed(2) + ')';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    if (this.comboTimer > 0 && this.comboCount >= 2) {
        var cbW = 30;
        var cbH = 3;
        var cbX = this.ball.x - cbW / 2;
        var cbY = this.ball.y + this.ball.radius + 22;
        var cbFrac = this.comboTimer / 2.0;
        var cbColor = this.comboCount >= 5 ? '255,68,68' : (this.comboCount >= 3 ? '255,140,66' : '255,215,0');
        var cbBarAlpha = 0.6;
        if (cbFrac < 0.3) {
            cbColor = '255,50,50';
            cbBarAlpha = 0.4 + (Math.sin((SB.frameTime || 0) * 0.02) + 1) / 2 * 0.5;
        }
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(cbX, cbY, cbW, cbH);
        ctx.fillStyle = 'rgba(' + cbColor + ',' + cbBarAlpha.toFixed(2) + ')';
        ctx.fillRect(cbX, cbY, cbW * cbFrac, cbH);
        var cmMult = this.comboCount >= 5 ? 'x4' : (this.comboCount >= 3 ? 'x3' : 'x2');
        ctx.font = 'bold 10px ' + this.ui.font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = 'rgba(' + cbColor + ',0.7)';
        ctx.fillText(cmMult, this.ball.x, cbY - 1);
        ctx.restore();
    }

    // Gravity well screen-edge warp lines
    if (this.ball.gravityPullStrength > 0.2 && !SB.reducedMotion) {
        var gwStr = (this.ball.gravityPullStrength - 0.2) / 0.8;
        var gwAngle = this.ball.gravityPullAngle;
        var gwA = gwStr * 0.12;
        ctx.save();
        ctx.strokeStyle = 'rgba(155,89,182,' + gwA.toFixed(3) + ')';
        ctx.lineWidth = 1;
        for (var gwi = 0; gwi < 6; gwi++) {
            var gwOff = gwi * (SB.TAU / 6) + (SB.frameTime || 0) * 0.002;
            var gwSx = this.ball.x + Math.cos(gwOff) * Math.max(cw, ch) * 0.6;
            var gwSy = this.ball.y + Math.sin(gwOff) * Math.max(cw, ch) * 0.6;
            var gwEx = this.ball.x + Math.cos(gwAngle) * 30;
            var gwEy = this.ball.y + Math.sin(gwAngle) * 30;
            ctx.beginPath();
            ctx.moveTo(gwSx, gwSy);
            ctx.lineTo(gwEx, gwEy);
            ctx.stroke();
        }
        ctx.restore();
    }
};

SB.Game.prototype._drawEdgeWarnings = function(ctx, cw, ch) {
    var obstacles = this._renderObstacles || this.obstaclePool.getActive();
    var margin = 40;
    var ewTypeColors = { platform: '231,76,60', spike: '255,100,50', blade: '180,190,210', boomerang: '255,152,0' };
    ctx.save();
    for (var i = 0; i < obstacles.length; i++) {
        var obs = obstacles[i];
        if (obs.type === SB.OBSTACLE_TYPES.LASER || obs.type === SB.OBSTACLE_TYPES.GRAVITY_WELL) continue;
        var ewCol = ewTypeColors[obs.type] || '231,76,60';
        var ocx, ocy;
        if (obs.radius) {
            ocx = obs.x + obs.radius;
            ocy = obs.y + obs.radius;
        } else {
            ocx = obs.x + (obs.width || 0) / 2;
            ocy = obs.y + (obs.height || 0) / 2;
        }

        var fromLeft = (ocx < 0 && ocx > -margin);
        var fromRight = (ocx > cw && ocx < cw + margin);
        if (fromLeft || fromRight) {
            if (ocy >= 0 && ocy <= ch) {
                var arrowX = fromLeft ? 8 : cw - 8;
                var distFrac = fromLeft ? (1 + ocx / margin) : (1 - (ocx - cw) / margin);
                var obsSpd = Math.abs(obs.speedX || 0) + Math.abs(obs.speedY || 0);
                var ewPulse = obsSpd > 100 ? (Math.sin((SB.frameTime || 0) * 0.02) + 1) / 2 * 0.3 : 0;
                var arrowAlpha = distFrac * (0.6 + ewPulse);
                ctx.fillStyle = 'rgba(' + ewCol + ',' + arrowAlpha.toFixed(2) + ')';
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

        var fromTop = (ocy < 0 && ocy > -margin);
        if (fromTop && ocx >= 0 && ocx <= cw) {
            var arrowY = 8;
            var topFrac = (1 + ocy / margin);
            var topAlpha = topFrac * 0.5;
            ctx.fillStyle = 'rgba(' + ewCol + ',' + topAlpha.toFixed(2) + ')';
            ctx.beginPath();
            ctx.moveTo(ocx - 5, arrowY + 6);
            ctx.lineTo(ocx, arrowY);
            ctx.lineTo(ocx + 5, arrowY + 6);
            ctx.closePath();
            ctx.fill();
        }

        var fromBottom = (ocy > ch && ocy < ch + margin);
        if (fromBottom && ocx >= 0 && ocx <= cw) {
            var bArrowY = ch - 8;
            var botFrac = (1 - (ocy - ch) / margin);
            var botAlpha = botFrac * 0.5;
            ctx.fillStyle = 'rgba(' + ewCol + ',' + botAlpha.toFixed(2) + ')';
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

SB.Game.prototype._drawSpawnWarning = function(ctx, cw, ch, w) {
    var frac = w.timer / w.duration;
    var pulseRate = 6 + frac * 20;
    var pulse = (Math.sin(w.timer * pulseRate) + 1) / 2;
    var alpha = (0.4 + frac * 0.6) * (0.6 + pulse * 0.4);

    var typeColors = { platform: '231,76,60', spike: '255,100,50', blade: '180,180,190', boomerang: '255,152,0', wave: '255,100,50', pincer: '231,76,60', squeeze: '231,76,60', corridor: '231,76,60', spiral: '255,100,50' };
    var col = typeColors[w.type] || '231,76,60';

    ctx.save();

    if (w.side === 0) {
        // In-place warning: ghost outlines of actual obstacle positions + pulsing crosshair
        if (w.obstacles) {
            for (var oi = 0; oi < w.obstacles.length; oi++) {
                var ob = w.obstacles[oi];
                ctx.save();
                ctx.shadowColor = 'rgba(' + col + ',' + (alpha * 0.6).toFixed(2) + ')';
                ctx.shadowBlur = 8 + frac * 10;
                ctx.strokeStyle = 'rgba(' + col + ',' + (alpha * 0.6).toFixed(2) + ')';
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 4]);
                ctx.strokeRect(ob.x, ob.y, ob.width, ob.height);
                ctx.setLineDash([]);
                ctx.fillStyle = 'rgba(' + col + ',' + (alpha * 0.12 * pulse).toFixed(3) + ')';
                ctx.fillRect(ob.x, ob.y, ob.width, ob.height);
                ctx.shadowBlur = 0;
                ctx.restore();
            }
        }
        var cAlpha = alpha * 0.8;
        var cR = 24 + (1 - frac) * 18;
        ctx.strokeStyle = 'rgba(' + col + ',' + cAlpha.toFixed(2) + ')';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(w.x, w.y, cR, 0, SB.TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        var cLen = 10 + frac * 8;
        ctx.beginPath();
        ctx.moveTo(w.x - cLen, w.y); ctx.lineTo(w.x + cLen, w.y);
        ctx.moveTo(w.x, w.y - cLen); ctx.lineTo(w.x, w.y + cLen);
        ctx.stroke();
        ctx.fillStyle = 'rgba(' + col + ',' + (cAlpha * 0.15).toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(w.x, w.y, cR, 0, SB.TAU);
        ctx.fill();
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(' + col + ',' + (alpha * 0.95).toFixed(2) + ')';
        ctx.fillText('!', w.x, w.y);
    } else if (w.side === 2) {
        var barW = 6 + frac * 8;
        var barH = 50 + frac * 30;
        ctx.shadowColor = 'rgba(' + col + ',' + (alpha * 0.8).toFixed(2) + ')';
        ctx.shadowBlur = 12 + frac * 15;
        ctx.fillStyle = 'rgba(' + col + ',' + alpha.toFixed(2) + ')';
        ctx.fillRect(0, w.y - barH / 2, barW, barH);
        ctx.fillRect(cw - barW, w.y - barH / 2, barW, barH);
        ctx.shadowBlur = 0;
        var arSize = 8 + frac * 5;
        ctx.fillStyle = 'rgba(' + col + ',' + (alpha * 0.9).toFixed(2) + ')';
        ctx.beginPath();
        ctx.moveTo(barW + 6 + arSize, w.y);
        ctx.lineTo(barW + 6, w.y - arSize);
        ctx.lineTo(barW + 6, w.y + arSize);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cw - barW - 6 - arSize, w.y);
        ctx.lineTo(cw - barW - 6, w.y - arSize);
        ctx.lineTo(cw - barW - 6, w.y + arSize);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(' + col + ',' + (alpha * 0.12).toFixed(2) + ')';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 10]);
        ctx.beginPath();
        ctx.moveTo(barW + arSize + 10, w.y);
        ctx.lineTo(cw - barW - arSize - 10, w.y);
        ctx.stroke();
        ctx.setLineDash([]);
        if (!SB.reducedMotion) {
            var ringPhase = (w.timer * 4) % 1;
            var ringR = 10 + ringPhase * 25;
            var ringA = (1 - ringPhase) * alpha * 0.5;
            ctx.strokeStyle = 'rgba(' + col + ',' + ringA.toFixed(2) + ')';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, w.y, ringR, 0, SB.TAU); ctx.stroke();
            ctx.beginPath(); ctx.arc(cw, w.y, ringR, 0, SB.TAU); ctx.stroke();
        }
    } else {
        // Edge warning: thick glowing bar + large arrow
        var edgeX = w.side < 0 ? 0 : cw;
        var barW = 6 + frac * 8;
        var barH = 50 + frac * 30;

        // Glow behind bar
        ctx.shadowColor = 'rgba(' + col + ',' + (alpha * 0.8).toFixed(2) + ')';
        ctx.shadowBlur = 12 + frac * 15;
        ctx.fillStyle = 'rgba(' + col + ',' + alpha.toFixed(2) + ')';
        if (w.side < 0) {
            ctx.fillRect(0, w.y - barH / 2, barW, barH);
        } else {
            ctx.fillRect(cw - barW, w.y - barH / 2, barW, barH);
        }
        ctx.shadowBlur = 0;

        // Large arrow pointing inward
        var arX = w.side < 0 ? barW + 6 : cw - barW - 6;
        var arDir = w.side < 0 ? 1 : -1;
        var arSize = 8 + frac * 5;
        ctx.fillStyle = 'rgba(' + col + ',' + (alpha * 0.9).toFixed(2) + ')';
        ctx.beginPath();
        ctx.moveTo(arX + arDir * arSize, w.y);
        ctx.lineTo(arX, w.y - arSize);
        ctx.lineTo(arX, w.y + arSize);
        ctx.closePath();
        ctx.fill();

        // Type mini-icon next to arrow
        var iconX = arX + arDir * (arSize + 12);
        var iconA = alpha * 0.7;
        ctx.fillStyle = 'rgba(' + col + ',' + iconA.toFixed(2) + ')';
        ctx.strokeStyle = 'rgba(' + col + ',' + iconA.toFixed(2) + ')';
        ctx.lineWidth = 1.5;
        if (w.type === 'spike' || w.type === 'wave') {
            ctx.beginPath();
            ctx.moveTo(iconX, w.y - 6); ctx.lineTo(iconX + 5, w.y + 5); ctx.lineTo(iconX - 5, w.y + 5);
            ctx.closePath(); ctx.fill();
        } else if (w.type === 'blade') {
            ctx.beginPath(); ctx.arc(iconX, w.y, 5, 0, SB.TAU); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(iconX - 5, w.y); ctx.lineTo(iconX + 5, w.y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(iconX, w.y - 5); ctx.lineTo(iconX, w.y + 5); ctx.stroke();
        } else if (w.type === 'boomerang') {
            ctx.beginPath(); ctx.arc(iconX, w.y, 5, -0.5, 2.5); ctx.stroke();
        } else {
            ctx.fillRect(iconX - 7, w.y - 2, 14, 4);
        }

        // Horizontal danger line across screen at spawn height
        ctx.strokeStyle = 'rgba(' + col + ',' + (alpha * 0.12).toFixed(2) + ')';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 10]);
        ctx.beginPath();
        ctx.moveTo(w.side < 0 ? barW + arSize + 10 : 0, w.y);
        ctx.lineTo(w.side < 0 ? cw : cw - barW - arSize - 10, w.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Expanding ring bursts
        if (!SB.reducedMotion) {
            var ringPhase = (w.timer * 4) % 1;
            var ringR = 10 + ringPhase * 25;
            var ringA = (1 - ringPhase) * alpha * 0.5;
            ctx.beginPath();
            ctx.arc(edgeX, w.y, ringR, 0, SB.TAU);
            ctx.strokeStyle = 'rgba(' + col + ',' + ringA.toFixed(2) + ')';
            ctx.lineWidth = 2;
            ctx.stroke();
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

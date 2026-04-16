window.SB = window.SB || {};

SB.STATES = {
    START: 'start',
    PLAYING: 'playing',
    GAME_OVER: 'game_over'
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
    this.score = 0;
    this.scoreTimer = 0;
    this.highScore = 0;
    this.isNewHigh = false;
    this.gameOverCooldown = 0;
    this.gameOverCooldownTime = 0.8;
    this.lastMilestone = 0;
    this.screenShake = 0;
    this.screenFlash = 0;
    this.comboTimer = 0;
    this.comboCount = 0;
    this.runStars = 0;
    this.showTutorial = false;
    this.tutorialTimer = 0;
    this.xpResult = null;
};

SB.Game.prototype.init = function() {
    this.highScore = SB.Storage.getHighScore();
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
        case SB.STATES.GAME_OVER:
            this._updateGameOver(dt);
            break;
    }
};

SB.Game.prototype._updateStart = function(dt) {
    if (this.input.consumeTap()) {
        this._transitionTo(SB.STATES.PLAYING);
    }
};

SB.Game.prototype._updatePlaying = function(dt) {
    var slowMult = this.powerupEffects.getSpeedMultiplier();

    // Tutorial auto-dismiss
    if (this.showTutorial) {
        this.tutorialTimer += dt;
        if (this.input.consumeTap()) {
            this.ball.bounce(this.input.tapX);
            SB.audio.playBounce();
            if (this.tutorialTimer > 0.5) this.showTutorial = false;
        }
    } else if (this.input.consumeTap()) {
        this.ball.bounce(this.input.tapX);
        SB.audio.playBounce();
    }

    this.ball.update(dt);
    this.powerupEffects.update(dt);
    this.achievements.updateRunTime(dt);

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

        var obsBounds = obs.getBounds();
        var hit = false;
        if (obs.type === SB.OBSTACLE_TYPES.BLADE || obs.type === SB.OBSTACLE_TYPES.BOOMERANG) {
            hit = SB.circleCircleCollision(ballBounds, obsBounds);
        } else {
            hit = SB.circleRectCollision(ballBounds, obsBounds);
        }

        if (hit) {
            if (this.powerupEffects.useShield()) {
                obs.active = false;
                this.screenShake = 0.15;
                this.achievements.onShieldUse();
                SB.audio.playCollect();
                continue;
            }
            this._transitionTo(SB.STATES.GAME_OVER);
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
            col.active = false;
            this.comboTimer = 2.0;
            this.comboCount++;
            this.runStars++;
            var bonus = col.pointValue * (this.comboCount >= 2 ? 2 : 1);
            this.score += bonus;
            this.achievements.onStarCollect();
            this.achievements.onCombo(this.comboCount);
            SB.audio.playCollect();
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
            pu.active = false;
            this.powerupEffects.activate(pu.type);
            this.achievements.onPowerupCollect();
            SB.audio.playMilestone();
        }
    }

    // --- Scoring ---
    this.scoreTimer += dt;
    if (this.scoreTimer >= 1.0) {
        this.scoreTimer -= 1.0;
        this.score += 1;
    }

    var currentMilestone = Math.floor(this.score / 10);
    if (currentMilestone > this.lastMilestone) {
        this.lastMilestone = currentMilestone;
        SB.audio.playMilestone();
    }

    // Check achievements mid-game
    this.achievements.checkAll();

    if (this.ball.y - this.ball.radius > ch) {
        this._transitionTo(SB.STATES.GAME_OVER);
    }
};

SB.Game.prototype._updateGameOver = function(dt) {
    this.gameOverCooldown += dt;

    // Process achievement notifications
    var notif = this.achievements.popNotification();
    if (notif) {
        this.ui.showAchievementToast(notif);
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
        this.xpResult = null;
        this.ball.reset(SB.canvasWidth, SB.canvasHeight);
        this._applySkin();
        this.spawner.reset();
        this.powerupEffects.reset();
        this.achievements.onRunStart();
    } else if (newState === SB.STATES.GAME_OVER) {
        this.screenFlash = 0.15;
        this.isNewHigh = SB.Storage.isNewHighScore(Math.floor(this.score));
        SB.Storage.setHighScore(Math.floor(this.score));
        this.highScore = SB.Storage.getHighScore();
        this.gameOverCooldown = 0;
        this.achievements.onRunEnd(this.score);
        this.xpResult = this.progression.addRunXP(this.score, this.runStars);
        this.ui.resetGameOver(this.score, this.xpResult, this.progression);
        SB.audio.playGameOver();
    } else if (newState === SB.STATES.START) {
        this.highScore = SB.Storage.getHighScore();
        this.showTutorial = false;
    }
};

SB.Game.prototype.render = function(ctx, cw, ch) {
    ctx.save();

    if (this.screenShake > 0) {
        var shakeX = (Math.random() - 0.5) * 6;
        var shakeY = (Math.random() - 0.5) * 6;
        ctx.translate(shakeX, shakeY);
    }

    this.background.draw(ctx, cw, ch);

    switch (this.state) {
        case SB.STATES.START:
            this.ui.drawStartScreen(ctx, cw, ch, this.highScore, this.progression, this.achievements);
            break;

        case SB.STATES.PLAYING:
            this._renderGameplay(ctx, cw, ch);
            this.ui.drawHUD(ctx, cw, ch, this.score);
            if (this.showTutorial) {
                this.ui.drawTutorial(ctx, cw, ch);
            }
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

    this.ball.draw(ctx);

    if (this.powerupEffects.shield) {
        ctx.save();
        var shimmer = Math.sin(Date.now() * 0.005) * 0.15 + 0.35;
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
        var magnetAlpha = Math.sin(Date.now() * 0.004) * 0.08 + 0.12;
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

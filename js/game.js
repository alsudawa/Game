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
    this.spawner = new SB.Spawner(this.obstaclePool, this.collectiblePool);
    this.background = new SB.Background();
    this.ui = new SB.UI();
    this.input = new SB.Input(canvas);
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
};

SB.Game.prototype.init = function() {
    this.highScore = SB.Storage.getHighScore();
    this.background.init(SB.canvasWidth, SB.canvasHeight);
    this.ball.reset(SB.canvasWidth, SB.canvasHeight);
};

SB.Game.prototype.onResize = function(cw, ch) {
    this.background.init(cw, ch);
};

SB.Game.prototype.update = function(dt) {
    this.ui.update(dt, this.state);
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
    if (this.input.consumeTap()) {
        this.ball.bounce();
        SB.audio.playBounce();
    }

    this.ball.update(dt);

    var cw = SB.canvasWidth;
    var ch = SB.canvasHeight;

    this.spawner.update(dt, this.score, cw, ch);

    var obstacles = this.obstaclePool.getActive();
    var ballBounds = this.ball.getBounds();

    for (var i = obstacles.length - 1; i >= 0; i--) {
        var obs = obstacles[i];
        obs.update(dt);

        if (obs.isOffScreen(cw, ch)) {
            obs.active = false;
            continue;
        }

        var obsBounds = obs.getBounds();
        var hit = false;
        if (obs.type === SB.OBSTACLE_TYPES.BLADE) {
            hit = SB.circleCircleCollision(ballBounds, obsBounds);
        } else {
            hit = SB.circleRectCollision(ballBounds, obsBounds);
        }

        if (hit) {
            this._transitionTo(SB.STATES.GAME_OVER);
            return;
        }
    }

    var collectibles = this.collectiblePool.getActive();
    for (var j = collectibles.length - 1; j >= 0; j--) {
        var col = collectibles[j];
        col.update(dt);

        if (col.x < -50 || col.x > cw + 50 || col.y < -50 || col.y > ch + 50) {
            col.active = false;
            continue;
        }

        if (SB.circleCircleCollision(ballBounds, col.getBounds())) {
            col.active = false;
            this.comboTimer = 2.0;
            this.comboCount++;
            var bonus = col.pointValue * (this.comboCount >= 2 ? 2 : 1);
            this.score += bonus;
            SB.audio.playCollect();
        }
    }

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

    if (this.ball.y - this.ball.radius > ch) {
        this._transitionTo(SB.STATES.GAME_OVER);
    }
};

SB.Game.prototype._updateGameOver = function(dt) {
    this.gameOverCooldown += dt;
    if (this.input.consumeTap() && this.gameOverCooldown >= this.gameOverCooldownTime) {
        this._transitionTo(SB.STATES.START);
    }
};

SB.Game.prototype._transitionTo = function(newState) {
    var oldState = this.state;
    this.state = newState;

    if (newState === SB.STATES.PLAYING) {
        this.score = 0;
        this.scoreTimer = 0;
        this.lastMilestone = 0;
        this.comboTimer = 0;
        this.comboCount = 0;
        this.ball.reset(SB.canvasWidth, SB.canvasHeight);
        this.spawner.reset();
    } else if (newState === SB.STATES.GAME_OVER) {
        this.screenFlash = 0.15;
        this.isNewHigh = SB.Storage.isNewHighScore(Math.floor(this.score));
        SB.Storage.setHighScore(Math.floor(this.score));
        this.highScore = SB.Storage.getHighScore();
        this.gameOverCooldown = 0;
        this.ui.resetGameOver(this.score);
        SB.audio.playGameOver();
    } else if (newState === SB.STATES.START) {
        this.highScore = SB.Storage.getHighScore();
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
            this.ui.drawStartScreen(ctx, cw, ch, this.highScore);
            break;

        case SB.STATES.PLAYING:
            this._renderGameplay(ctx, cw, ch);
            this.ui.drawHUD(ctx, cw, ch, this.score);
            break;

        case SB.STATES.GAME_OVER:
            this._renderGameplay(ctx, cw, ch);
            this.ui.drawGameOver(ctx, cw, ch, this.score, this.highScore, this.isNewHigh);
            break;
    }

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

    this.ball.draw(ctx);
};

window.SB = window.SB || {};

SB.Spawner = function(obstaclePool, collectiblePool) {
    this.obstaclePool = obstaclePool;
    this.collectiblePool = collectiblePool;
    this.obstacleTimer = 0;
    this.collectibleTimer = 0;
    this.difficulty = 0;
    this.graceTimer = 0;
    this.gracePeriod = 2.0;
};

SB.Spawner.prototype.reset = function() {
    this.obstacleTimer = 0;
    this.collectibleTimer = 0;
    this.difficulty = 0;
    this.graceTimer = 0;
    this.obstaclePool.releaseAll();
    this.collectiblePool.releaseAll();
};

SB.Spawner.prototype.update = function(dt, score, canvasWidth, canvasHeight) {
    this.graceTimer += dt;
    this.difficulty = Math.min(score / 50, 1.0);

    var spawnInterval = SB.lerp(2.0, 0.8, this.difficulty);
    var speedMultiplier = SB.lerp(1.0, 2.5, this.difficulty);

    if (this.graceTimer > this.gracePeriod) {
        this.obstacleTimer += dt;
        if (this.obstacleTimer >= spawnInterval) {
            this.obstacleTimer = 0;
            this._spawnObstacle(canvasWidth, canvasHeight, speedMultiplier);
        }
    }

    this.collectibleTimer += dt;
    if (this.collectibleTimer >= 3.0) {
        this.collectibleTimer = 0;
        this._spawnCollectible(canvasWidth, canvasHeight);
    }
};

SB.Spawner.prototype._spawnObstacle = function(canvasWidth, canvasHeight, speedMult) {
    var d = this.difficulty;

    if (d < 0.3) {
        this._spawnPlatform(canvasWidth, canvasHeight, speedMult);
    } else if (d < 0.6) {
        if (Math.random() < 0.3) {
            this._spawnSpike(canvasWidth, canvasHeight, speedMult);
        } else {
            this._spawnPlatform(canvasWidth, canvasHeight, speedMult);
        }
    } else {
        var roll = Math.random();
        if (roll < 0.2) {
            this._spawnBlade(canvasWidth, canvasHeight, speedMult);
        } else if (roll < 0.45) {
            this._spawnSpike(canvasWidth, canvasHeight, speedMult);
        } else if (roll < 0.65) {
            this._spawnSqueeze(canvasWidth, canvasHeight, speedMult);
        } else {
            this._spawnPlatform(canvasWidth, canvasHeight, speedMult);
        }
    }
};

SB.Spawner.prototype._spawnPlatform = function(cw, ch, speedMult) {
    var fromLeft = Math.random() < 0.5;
    var w = SB.randRange(60, 120);
    var h = 14;
    var speed = SB.randRange(1.5, 3.5) * speedMult;
    var y = SB.randRange(ch * 0.1, ch * 0.85);

    var config = {
        type: SB.OBSTACLE_TYPES.PLATFORM,
        x: fromLeft ? -w : cw,
        y: y,
        width: w,
        height: h,
        speed: speed,
        direction: fromLeft ? 1 : -1,
        oscillateAmplitude: this.difficulty > 0.4 && Math.random() < 0.3 ? SB.randRange(20, 50) : 0,
        oscillateSpeed: SB.randRange(2, 4)
    };

    this.obstaclePool.acquire(config);
};

SB.Spawner.prototype._spawnSpike = function(cw, ch, speedMult) {
    var fromLeft = Math.random() < 0.5;
    var size = SB.randRange(22, 30);
    var speed = SB.randRange(1.0, 2.5) * speedMult;
    var y = SB.randRange(ch * 0.1, ch * 0.8);

    this.obstaclePool.acquire({
        type: SB.OBSTACLE_TYPES.SPIKE,
        x: fromLeft ? -size : cw,
        y: y,
        width: size,
        height: size,
        speed: speed,
        direction: fromLeft ? 1 : -1
    });
};

SB.Spawner.prototype._spawnBlade = function(cw, ch, speedMult) {
    var fromLeft = Math.random() < 0.5;
    var radius = SB.randRange(16, 22);
    var speed = SB.randRange(1.5, 3.0) * speedMult;
    var y = SB.randRange(ch * 0.15, ch * 0.75);

    this.obstaclePool.acquire({
        type: SB.OBSTACLE_TYPES.BLADE,
        x: fromLeft ? -radius * 2 : cw,
        y: y,
        width: radius * 2,
        height: radius * 2,
        speed: speed,
        direction: fromLeft ? 1 : -1,
        radius: radius,
        rotationSpeed: SB.randRange(3, 6)
    });
};

SB.Spawner.prototype._spawnSqueeze = function(cw, ch, speedMult) {
    var y = SB.randRange(ch * 0.2, ch * 0.7);
    var gapSize = Math.max(60, 80 - this.difficulty * 20);
    var gapCenter = SB.randRange(cw * 0.3, cw * 0.7);
    var speed = SB.randRange(1.5, 2.5) * speedMult;

    var leftW = gapCenter - gapSize / 2;
    var rightW = cw - gapCenter - gapSize / 2;

    if (leftW > 20) {
        this.obstaclePool.acquire({
            type: SB.OBSTACLE_TYPES.PLATFORM,
            x: 0,
            y: y,
            width: leftW,
            height: 14,
            speed: 0,
            direction: 0,
            oscillateAmplitude: 0,
            oscillateSpeed: 0
        });
    }

    if (rightW > 20) {
        this.obstaclePool.acquire({
            type: SB.OBSTACLE_TYPES.PLATFORM,
            x: gapCenter + gapSize / 2,
            y: y,
            width: rightW,
            height: 14,
            speed: 0,
            direction: 0,
            oscillateAmplitude: 0,
            oscillateSpeed: 0
        });
    }

    this.collectiblePool.acquire({
        x: gapCenter,
        y: y - 25
    });
};

SB.Spawner.prototype._spawnCollectible = function(cw, ch) {
    var x = SB.randRange(cw * 0.1, cw * 0.9);
    var y = SB.randRange(ch * 0.1, ch * 0.7);

    this.collectiblePool.acquire({ x: x, y: y });
};

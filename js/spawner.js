window.SB = window.SB || {};

SB.Spawner = function(obstaclePool, collectiblePool, powerupPool) {
    this.obstaclePool = obstaclePool;
    this.collectiblePool = collectiblePool;
    this.powerupPool = powerupPool;
    this.obstacleTimer = 0;
    this.collectibleTimer = 0;
    this.coinTimer = 0;
    this.powerupTimer = 0;
    this.difficulty = 0;
    this.extraDifficulty = 0;
    this.veteranBonus = 0;
    this.graceTimer = 0;
    this.gracePeriod = 2.0;
    this.lastSpawnedPowerup = false;
    this.lastSpawnedObstacle = false;
    // Warning queue: obstacles are queued with a warning period before actual spawn
    this._warnings = [];
    this._warningPool = [];
    this._spawnFlashes = [];
    this._flashPool = [];
    for (var fi = 0; fi < 6; fi++) this._flashPool.push({ x: 0, y: 0, side: 0, timer: 0 });
    for (var wi = 0; wi < 10; wi++) {
        this._warningPool.push({ active: false, timer: 0, duration: 0, side: 0, x: 0, y: 0, type: '', obstacles: null, collectibles: null });
    }
};

SB.Spawner.prototype.reset = function(veteranBonus) {
    this.obstacleTimer = 0;
    this.collectibleTimer = 0;
    this.coinTimer = 0;
    this.powerupTimer = 0;
    this.difficulty = 0;
    this.extraDifficulty = 0;
    this.veteranBonus = veteranBonus || 0;
    this.dailySpeedMult = 1;
    this.dailySizeMult = 1;
    this.graceTimer = 0;
    this.gracePeriod = Math.max(0.8, 2.0 - this.veteranBonus * 5);
    this.obstaclePool.releaseAll();
    this.collectiblePool.releaseAll();
    if (this.powerupPool) this.powerupPool.releaseAll();
    this._warnings.length = 0;
    for (var wi = 0; wi < this._warningPool.length; wi++) this._warningPool[wi].active = false;
    this._spawnFlashes.length = 0;
};

SB.Spawner.prototype.update = function(dt, score, canvasWidth, canvasHeight) {
    this.graceTimer += dt;
    this.difficulty = Math.min(score / 50, 1.0);
    this.extraDifficulty = score > 50 ? Math.min((score - 50) / 150, 1.0) : 0;

    // Effective difficulty includes veteran bonus for returning players
    var d = Math.min(this.difficulty + this.veteranBonus, 1.0);

    var spawnInterval = SB.lerp(1.8, 0.7, d) - this.extraDifficulty * 0.25;
    spawnInterval = Math.max(spawnInterval, 0.45);
    var speedMultiplier = SB.lerp(1.0, 2.5, d) + this.extraDifficulty * 1.0;

    if (this.graceTimer > this.gracePeriod) {
        this.obstacleTimer += dt;
        if (this.obstacleTimer >= spawnInterval) {
            this.obstacleTimer = 0;
            this._queueObstacle(canvasWidth, canvasHeight, speedMultiplier, d);
            this.lastSpawnedObstacle = true;
        }
    }

    // Process warning queue
    var wwi = 0;
    for (var wqi = 0; wqi < this._warnings.length; wqi++) {
        var w = this._warnings[wqi];
        w.timer += dt;
        if (w.timer >= w.duration) {
            this._executeSpawn(w);
            this._addSpawnFlash(w);
            w.active = false;
        } else {
            this._warnings[wwi++] = w;
        }
    }
    this._warnings.length = wwi;

    var fwi = 0;
    for (var fqi = 0; fqi < this._spawnFlashes.length; fqi++) {
        this._spawnFlashes[fqi].timer -= dt;
        if (this._spawnFlashes[fqi].timer > 0) this._spawnFlashes[fwi++] = this._spawnFlashes[fqi];
    }
    this._spawnFlashes.length = fwi;

    this.collectibleTimer += dt;
    if (this.collectibleTimer >= 3.0) {
        this.collectibleTimer = 0;
        this._spawnCollectible(canvasWidth, canvasHeight);
    }

    // Coin spawning (moving coins, appear after score 10)
    if (score >= 10) {
        this.coinTimer += dt;
        var coinInterval = SB.lerp(8, 4.5, d);
        if (this.coinTimer >= coinInterval) {
            this.coinTimer = 0;
            this._spawnCoin(canvasWidth, canvasHeight, speedMultiplier);
        }
    }

    // Powerup spawning (after effective difficulty > 0.1)
    if (this.powerupPool && d > 0.1) {
        this.powerupTimer += dt;
        var puInterval = SB.lerp(15, 8, d);
        if (this.powerupTimer >= puInterval) {
            this.powerupTimer = 0;
            this._spawnPowerup(canvasWidth, canvasHeight);
            this.lastSpawnedPowerup = true;
        }
    }
};

SB.Spawner.prototype._queueObstacle = function(cw, ch, speedMult, d) {
    var warnDur = SB.lerp(0.8, 0.4, d);
    var spawnType = 'platform';
    if (d >= 0.45) {
        var roll = Math.random();
        if (roll < 0.08) spawnType = 'blade';
        else if (roll < 0.15) spawnType = 'boomerang';
        else if (roll < 0.22) spawnType = 'laser';
        else if (roll < 0.29 && this.extraDifficulty > 0.1) spawnType = 'gravity_well';
        else if (roll < 0.40) spawnType = 'spike';
        else if (roll < 0.50) spawnType = 'squeeze';
        else if (roll < 0.58) spawnType = 'wave';
        else if (roll < 0.66) spawnType = 'pincer';
        else if (roll < 0.74 && this.extraDifficulty > 0.05) spawnType = 'corridor';
        else if (roll < 0.80 && this.extraDifficulty > 0.2) spawnType = 'spiral';
    } else if (d >= 0.15) {
        spawnType = Math.random() < 0.25 ? 'spike' : 'platform';
    }
    if (spawnType === 'laser' || spawnType === 'gravity_well') {
        this._spawnByType(spawnType, cw, ch, speedMult);
        return;
    }
    var finalSpeed = speedMult * (this.dailySpeedMult || 1);
    var finalSize = (this.dailySizeMult || 1) * (1 + this.extraDifficulty * 0.15);
    var built = this._buildSpawnConfigs(spawnType, cw, ch, finalSpeed, finalSize);
    var w = null;
    for (var i = 0; i < this._warningPool.length; i++) {
        if (!this._warningPool[i].active) { w = this._warningPool[i]; break; }
    }
    if (!w) { w = { active: false }; this._warningPool.push(w); }
    w.active = true;
    w.timer = 0;
    w.duration = warnDur;
    w.side = built.side;
    w.y = built.y;
    w.x = built.x;
    w.type = spawnType;
    w.obstacles = built.obstacles;
    w.collectibles = built.collectibles;
    this._warnings.push(w);
};

SB.Spawner.prototype._executeSpawn = function(w) {
    for (var i = 0; i < w.obstacles.length; i++) {
        this.obstaclePool.acquire(w.obstacles[i]);
    }
    if (w.collectibles) {
        for (var j = 0; j < w.collectibles.length; j++) {
            this.collectiblePool.acquire(w.collectibles[j]);
        }
    }
};

SB.Spawner.prototype._buildSpawnConfigs = function(type, cw, ch, speedMult, sizeMult) {
    var obstacles = [];
    var collectibles = [];
    var side = 0, warnX = 0, warnY = 0;

    if (type === 'platform') {
        var fromLeft = Math.random() < 0.5;
        var pw = SB.randRange(60, 120) * sizeMult;
        var pspeed = SB.randRange(1.5, 3.5) * speedMult;
        var py = SB.randRange(ch * 0.1, ch * 0.85);
        side = fromLeft ? -1 : 1;
        warnY = py;
        obstacles.push({
            type: SB.OBSTACLE_TYPES.PLATFORM,
            x: fromLeft ? -pw : cw, y: py, width: pw, height: 14,
            speed: pspeed, direction: fromLeft ? 1 : -1,
            oscillateAmplitude: this.difficulty > 0.4 && Math.random() < 0.3 ? SB.randRange(20, 50) : 0,
            oscillateSpeed: SB.randRange(2, 4)
        });
    } else if (type === 'spike') {
        var fromLeft = Math.random() < 0.5;
        var ssize = SB.randRange(22, 30) * sizeMult;
        var sspeed = SB.randRange(1.0, 2.5) * speedMult;
        var sy = SB.randRange(ch * 0.1, ch * 0.8);
        side = fromLeft ? -1 : 1;
        warnY = sy;
        obstacles.push({
            type: SB.OBSTACLE_TYPES.SPIKE,
            x: fromLeft ? -ssize : cw, y: sy, width: ssize, height: ssize,
            speed: sspeed, direction: fromLeft ? 1 : -1
        });
    } else if (type === 'blade') {
        var fromLeft = Math.random() < 0.5;
        var bradius = SB.randRange(16, 22) * sizeMult;
        var bspeed = SB.randRange(1.5, 3.0) * speedMult;
        var by = SB.randRange(ch * 0.15, ch * 0.75);
        side = fromLeft ? -1 : 1;
        warnY = by;
        obstacles.push({
            type: SB.OBSTACLE_TYPES.BLADE,
            x: fromLeft ? -bradius * 2 : cw, y: by,
            width: bradius * 2, height: bradius * 2,
            speed: bspeed, direction: fromLeft ? 1 : -1,
            radius: bradius, rotationSpeed: SB.randRange(3, 6)
        });
    } else if (type === 'boomerang') {
        var fromLeft = Math.random() < 0.5;
        var boomR = SB.randRange(14, 20) * sizeMult;
        var boomSpd = SB.randRange(2.0, 3.5) * speedMult;
        var boomY = SB.randRange(ch * 0.15, ch * 0.75);
        var travelDist = SB.randRange(cw * 0.4, cw * 0.7);
        side = fromLeft ? -1 : 1;
        warnY = boomY;
        obstacles.push({
            type: SB.OBSTACLE_TYPES.BOOMERANG,
            x: fromLeft ? -boomR * 2 : cw, y: boomY,
            width: boomR * 2, height: boomR * 2,
            speed: boomSpd, direction: fromLeft ? 1 : -1,
            radius: boomR, travelDist: travelDist
        });
    } else if (type === 'squeeze') {
        var sqY = SB.randRange(ch * 0.2, ch * 0.7);
        var sqMinGap = 56;
        var sqGapSize = Math.max(sqMinGap, 80 - this.difficulty * 20);
        var sqGapCenter = SB.randRange(cw * 0.3, cw * 0.7);
        var sqLeftW = sqGapCenter - sqGapSize / 2;
        var sqRightW = cw - sqGapCenter - sqGapSize / 2;
        warnX = sqGapCenter;
        warnY = sqY;
        if (sqLeftW > 20) {
            obstacles.push({
                type: SB.OBSTACLE_TYPES.PLATFORM,
                x: 0, y: sqY, width: sqLeftW, height: 14,
                speed: 0, direction: 0, oscillateAmplitude: 0, oscillateSpeed: 0, maxLifetime: 5.0
            });
        }
        if (sqRightW > 20) {
            obstacles.push({
                type: SB.OBSTACLE_TYPES.PLATFORM,
                x: sqGapCenter + sqGapSize / 2, y: sqY, width: sqRightW, height: 14,
                speed: 0, direction: 0, oscillateAmplitude: 0, oscillateSpeed: 0, maxLifetime: 5.0
            });
        }
        collectibles.push({ x: sqGapCenter, y: sqY - 25 });
    } else if (type === 'wave') {
        var fromLeft = Math.random() < 0.5;
        var wBaseY = SB.randRange(ch * 0.2, ch * 0.5);
        var wSize = SB.randRange(20, 26) * sizeMult;
        var wSpeed = SB.randRange(1.2, 2.2) * speedMult;
        var wSpacing = SB.randRange(35, 55);
        side = fromLeft ? -1 : 1;
        warnY = wBaseY + wSpacing;
        for (var wi = 0; wi < 3; wi++) {
            obstacles.push({
                type: SB.OBSTACLE_TYPES.SPIKE,
                x: fromLeft ? -(wSize + wi * wSpacing * 0.5) : cw + wi * wSpacing * 0.5,
                y: wBaseY + wi * wSpacing, width: wSize, height: wSize,
                speed: wSpeed, direction: fromLeft ? 1 : -1
            });
        }
    } else if (type === 'pincer') {
        var pnY = SB.randRange(ch * 0.2, ch * 0.7);
        var pnW = SB.randRange(50, 90) * sizeMult;
        var pnSpeed = SB.randRange(1.5, 2.5) * speedMult;
        side = 2;
        warnX = cw / 2;
        warnY = pnY;
        obstacles.push({
            type: SB.OBSTACLE_TYPES.PLATFORM,
            x: -pnW, y: pnY, width: pnW, height: 14,
            speed: pnSpeed, direction: 1
        });
        obstacles.push({
            type: SB.OBSTACLE_TYPES.PLATFORM,
            x: cw, y: pnY, width: pnW, height: 14,
            speed: pnSpeed, direction: -1
        });
        collectibles.push({ x: cw / 2, y: pnY - 25 });
    } else if (type === 'corridor') {
        var corGapCenter = SB.randRange(ch * 0.25, ch * 0.65);
        var corMinGap = 70;
        var corGapSize = Math.max(corMinGap, 100 - this.difficulty * 30);
        var corFromLeft = Math.random() < 0.5;
        var corSpeed = SB.randRange(1.0, 2.0) * speedMult;
        var corW = SB.randRange(60, 90) * sizeMult;
        side = corFromLeft ? -1 : 1;
        warnY = corGapCenter;
        if (corGapCenter - corGapSize / 2 > 30) {
            obstacles.push({
                type: SB.OBSTACLE_TYPES.PLATFORM,
                x: corFromLeft ? -corW : cw, y: corGapCenter - corGapSize / 2 - 14,
                width: corW, height: 14, speed: corSpeed, direction: corFromLeft ? 1 : -1
            });
        }
        if (corGapCenter + corGapSize / 2 < ch - 30) {
            obstacles.push({
                type: SB.OBSTACLE_TYPES.PLATFORM,
                x: corFromLeft ? -corW : cw, y: corGapCenter + corGapSize / 2,
                width: corW, height: 14, speed: corSpeed, direction: corFromLeft ? 1 : -1
            });
        }
        collectibles.push({
            type: SB.COLLECTIBLE_TYPES.COIN,
            x: corFromLeft ? -15 : cw + 15, y: corGapCenter,
            vx: (corFromLeft ? 1 : -1) * corSpeed * 40, sineAmp: 0, sineFreq: 0
        });
    } else if (type === 'spiral') {
        var spCx = SB.randRange(cw * 0.3, cw * 0.7);
        var spCy = SB.randRange(ch * 0.25, ch * 0.55);
        var spiralR = SB.randRange(50, 80);
        var spSize = SB.randRange(18, 24) * sizeMult;
        warnX = spCx;
        warnY = spCy;
        for (var si = 0; si < 4; si++) {
            var angle = (SB.TAU / 4) * si;
            var sx = spCx + Math.cos(angle) * spiralR;
            var sy = spCy + Math.sin(angle) * spiralR;
            obstacles.push({
                type: SB.OBSTACLE_TYPES.SPIKE,
                x: sx - spSize / 2, y: sy - spSize / 2,
                width: spSize, height: spSize,
                speed: 0, direction: 0, maxLifetime: 4.0
            });
        }
        collectibles.push({ x: spCx, y: spCy });
    }

    return { side: side, x: warnX, y: warnY, obstacles: obstacles, collectibles: collectibles };
};

SB.Spawner.prototype._spawnByType = function(type, cw, ch, speedMult) {
    switch (type) {
        case 'platform': this._spawnPlatform(cw, ch, speedMult); break;
        case 'spike': this._spawnSpike(cw, ch, speedMult); break;
        case 'blade': this._spawnBlade(cw, ch, speedMult); break;
        case 'boomerang': this._spawnBoomerang(cw, ch, speedMult); break;
        case 'laser': this._spawnLaser(cw, ch); break;
        case 'gravity_well': this._spawnGravityWell(cw, ch); break;
        case 'squeeze': this._spawnSqueeze(cw, ch, speedMult); break;
        case 'wave': this._spawnWave(cw, ch, speedMult); break;
        case 'pincer': this._spawnPincer(cw, ch, speedMult); break;
        case 'corridor': this._spawnCorridor(cw, ch, speedMult); break;
        case 'spiral': this._spawnSpiral(cw, ch, speedMult); break;
        default: this._spawnPlatform(cw, ch, speedMult);
    }
};

SB.Spawner.prototype.getWarnings = function() {
    return this._warnings;
};

SB.Spawner.prototype._addSpawnFlash = function(w) {
    var f = null;
    for (var i = 0; i < this._flashPool.length; i++) {
        if (this._flashPool[i].timer <= 0) { f = this._flashPool[i]; break; }
    }
    if (!f) return;
    f.x = w.side === 0 ? w.x : (w.side < 0 ? 0 : (w.side === 2 ? -1 : SB.canvasWidth || 400));
    f.y = w.y;
    f.side = w.side;
    f.timer = 0.25;
    this._spawnFlashes.push(f);
};

SB.Spawner.prototype.getSpawnFlashes = function() {
    return this._spawnFlashes;
};

SB.Spawner.prototype._spawnObstacle = function(canvasWidth, canvasHeight, speedMult) {
    speedMult *= (this.dailySpeedMult || 1);
    var d = Math.min(this.difficulty + this.veteranBonus, 1.0);
    this._sizeMult = (this.dailySizeMult || 1) * (1 + this.extraDifficulty * 0.15);

    if (d < 0.15) {
        this._spawnPlatform(canvasWidth, canvasHeight, speedMult);
    } else if (d < 0.45) {
        if (Math.random() < 0.25) {
            this._spawnSpike(canvasWidth, canvasHeight, speedMult);
        } else {
            this._spawnPlatform(canvasWidth, canvasHeight, speedMult);
        }
    } else {
        var roll = Math.random();
        if (roll < 0.08) {
            this._spawnBlade(canvasWidth, canvasHeight, speedMult);
        } else if (roll < 0.15) {
            this._spawnBoomerang(canvasWidth, canvasHeight, speedMult);
        } else if (roll < 0.22) {
            this._spawnLaser(canvasWidth, canvasHeight);
        } else if (roll < 0.29 && this.extraDifficulty > 0.1) {
            this._spawnGravityWell(canvasWidth, canvasHeight);
        } else if (roll < 0.40) {
            this._spawnSpike(canvasWidth, canvasHeight, speedMult);
        } else if (roll < 0.50) {
            this._spawnSqueeze(canvasWidth, canvasHeight, speedMult);
        } else if (roll < 0.58) {
            this._spawnWave(canvasWidth, canvasHeight, speedMult);
        } else if (roll < 0.66) {
            this._spawnPincer(canvasWidth, canvasHeight, speedMult);
        } else if (roll < 0.74 && this.extraDifficulty > 0.05) {
            this._spawnCorridor(canvasWidth, canvasHeight, speedMult);
        } else if (roll < 0.80 && this.extraDifficulty > 0.2) {
            this._spawnSpiral(canvasWidth, canvasHeight, speedMult);
        } else {
            this._spawnPlatform(canvasWidth, canvasHeight, speedMult);
        }
    }
};

SB.Spawner.prototype._spawnPlatform = function(cw, ch, speedMult) {
    var fromLeft = Math.random() < 0.5;
    var sm = this._sizeMult || 1;
    var w = SB.randRange(60, 120) * sm;
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
    var size = SB.randRange(22, 30) * (this._sizeMult || 1);
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
    var radius = SB.randRange(16, 22) * (this._sizeMult || 1);
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
    // Minimum gap = 4x ball radius for safe passage
    var minGap = 56;
    var gapSize = Math.max(minGap, 80 - this.difficulty * 20);
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
            oscillateSpeed: 0,
            maxLifetime: 5.0
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
            oscillateSpeed: 0,
            maxLifetime: 5.0
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

SB.Spawner.prototype._spawnBoomerang = function(cw, ch, speedMult) {
    var fromLeft = Math.random() < 0.5;
    var radius = SB.randRange(14, 20) * (this._sizeMult || 1);
    var speed = SB.randRange(2.0, 3.5) * speedMult;
    var y = SB.randRange(ch * 0.15, ch * 0.75);
    var travelDist = SB.randRange(cw * 0.4, cw * 0.7);

    this.obstaclePool.acquire({
        type: SB.OBSTACLE_TYPES.BOOMERANG,
        x: fromLeft ? -radius * 2 : cw,
        y: y,
        width: radius * 2,
        height: radius * 2,
        speed: speed,
        direction: fromLeft ? 1 : -1,
        radius: radius,
        travelDist: travelDist
    });
};

SB.Spawner.prototype._spawnLaser = function(cw, ch) {
    var y = SB.randRange(ch * 0.15, ch * 0.8);
    this.obstaclePool.acquire({
        type: SB.OBSTACLE_TYPES.LASER,
        x: 0,
        y: y,
        width: cw,
        height: 18,
        speed: 0,
        direction: 0
    });
};

SB.Spawner.prototype._spawnPowerup = function(cw, ch) {
    var types = [SB.POWERUP_TYPES.SHIELD, SB.POWERUP_TYPES.MAGNET, SB.POWERUP_TYPES.SLOW, SB.POWERUP_TYPES.SCORE_MULT];
    var type = types[SB.randInt(0, types.length - 1)];
    var x = SB.randRange(cw * 0.15, cw * 0.85);
    var y = SB.randRange(ch * 0.15, ch * 0.6);

    this.powerupPool.acquire({ x: x, y: y, type: type });
};

SB.Spawner.prototype._spawnGravityWell = function(cw, ch) {
    var x = SB.randRange(cw * 0.15, cw * 0.85);
    var y = SB.randRange(ch * 0.15, ch * 0.65);
    var coreR = SB.randRange(12, 18);
    var pullR = SB.randRange(70, 100);
    var strength = SB.lerp(150, 280, this.extraDifficulty);

    this.obstaclePool.acquire({
        type: SB.OBSTACLE_TYPES.GRAVITY_WELL,
        x: x - coreR,
        y: y - coreR,
        width: coreR * 2,
        height: coreR * 2,
        radius: coreR,
        pullRadius: pullR,
        pullStrength: strength,
        speed: 0,
        direction: 0,
        maxLifetime: SB.randRange(4, 7)
    });
};

SB.Spawner.prototype._spawnWave = function(cw, ch, speedMult) {
    // Three spikes in a diagonal wave pattern, staggered vertically
    var fromLeft = Math.random() < 0.5;
    var baseY = SB.randRange(ch * 0.2, ch * 0.5);
    var size = SB.randRange(20, 26) * (this._sizeMult || 1);
    var speed = SB.randRange(1.2, 2.2) * speedMult;
    var spacing = SB.randRange(35, 55);

    for (var i = 0; i < 3; i++) {
        this.obstaclePool.acquire({
            type: SB.OBSTACLE_TYPES.SPIKE,
            x: fromLeft ? -(size + i * spacing * 0.5) : cw + i * spacing * 0.5,
            y: baseY + i * spacing,
            width: size,
            height: size,
            speed: speed,
            direction: fromLeft ? 1 : -1
        });
    }
};

SB.Spawner.prototype._spawnPincer = function(cw, ch, speedMult) {
    // Two platforms converging from opposite sides at same height
    var y = SB.randRange(ch * 0.2, ch * 0.7);
    var w = SB.randRange(50, 90) * (this._sizeMult || 1);
    var speed = SB.randRange(1.5, 2.5) * speedMult;

    this.obstaclePool.acquire({
        type: SB.OBSTACLE_TYPES.PLATFORM,
        x: -w,
        y: y,
        width: w,
        height: 14,
        speed: speed,
        direction: 1
    });
    this.obstaclePool.acquire({
        type: SB.OBSTACLE_TYPES.PLATFORM,
        x: cw,
        y: y,
        width: w,
        height: 14,
        speed: speed,
        direction: -1
    });
    // Reward star in the center gap
    this.collectiblePool.acquire({
        x: cw / 2,
        y: y - 25
    });
};

SB.Spawner.prototype._spawnCorridor = function(cw, ch, speedMult) {
    // Two vertical stacks of platforms creating a narrow corridor to fly through
    var gapCenter = SB.randRange(ch * 0.25, ch * 0.65);
    // Minimum gap = 5x ball radius for comfortable passage
    var minGap = 70;
    var gapSize = Math.max(minGap, 100 - this.difficulty * 30);
    var fromLeft = Math.random() < 0.5;
    var speed = SB.randRange(1.0, 2.0) * speedMult;
    var w = SB.randRange(60, 90) * (this._sizeMult || 1);

    // Top block
    if (gapCenter - gapSize / 2 > 30) {
        this.obstaclePool.acquire({
            type: SB.OBSTACLE_TYPES.PLATFORM,
            x: fromLeft ? -w : cw,
            y: gapCenter - gapSize / 2 - 14,
            width: w,
            height: 14,
            speed: speed,
            direction: fromLeft ? 1 : -1
        });
    }
    // Bottom block
    if (gapCenter + gapSize / 2 < ch - 30) {
        this.obstaclePool.acquire({
            type: SB.OBSTACLE_TYPES.PLATFORM,
            x: fromLeft ? -w : cw,
            y: gapCenter + gapSize / 2,
            width: w,
            height: 14,
            speed: speed,
            direction: fromLeft ? 1 : -1
        });
    }
    // Coin reward in gap
    this.collectiblePool.acquire({
        type: SB.COLLECTIBLE_TYPES.COIN,
        x: fromLeft ? -15 : cw + 15,
        y: gapCenter,
        vx: (fromLeft ? 1 : -1) * speed * 40,
        sineAmp: 0,
        sineFreq: 0
    });
};

SB.Spawner.prototype._spawnSpiral = function(cw, ch, speedMult) {
    var cx = SB.randRange(cw * 0.3, cw * 0.7);
    var cy = SB.randRange(ch * 0.25, ch * 0.55);
    var spikeCount = 4;
    var spiralR = SB.randRange(50, 80);
    var size = SB.randRange(18, 24) * (this._sizeMult || 1);

    for (var i = 0; i < spikeCount; i++) {
        var angle = (SB.TAU / spikeCount) * i;
        var sx = cx + Math.cos(angle) * spiralR;
        var sy = cy + Math.sin(angle) * spiralR;
        this.obstaclePool.acquire({
            type: SB.OBSTACLE_TYPES.SPIKE,
            x: sx - size / 2,
            y: sy - size / 2,
            width: size,
            height: size,
            speed: 0,
            direction: 0,
            maxLifetime: 4.0
        });
    }
    // Reward in center
    this.collectiblePool.acquire({ x: cx, y: cy });
};

SB.Spawner.prototype._spawnCoin = function(cw, ch, speedMult) {
    var fromLeft = Math.random() < 0.5;
    var y = SB.randRange(ch * 0.15, ch * 0.65);
    var speed = SB.randRange(1.2, 2.2) * speedMult;

    this.collectiblePool.acquire({
        type: SB.COLLECTIBLE_TYPES.COIN,
        x: fromLeft ? -15 : cw + 15,
        y: y,
        vx: (fromLeft ? 1 : -1) * speed * 40,
        sineAmp: SB.randRange(20, 45),
        sineFreq: SB.randRange(2, 3.5)
    });
};

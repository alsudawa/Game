window.SB = window.SB || {};

SB.Particle = function() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.maxLife = 1;
    this.size = 2;
    this.color = '255,255,255';
    this.active = false;
    this.gravity = 0;
    this.friction = 1;
    this.shrink = true;
};

SB.ParticleSystem = function(poolSize) {
    this.pool = [];
    for (var i = 0; i < poolSize; i++) {
        this.pool.push(new SB.Particle());
    }
};

SB.ParticleSystem.prototype._acquire = function() {
    for (var i = 0; i < this.pool.length; i++) {
        if (!this.pool[i].active) return this.pool[i];
    }
    var p = new SB.Particle();
    this.pool.push(p);
    return p;
};

SB.ParticleSystem.prototype.emit = function(x, y, config) {
    var count = config.count || 10;
    for (var i = 0; i < count; i++) {
        var p = this._acquire();
        p.active = true;
        var spread = config.spread || 0;
        p.x = x + SB.randRange(-spread, spread);
        p.y = y + SB.randRange(-spread, spread);
        var angle = config.angle !== undefined
            ? config.angle + SB.randRange(-(config.angleSpread || Math.PI), config.angleSpread || Math.PI)
            : SB.randRange(0, SB.TAU);
        var speed = SB.randRange(config.speedMin || 50, config.speedMax || 150);
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.life = SB.randRange(config.lifeMin || 0.3, config.lifeMax || 0.8);
        p.maxLife = p.life;
        p.size = SB.randRange(config.sizeMin || 1, config.sizeMax || 4);
        p.color = config.color || '255,255,255';
        p.gravity = config.gravity || 0;
        p.friction = config.friction || 0.98;
        p.shrink = config.shrink !== false;
    }
};

SB.ParticleSystem.prototype.update = function(dt) {
    for (var i = 0; i < this.pool.length; i++) {
        var p = this.pool[i];
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) { p.active = false; continue; }
        p.vy += p.gravity * dt;
        p.vx *= p.friction;
        p.vy *= p.friction;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
    }
};

SB.ParticleSystem.prototype.draw = function(ctx) {
    for (var i = 0; i < this.pool.length; i++) {
        var p = this.pool[i];
        if (!p.active) continue;
        var t = p.life / p.maxLife;
        var alpha = t;
        var size = p.shrink ? p.size * t : p.size;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, size), 0, SB.TAU);
        ctx.fillStyle = 'rgba(' + p.color + ',' + alpha.toFixed(2) + ')';
        ctx.fill();
    }
};

// Preset particle configurations
SB.FX = {
    starCollect: {
        count: 12,
        spread: 3,
        speedMin: 80,
        speedMax: 220,
        lifeMin: 0.3,
        lifeMax: 0.6,
        sizeMin: 1.5,
        sizeMax: 4,
        color: '255,215,0',
        gravity: 120,
        friction: 0.96
    },
    powerupShield: {
        count: 14,
        spread: 5,
        speedMin: 60,
        speedMax: 180,
        lifeMin: 0.4,
        lifeMax: 0.8,
        sizeMin: 2,
        sizeMax: 5,
        color: '52,152,219',
        gravity: 50,
        friction: 0.95
    },
    powerupMagnet: {
        count: 14,
        spread: 5,
        speedMin: 60,
        speedMax: 180,
        lifeMin: 0.4,
        lifeMax: 0.8,
        sizeMin: 2,
        sizeMax: 5,
        color: '155,89,182',
        gravity: 50,
        friction: 0.95
    },
    powerupSlow: {
        count: 14,
        spread: 5,
        speedMin: 60,
        speedMax: 180,
        lifeMin: 0.4,
        lifeMax: 0.8,
        sizeMin: 2,
        sizeMax: 5,
        color: '46,204,113',
        gravity: 50,
        friction: 0.95
    },
    deathExplosion: {
        count: 28,
        spread: 5,
        speedMin: 120,
        speedMax: 380,
        lifeMin: 0.5,
        lifeMax: 1.2,
        sizeMin: 2,
        sizeMax: 6,
        color: '231,76,60',
        gravity: 200,
        friction: 0.97
    },
    shieldBreak: {
        count: 16,
        spread: 8,
        speedMin: 70,
        speedMax: 160,
        lifeMin: 0.3,
        lifeMax: 0.7,
        sizeMin: 1.5,
        sizeMax: 3.5,
        color: '52,152,219',
        gravity: 0,
        friction: 0.94
    },
    bounce: {
        count: 5,
        spread: 4,
        speedMin: 30,
        speedMax: 80,
        lifeMin: 0.15,
        lifeMax: 0.3,
        sizeMin: 1,
        sizeMax: 2.5,
        color: '255,215,0',
        angle: -Math.PI / 2,
        angleSpread: Math.PI / 3,
        gravity: -30,
        friction: 0.95
    },
    powerupScoreMult: {
        count: 14,
        spread: 5,
        speedMin: 60,
        speedMax: 180,
        lifeMin: 0.4,
        lifeMax: 0.8,
        sizeMin: 2,
        sizeMax: 5,
        color: '255,193,7',
        gravity: 50,
        friction: 0.95
    },
    coinCollect: {
        count: 8,
        spread: 2,
        speedMin: 60,
        speedMax: 160,
        lifeMin: 0.25,
        lifeMax: 0.5,
        sizeMin: 1.5,
        sizeMax: 3,
        color: '255,180,0',
        gravity: 80,
        friction: 0.96
    },
    bounceDust: {
        count: 4,
        spread: 2,
        speedMin: 20,
        speedMax: 60,
        lifeMin: 0.12,
        lifeMax: 0.25,
        sizeMin: 1,
        sizeMax: 2,
        color: '200,200,220',
        angle: Math.PI / 2,
        angleSpread: Math.PI / 4,
        gravity: -20,
        friction: 0.92
    },
    comboExplosion: {
        count: 18,
        spread: 6,
        speedMin: 100,
        speedMax: 300,
        lifeMin: 0.3,
        lifeMax: 0.7,
        sizeMin: 2,
        sizeMax: 5,
        color: '255,140,66',
        gravity: 80,
        friction: 0.96
    }
};

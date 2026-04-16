window.SB = window.SB || {};

SB.POWERUP_TYPES = {
    SHIELD: 'shield',
    MAGNET: 'magnet',
    SLOW: 'slow',
    SCORE_MULT: 'score_mult'
};

SB.Powerup = function() {
    this.x = 0;
    this.y = 0;
    this.radius = 14;
    this.active = false;
    this.type = SB.POWERUP_TYPES.SHIELD;
    this.phase = 0;
};

SB.Powerup.prototype.init = function(config) {
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.type = config.type || SB.POWERUP_TYPES.SHIELD;
    this.active = true;
    this.phase = 0;
};

SB.Powerup.prototype.update = function(dt) {
    if (!this.active) return;
    this.phase += 3 * dt;
};

SB.Powerup.prototype.draw = function(ctx) {
    if (!this.active) return;

    var pulse = 1 + Math.sin(this.phase) * 0.12;
    var r = this.radius * pulse;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Outer glow
    var colors = {
        shield:     { glow: 'rgba(52, 152, 219, 0.5)', fill1: '#5DADE2', fill2: '#2E86C1', icon: '\u25CB' },
        magnet:     { glow: 'rgba(155, 89, 182, 0.5)', fill1: '#AF7AC5', fill2: '#7D3C98', icon: 'M' },
        slow:       { glow: 'rgba(46, 204, 113, 0.5)', fill1: '#58D68D', fill2: '#27AE60', icon: '\u25F7' },
        score_mult: { glow: 'rgba(255, 193, 7, 0.5)',  fill1: '#FFD54F', fill2: '#FF8F00', icon: 'x2' }
    };
    var c = colors[this.type];

    ctx.shadowColor = c.glow;
    ctx.shadowBlur = 18;

    // Circle background
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, SB.TAU);
    var grad = ctx.createRadialGradient(0, -r * 0.3, r * 0.1, 0, 0, r);
    grad.addColorStop(0, c.fill1);
    grad.addColorStop(1, c.fill2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Icon
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.floor(r * 1.1) + 'px sans-serif';

    if (this.type === SB.POWERUP_TYPES.SHIELD) {
        // Shield icon: draw a small shield shape
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.5);
        ctx.lineTo(r * 0.45, -r * 0.2);
        ctx.lineTo(r * 0.35, r * 0.3);
        ctx.quadraticCurveTo(0, r * 0.6, -r * 0.35, r * 0.3);
        ctx.lineTo(-r * 0.45, -r * 0.2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fill();
    } else if (this.type === SB.POWERUP_TYPES.MAGNET) {
        ctx.fillText('M', 0, 1);
    } else if (this.type === SB.POWERUP_TYPES.SLOW) {
        // Clock icon
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.45, 0, SB.TAU);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -r * 0.35);
        ctx.moveTo(0, 0);
        ctx.lineTo(r * 0.2, r * 0.1);
        ctx.stroke();
    } else if (this.type === SB.POWERUP_TYPES.SCORE_MULT) {
        ctx.font = 'bold ' + Math.floor(r * 0.9) + 'px sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('x2', 0, 1);
    }

    ctx.restore();
};

SB.Powerup.prototype.getBounds = function() {
    return { x: this.x, y: this.y, radius: this.radius * 1.3 };
};

// Pool
SB.PowerupPool = function(size) {
    this.pool = [];
    this._activeBuffer = [];
    for (var i = 0; i < size; i++) {
        this.pool.push(new SB.Powerup());
    }
};

SB.PowerupPool.prototype.acquire = function(config) {
    for (var i = 0; i < this.pool.length; i++) {
        if (!this.pool[i].active) {
            this.pool[i].init(config);
            return this.pool[i];
        }
    }
    var p = new SB.Powerup();
    p.init(config);
    this.pool.push(p);
    return p;
};

SB.PowerupPool.prototype.releaseAll = function() {
    for (var i = 0; i < this.pool.length; i++) {
        this.pool[i].active = false;
    }
};

SB.PowerupPool.prototype.getActive = function() {
    this._activeBuffer.length = 0;
    for (var i = 0; i < this.pool.length; i++) {
        if (this.pool[i].active) {
            this._activeBuffer.push(this.pool[i]);
        }
    }
    return this._activeBuffer;
};

// Active powerup effect manager
SB.PowerupEffects = function() {
    this.shield = false;
    this.shieldTimer = 0;
    this.magnet = false;
    this.magnetTimer = 0;
    this.slow = false;
    this.slowTimer = 0;
    this.scoreMult = false;
    this.scoreMultTimer = 0;
    this.shieldDuration = 5.0;
    this.magnetDuration = 4.0;
    this.slowDuration = 3.0;
    this.scoreMultDuration = 6.0;
    this.shieldHits = 0;
};

SB.PowerupEffects.prototype.activate = function(type) {
    if (type === SB.POWERUP_TYPES.SHIELD) {
        this.shield = true;
        this.shieldTimer = this.shieldDuration;
        this.shieldHits = 1;
    } else if (type === SB.POWERUP_TYPES.MAGNET) {
        this.magnet = true;
        this.magnetTimer = this.magnetDuration;
    } else if (type === SB.POWERUP_TYPES.SLOW) {
        this.slow = true;
        this.slowTimer = this.slowDuration;
    } else if (type === SB.POWERUP_TYPES.SCORE_MULT) {
        this.scoreMult = true;
        this.scoreMultTimer = this.scoreMultDuration;
    }
};

SB.PowerupEffects.prototype.update = function(dt) {
    if (this.shield) {
        this.shieldTimer -= dt;
        if (this.shieldTimer <= 0 || this.shieldHits <= 0) {
            this.shield = false;
        }
    }
    if (this.magnet) {
        this.magnetTimer -= dt;
        if (this.magnetTimer <= 0) this.magnet = false;
    }
    if (this.slow) {
        this.slowTimer -= dt;
        if (this.slowTimer <= 0) this.slow = false;
    }
    if (this.scoreMult) {
        this.scoreMultTimer -= dt;
        if (this.scoreMultTimer <= 0) this.scoreMult = false;
    }
};

SB.PowerupEffects.prototype.useShield = function() {
    if (this.shield && this.shieldHits > 0) {
        this.shieldHits--;
        if (this.shieldHits <= 0) this.shield = false;
        return true;
    }
    return false;
};

SB.PowerupEffects.prototype.getSpeedMultiplier = function() {
    return this.slow ? 0.4 : 1.0;
};

SB.PowerupEffects.prototype.getScoreMultiplier = function() {
    return this.scoreMult ? 2 : 1;
};

SB.PowerupEffects.prototype.reset = function() {
    this.shield = false;
    this.shieldTimer = 0;
    this.magnet = false;
    this.magnetTimer = 0;
    this.slow = false;
    this.slowTimer = 0;
    this.scoreMult = false;
    this.scoreMultTimer = 0;
    this.shieldHits = 0;
};

SB.PowerupEffects.prototype.hasAnyActive = function() {
    return this.shield || this.magnet || this.slow || this.scoreMult;
};

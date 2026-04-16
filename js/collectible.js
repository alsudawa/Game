window.SB = window.SB || {};

SB.Collectible = function() {
    this.x = 0;
    this.y = 0;
    this.radius = 10;
    this.active = false;
    this.rotation = 0;
    this.pulsePhase = 0;
    this.sparkles = [];
    this.pointValue = 5;
};

SB.Collectible.prototype.init = function(config) {
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.active = true;
    this.rotation = 0;
    this.pulsePhase = Math.random() * SB.TAU;
    this.sparkles = [];
    for (var i = 0; i < 3; i++) {
        this.sparkles.push({
            angle: SB.randRange(0, SB.TAU),
            dist: SB.randRange(14, 22),
            speed: SB.randRange(1, 2.5),
            size: SB.randRange(1, 2.5),
            phase: SB.randRange(0, SB.TAU)
        });
    }
};

SB.Collectible.prototype.update = function(dt) {
    if (!this.active) return;
    this.rotation += 1.5 * dt;
    this.pulsePhase += 3 * dt;
    for (var i = 0; i < this.sparkles.length; i++) {
        this.sparkles[i].phase += this.sparkles[i].speed * dt;
    }
};

SB.Collectible.prototype.draw = function(ctx) {
    if (!this.active) return;

    var pulse = 1 + Math.sin(this.pulsePhase) * 0.15;
    var r = this.radius * pulse;

    ctx.save();
    ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
    ctx.shadowBlur = 15;

    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.beginPath();
    for (var i = 0; i < 5; i++) {
        var outerAngle = (SB.TAU / 5) * i - Math.PI / 2;
        var innerAngle = outerAngle + Math.PI / 5;
        var ox = Math.cos(outerAngle) * r;
        var oy = Math.sin(outerAngle) * r;
        var ix = Math.cos(innerAngle) * r * 0.4;
        var iy = Math.sin(innerAngle) * r * 0.4;
        if (i === 0) {
            ctx.moveTo(ox, oy);
        } else {
            ctx.lineTo(ox, oy);
        }
        ctx.lineTo(ix, iy);
    }
    ctx.closePath();

    var gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    gradient.addColorStop(0, '#FFF8DC');
    gradient.addColorStop(1, '#FFD700');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.restore();

    for (var j = 0; j < this.sparkles.length; j++) {
        var s = this.sparkles[j];
        var alpha = (Math.sin(s.phase) + 1) / 2 * 0.8;
        var sx = this.x + Math.cos(s.angle + s.phase * 0.3) * s.dist;
        var sy = this.y + Math.sin(s.angle + s.phase * 0.3) * s.dist;
        ctx.beginPath();
        ctx.arc(sx, sy, s.size, 0, SB.TAU);
        ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
        ctx.fill();
    }
};

SB.Collectible.prototype.getBounds = function() {
    return { x: this.x, y: this.y, radius: this.radius };
};

// Object Pool
SB.CollectiblePool = function(size) {
    this.pool = [];
    this._activeBuffer = [];
    for (var i = 0; i < size; i++) {
        this.pool.push(new SB.Collectible());
    }
};

SB.CollectiblePool.prototype.acquire = function(config) {
    for (var i = 0; i < this.pool.length; i++) {
        if (!this.pool[i].active) {
            this.pool[i].init(config);
            return this.pool[i];
        }
    }
    var col = new SB.Collectible();
    col.init(config);
    this.pool.push(col);
    return col;
};

SB.CollectiblePool.prototype.releaseAll = function() {
    for (var i = 0; i < this.pool.length; i++) {
        this.pool[i].active = false;
    }
};

SB.CollectiblePool.prototype.getActive = function() {
    this._activeBuffer.length = 0;
    for (var i = 0; i < this.pool.length; i++) {
        if (this.pool[i].active) {
            this._activeBuffer.push(this.pool[i]);
        }
    }
    return this._activeBuffer;
};

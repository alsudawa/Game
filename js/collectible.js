window.SB = window.SB || {};

SB.COLLECTIBLE_TYPES = { STAR: 'star', COIN: 'coin' };

SB.Collectible = function() {
    this.x = 0;
    this.y = 0;
    this.radius = 10;
    this.active = false;
    this.rotation = 0;
    this.pulsePhase = 0;
    this.sparkles = [];
    this.pointValue = 5;
    this.type = SB.COLLECTIBLE_TYPES.STAR;
    this.coinValue = 1;
    this.baseY = 0;
    this.vx = 0;
    this.sineAmp = 0;
    this.sineFreq = 0;
    this.lifetime = 0;
    this._proximity = 0;
};

SB.Collectible.prototype.init = function(config) {
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.active = true;
    this.rotation = 0;
    this.pulsePhase = Math.random() * SB.TAU;
    this.type = config.type || SB.COLLECTIBLE_TYPES.STAR;
    this.lifetime = 0;

    if (this.type === SB.COLLECTIBLE_TYPES.COIN) {
        this.pointValue = 3;
        this.coinValue = 2;
        this.radius = 9;
        this.baseY = this.y;
        this.vx = config.vx || 0;
        this.sineAmp = config.sineAmp || 30;
        this.sineFreq = config.sineFreq || 2.5;
        this.sparkles = [];
        for (var ci = 0; ci < 2; ci++) {
            this.sparkles.push({
                angle: SB.randRange(0, SB.TAU), dist: SB.randRange(12, 18),
                speed: SB.randRange(1.5, 3), size: SB.randRange(0.8, 1.5),
                phase: SB.randRange(0, SB.TAU)
            });
        }
    } else {
        this.pointValue = 5;
        this.coinValue = 1;
        this.radius = 10;
        this.vx = 0;
        this.sineAmp = 0;
        this.sineFreq = 0;
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
    }
};

SB.Collectible.prototype.update = function(dt) {
    if (!this.active) return;
    var rotMag = this._magnetPull > 0 ? 1 + this._magnetPull * 3 : 1;
    this.rotation += 1.5 * dt * rotMag;
    this.pulsePhase += (3 + (SB._difficulty || 0) * 2) * dt;
    this.lifetime += dt;

    if (this.type === SB.COLLECTIBLE_TYPES.COIN) {
        this.x += this.vx * dt;
        this.y = this.baseY + Math.sin(this.lifetime * this.sineFreq) * this.sineAmp;
    }

    for (var i = 0; i < this.sparkles.length; i++) {
        this.sparkles[i].phase += this.sparkles[i].speed * dt;
    }
};

SB.Collectible.prototype._edgeProximity = function() {
    // Returns 0-1 based on how close to screen edge (1 = about to despawn)
    var margin = 80;
    var cw = SB.canvasWidth;
    var ch = SB.canvasHeight;
    var dx = Math.min(this.x, cw - this.x);
    var dy = Math.min(this.y, ch - this.y);
    var closest = Math.min(dx, dy);
    if (closest > margin) return 0;
    return 1 - closest / margin;
};

SB.Collectible.prototype.draw = function(ctx) {
    if (!this.active) return;

    var edgeWarn = this._edgeProximity();
    if (edgeWarn > 0.5) {
        var blinkRate = 8 + edgeWarn * 12;
        if (Math.sin(this.lifetime * blinkRate) < 0) return;
    }

    if (this.type === SB.COLLECTIBLE_TYPES.COIN) {
        this._drawCoin(ctx);
        return;
    }

    var proxBoost0 = this._proximity > 0 ? this._proximity : 0;
    var pulse = 1 + Math.sin(this.pulsePhase) * 0.15 + proxBoost0 * 0.15;
    var r = this.radius * pulse;
    var bobY = Math.sin(this.lifetime * 2.2) * 4;
    if (proxBoost0 > 0.3) {
        var pullF = (proxBoost0 - 0.3) / 0.7;
        var pullA = Math.sin(this.lifetime * 8) * pullF * 2;
        bobY += pullA;
    }

    // Subtle vertical bob trail
    if (!SB.reducedMotion) {
        var btGrad = ctx.createLinearGradient(this.x, this.y - 4, this.x, this.y + 4);
        btGrad.addColorStop(0, 'rgba(255,215,0,0)');
        btGrad.addColorStop(0.5, 'rgba(255,215,0,0.06)');
        btGrad.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.fillStyle = btGrad;
        ctx.fillRect(this.x - 1, this.y - 4, 2, 8);
    }

    var proxBoost = this._proximity > 0 ? this._proximity : 0;
    var magnetPull = this._magnetPull || 0;
    var extraGlow = (edgeWarn > 0 ? edgeWarn * 15 : 0) + proxBoost * 20 + magnetPull * 25;

    ctx.save();
    var glowColor = magnetPull > 0.3 ? '155,89,182' : '255,215,0';
    ctx.shadowColor = 'rgba(' + glowColor + ',' + (0.6 + edgeWarn * 0.4 + proxBoost * 0.4 + magnetPull * 0.4).toFixed(2) + ')';
    ctx.shadowBlur = 15 + extraGlow;

    ctx.translate(this.x, this.y + bobY);
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
    gradient.addColorStop(0, '#FFFDF0');
    gradient.addColorStop(0.4, '#FFF8DC');
    gradient.addColorStop(1, '#FFD700');
    ctx.fillStyle = gradient;
    ctx.fill();
    // Center bright dot
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.18, 0, SB.TAU);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
    if (SB.highContrast) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    ctx.restore();

    // Proximity attract ring
    if (proxBoost0 > 0.3 && !SB.reducedMotion) {
        var prRing = (proxBoost0 - 0.3) / 0.7;
        var prRadius = this.radius * (1.8 + Math.sin(this.lifetime * 6) * 0.3);
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y + bobY, prRadius, 0, SB.TAU);
        ctx.strokeStyle = 'rgba(255,215,0,' + (prRing * 0.2).toFixed(2) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    var spkScale = 1 + (proxBoost0 > 0 ? proxBoost0 * 0.8 : 0);
    for (var j = 0; j < this.sparkles.length; j++) {
        var s = this.sparkles[j];
        var alpha = (Math.sin(s.phase) + 1) / 2 * 0.8;
        var sx = this.x + Math.cos(s.angle + s.phase * 0.3) * s.dist;
        var sy = this.y + bobY + Math.sin(s.angle + s.phase * 0.3) * s.dist;
        ctx.beginPath();
        ctx.arc(sx, sy, s.size * spkScale, 0, SB.TAU);
        ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
        ctx.fill();
    }
};

SB.Collectible.prototype._drawCoin = function(ctx) {
    var pulse = 1 + Math.sin(this.pulsePhase) * 0.1;
    var r = this.radius * pulse;
    // 3D coin spin effect via horizontal scale (faster near ball)
    var coinSpinSpeed = 3 + (this._proximity > 0 ? this._proximity * 4 : 0);
    var spin = Math.cos(this.lifetime * coinSpinSpeed);
    var scaleX = 0.4 + Math.abs(spin) * 0.6;

    var edgeWarn = this._edgeProximity();
    var magnetGlow = this._magnetPull || 0;
    ctx.save();
    ctx.shadowColor = magnetGlow > 0 ? 'rgba(155, 89, 182, ' + (0.5 + magnetGlow * 0.5).toFixed(2) + ')' : 'rgba(255, 180, 0, ' + (0.5 + edgeWarn * 0.5).toFixed(2) + ')';
    ctx.shadowBlur = 10 + edgeWarn * 12 + magnetGlow * 8;
    ctx.translate(this.x, this.y);
    ctx.scale(scaleX, 1);

    // Outer ring
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, SB.TAU);
    var grad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#FFE066');
    grad.addColorStop(0.7, '#FFB300');
    grad.addColorStop(1, '#CC8800');
    ctx.fillStyle = grad;
    ctx.fill();
    if (SB.highContrast) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Inner circle border
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, SB.TAU);
    ctx.strokeStyle = SB.highContrast ? 'rgba(255,255,255,0.5)' : 'rgba(204, 136, 0, 0.4)';
    ctx.lineWidth = SB.highContrast ? 1.5 : 1;
    ctx.stroke();

    // 3D edge highlight when coin is near edge-on
    if (scaleX < 0.55 && !SB.highContrast) {
        var edgeAlpha = (0.55 - scaleX) / 0.15 * 0.6;
        ctx.strokeStyle = 'rgba(255,240,180,' + Math.min(edgeAlpha, 0.6).toFixed(2) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(0, r);
        ctx.stroke();
        // Specular highlight dot at top edge
        ctx.beginPath();
        ctx.arc(0, -r * 0.6, 1.5, 0, SB.TAU);
        ctx.fillStyle = 'rgba(255,255,255,' + Math.min(edgeAlpha, 0.5).toFixed(2) + ')';
        ctx.fill();
    }

    // Dollar sign (only visible when not edge-on)
    if (scaleX > 0.5) {
        ctx.font = 'bold ' + Math.floor(r * 1.1) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(153, 102, 0, 0.7)';
        ctx.fillText('$', 0, 0.5);
    }

    ctx.restore();

    // Magnet pull sparkle trail
    if (magnetGlow > 0.3 && !SB.reducedMotion) {
        var mtCount = Math.floor(magnetGlow * 3);
        for (var mti = 0; mti < mtCount; mti++) {
            var mtAngle = this.lifetime * 5 + mti * 2.1;
            var mtDist = r * 1.5 + magnetGlow * 4;
            var mtx = this.x + Math.cos(mtAngle) * mtDist;
            var mty = this.y + Math.sin(mtAngle) * mtDist;
            ctx.beginPath();
            ctx.arc(mtx, mty, 1, 0, SB.TAU);
            ctx.fillStyle = 'rgba(155,89,182,' + (magnetGlow * 0.4).toFixed(2) + ')';
            ctx.fill();
        }
    }

    // Orbit sparkles
    for (var csi = 0; csi < this.sparkles.length; csi++) {
        var cs = this.sparkles[csi];
        var csA = (Math.sin(cs.phase) + 1) / 2 * 0.5;
        var csx = this.x + Math.cos(cs.angle + cs.phase * 0.3) * cs.dist;
        var csy = this.y + Math.sin(cs.angle + cs.phase * 0.3) * cs.dist;
        ctx.beginPath();
        ctx.arc(csx, csy, cs.size, 0, SB.TAU);
        ctx.fillStyle = 'rgba(255,200,50,' + csA.toFixed(2) + ')';
        ctx.fill();
    }

    // Value indicator for high-value coins
    if (this.coinValue >= 2 && scaleX > 0.4) {
        var cvAlpha = Math.min(scaleX, 0.8);
        ctx.save();
        ctx.font = 'bold ' + Math.floor(r * 0.7) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,240,150,' + cvAlpha.toFixed(2) + ')';
        ctx.fillText('x' + this.coinValue, this.x, this.y - r - 4);
        ctx.restore();
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

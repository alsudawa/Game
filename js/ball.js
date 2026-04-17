window.SB = window.SB || {};

SB.Ball = function() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.baseRadius = 14;
    this.radius = 14;
    // Ring buffer for trail (avoids shift/splice GC pressure)
    this.maxTrail = 14;
    this._trailBuf = new Array(this.maxTrail);
    for (var i = 0; i < this.maxTrail; i++) this._trailBuf[i] = { x: 0, y: 0 };
    this._trailHead = 0;
    this._trailLen = 0;
    this._activeTrailLen = 8;
    this.glowColor = '#FFD700';
    this.coreColor = '#FFFFFF';
    this.trailColor = 'rgba(255,215,0,';
    this.gravityMult = 1;
    this.blinking = false;
    this.wallHitSide = 0; // -1 left, 1 right, 0 none (consumed per frame)
    this.bounceGlow = 0; // brief glow pulse on bounce (decays per frame)
    this.wallSquash = 0; // brief horizontal squash on wall hit
    this.bounceSquash = 0; // brief vertical squash on bounce landing
    this.comboIntensity = 0; // 0-1 based on active combo count
    this.gravityPullAngle = 0;
    this.gravityPullStrength = 0;
    this.trailBoost = 0;
};

SB.Ball.prototype.reset = function(canvasWidth, canvasHeight) {
    this.x = canvasWidth / 2;
    this.y = canvasHeight * 0.4;
    this.vx = 0;
    this.vy = 0;
    this._trailHead = 0;
    this._trailLen = 0;
    this.radius = this.baseRadius;
    this.gravityMult = 1;
    this.blinking = false;
    this.bounceSquash = 0;
};

SB.Ball.prototype.bounce = function(tapX) {
    this.vy = SB.Physics.BOUNCE_IMPULSE;
    this.bounceGlow = 1.0;
    this.bounceSquash = 1.0;

    // Directional bounce based on tap position
    if (typeof tapX === 'number') {
        var screenCenter = SB.canvasWidth / 2;
        var offset = (tapX - screenCenter) / screenCenter; // -1 to 1
        this.vx += offset * SB.Physics.HORIZONTAL_KICK;
    }
};

SB.Ball.prototype.update = function(dt) {
    this.vy += SB.Physics.GRAVITY * this.gravityMult * dt * 60;
    this.vy = SB.clamp(this.vy, -SB.Physics.MAX_FALL_SPEED, SB.Physics.MAX_FALL_SPEED);

    this.vx *= SB.Physics.AIR_RESISTANCE;
    this.vx = SB.clamp(this.vx, -SB.Physics.MAX_FALL_SPEED, SB.Physics.MAX_FALL_SPEED);

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.bounceGlow > 0) this.bounceGlow = Math.max(0, this.bounceGlow - dt * 5);

    if (this.wallSquash > 0) this.wallSquash = Math.max(0, this.wallSquash - dt * 6);
    if (this.bounceSquash > 0) this.bounceSquash = Math.max(0, this.bounceSquash - dt * 8);
    if (this.trailBoost > 0) this.trailBoost = Math.max(0, this.trailBoost - dt * 1.5);

    this.wallHitSide = 0;
    if (this.x - this.radius < 0) {
        this.x = this.radius;
        this.vx *= -0.5;
        this.wallHitSide = -1;
        this.wallSquash = 1.0;
    } else if (this.x + this.radius > SB.canvasWidth) {
        this.x = SB.canvasWidth - this.radius;
        this.vx *= -0.5;
        this.wallHitSide = 1;
        this.wallSquash = 1.0;
    }

    if (this.y - this.radius < 0) {
        this.y = this.radius;
        this.vy = Math.abs(this.vy) * 0.3;
    }

    // Ring buffer push (no allocation, no shift)
    this._trailBuf[this._trailHead].x = this.x;
    this._trailBuf[this._trailHead].y = this.y;
    this._trailHead = (this._trailHead + 1) % this.maxTrail;
    if (this._trailLen < this.maxTrail) this._trailLen++;
};

SB.Ball.prototype.draw = function(ctx) {
    // Invincibility blink effect - skip rendering every other 100ms
    if (this.blinking && Math.floor((SB.frameTime || 0) / 100) % 2 === 0) {
        return;
    }

    // Draw trail from ring buffer (oldest to newest)
    // Trail intensifies when ball is falling fast or combo is active
    var speedFrac = Math.min(Math.abs(this.vy) / SB.Physics.MAX_FALL_SPEED, 1);
    var comboBoost = this.comboIntensity;
    var tb = this.trailBoost || 0;
    var trailAlphaMult = 1 + speedFrac * 1.5 + comboBoost * 1.0 + tb * 1.5;
    var trailSizeMult = 1 + speedFrac * 0.3 + comboBoost * 0.2 + tb * 0.3;
    var targetLen = Math.floor(8 + speedFrac * 4 + comboBoost * 2 + tb * 4);
    this._activeTrailLen = targetLen;
    var drawLen = Math.min(this._trailLen, this._activeTrailLen);
    var start = (this._trailHead - drawLen + this.maxTrail) % this.maxTrail;
    for (var i = 0; i < drawLen; i++) {
        var idx = (start + i) % this.maxTrail;
        var t = this._trailBuf[idx];
        var frac = i / drawLen;
        var alpha = Math.min(frac * 0.3 * trailAlphaMult, 0.6);
        var size = this.radius * (0.4 + 0.6 * frac) * trailSizeMult;
        ctx.beginPath();
        ctx.arc(t.x, t.y, size, 0, SB.TAU);
        ctx.fillStyle = this.trailColor + alpha.toFixed(2) + ')';
        ctx.fill();
    }

    // Afterimages when falling fast
    if (speedFrac > 0.6 && !SB.reducedMotion) {
        var aiCount = speedFrac > 0.85 ? 3 : 2;
        var aiAlphaBase = (speedFrac - 0.6) / 0.4 * 0.15;
        for (var ai = 1; ai <= aiCount; ai++) {
            var aiY = this.y - this.vy * 0.012 * ai;
            var aiAlpha = aiAlphaBase / ai;
            var aiSize = this.radius * (1 - ai * 0.08);
            ctx.beginPath();
            ctx.arc(this.x, aiY, aiSize, 0, SB.TAU);
            ctx.fillStyle = this.trailColor + aiAlpha.toFixed(3) + ')';
            ctx.fill();
        }
    }

    // Squash/stretch based on vertical velocity + wall impact
    var vyNorm = SB.clamp(this.vy / SB.Physics.MAX_FALL_SPEED, -1, 1);
    var stretchY = 1 + Math.abs(vyNorm) * 0.2;
    var stretchX = 1 / stretchY; // preserve volume
    if (this.wallSquash > 0) {
        stretchX *= (1 - this.wallSquash * 0.25);
        stretchY *= (1 + this.wallSquash * 0.15);
    }
    if (this.bounceSquash > 0) {
        stretchX *= (1 + this.bounceSquash * 0.2);
        stretchY *= (1 - this.bounceSquash * 0.15);
    }

    ctx.save();
    ctx.shadowColor = this.glowColor;
    ctx.shadowBlur = 20 + speedFrac * 15 + this.bounceGlow * 20 + comboBoost * 15;
    ctx.translate(this.x, this.y);
    // Gravity well pull distortion
    if (this.gravityPullStrength > 0) {
        ctx.rotate(this.gravityPullAngle);
        var gpStretch = 1 + this.gravityPullStrength * 0.25;
        ctx.scale(gpStretch, 1 / gpStretch);
        ctx.rotate(-this.gravityPullAngle);
    }
    ctx.scale(stretchX, stretchY);
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, SB.TAU);
    var gradient = ctx.createRadialGradient(
        -this.radius * 0.3, -this.radius * 0.3, this.radius * 0.1,
        0, 0, this.radius
    );
    gradient.addColorStop(0, this.coreColor);
    gradient.addColorStop(1, this.glowColor);
    ctx.fillStyle = gradient;
    ctx.fill();
    // High contrast: thick white outline for ball
    if (SB.highContrast) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    ctx.restore();

    // Drop shadow (scales with height: larger/darker near bottom)
    var heightFrac = SB.canvasHeight > 0 ? SB.clamp(this.y / SB.canvasHeight, 0, 1) : 0.5;
    var shadowScale = 0.4 + heightFrac * 0.6;
    var shadowAlpha = 0.05 + heightFrac * 0.15;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, ' + shadowAlpha.toFixed(2) + ')';
    ctx.translate(this.x, this.y + this.radius + 6 + (1 - heightFrac) * 4);
    ctx.scale(shadowScale, 0.35 * shadowScale);
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.7, 0, SB.TAU);
    ctx.fill();
    ctx.restore();
};

SB.Ball.prototype.getBounds = function() {
    return { x: this.x, y: this.y, radius: this.radius };
};

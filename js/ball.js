window.SB = window.SB || {};

SB.Ball = function() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.baseRadius = 14;
    this.radius = 14;
    this.trail = [];
    this.maxTrail = 8;
    this.glowColor = '#FFD700';
    this.coreColor = '#FFFFFF';
    this.trailColor = 'rgba(255,215,0,';
    this.gravityMult = 1;
    this.blinking = false;
};

SB.Ball.prototype.reset = function(canvasWidth, canvasHeight) {
    this.x = canvasWidth / 2;
    this.y = canvasHeight * 0.4;
    this.vx = 0;
    this.vy = 0;
    this.trail = [];
    this.radius = this.baseRadius;
    this.gravityMult = 1;
    this.blinking = false;
};

SB.Ball.prototype.bounce = function(tapX) {
    this.vy = SB.Physics.BOUNCE_IMPULSE;

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

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x - this.radius < 0) {
        this.x = this.radius;
        this.vx *= -0.5;
    } else if (this.x + this.radius > SB.canvasWidth) {
        this.x = SB.canvasWidth - this.radius;
        this.vx *= -0.5;
    }

    if (this.y - this.radius < 0) {
        this.y = this.radius;
        this.vy = Math.abs(this.vy) * 0.3;
    }

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrail) {
        this.trail.shift();
    }
};

SB.Ball.prototype.draw = function(ctx) {
    // Invincibility blink effect - skip rendering every other 100ms
    if (this.blinking && Math.floor(Date.now() / 100) % 2 === 0) {
        return;
    }

    for (var i = 0; i < this.trail.length; i++) {
        var t = this.trail[i];
        var alpha = (i / this.trail.length) * 0.3;
        var size = this.radius * (0.4 + 0.6 * (i / this.trail.length));
        ctx.beginPath();
        ctx.arc(t.x, t.y, size, 0, SB.TAU);
        ctx.fillStyle = this.trailColor + alpha + ')';
        ctx.fill();
    }

    ctx.save();
    ctx.shadowColor = this.glowColor;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, SB.TAU);
    var gradient = ctx.createRadialGradient(
        this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.1,
        this.x, this.y, this.radius
    );
    gradient.addColorStop(0, this.coreColor);
    gradient.addColorStop(1, this.glowColor);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y + this.radius + 8);
    ctx.scale(1, 3 / (this.radius * 0.7));
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.7, 0, SB.TAU);
    ctx.restore();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fill();
};

SB.Ball.prototype.getBounds = function() {
    return { x: this.x, y: this.y, radius: this.radius };
};

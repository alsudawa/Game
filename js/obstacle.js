window.SB = window.SB || {};

SB.OBSTACLE_TYPES = {
    PLATFORM: 'platform',
    SPIKE: 'spike',
    BLADE: 'blade',
    BOOMERANG: 'boomerang',
    LASER: 'laser',
    GRAVITY_WELL: 'gravity_well'
};

SB.Obstacle = function() {
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.speed = 0;
    this.active = false;
    this.type = SB.OBSTACLE_TYPES.PLATFORM;
    this.direction = 1;
    this.oscillateAmplitude = 0;
    this.oscillateSpeed = 0;
    this.oscillatePhase = 0;
    this.baseY = 0;
    this.rotation = 0;
    this.rotationSpeed = 0;
    this.radius = 0;
    this.originX = 0;
    this.travelDist = 0;
    this.traveled = 0;
    this.returning = false;
    this.laserPhase = 'warning';
    this.laserTimer = 0;
    this.lifetime = 0;
    this.maxLifetime = 0;
    this.pullRadius = 0;
    this.pullStrength = 0;
    this.wellPhase = 0;
};

SB.Obstacle.prototype.init = function(config) {
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.width = config.width || 80;
    this.height = config.height || 14;
    this.speed = config.speed || 2;
    this.direction = config.direction || 1;
    this.type = config.type || SB.OBSTACLE_TYPES.PLATFORM;
    this.active = true;
    this.oscillateAmplitude = config.oscillateAmplitude || 0;
    this.oscillateSpeed = config.oscillateSpeed || 0;
    this.oscillatePhase = Math.random() * SB.TAU;
    this.baseY = this.y;
    this.rotation = 0;
    this.rotationSpeed = config.rotationSpeed || 3;
    this.radius = config.radius || 18;
    this.originX = this.x;
    this.travelDist = config.travelDist || 300;
    this.traveled = 0;
    this.returning = false;
    this.laserPhase = 'warning';
    this.laserTimer = 0;
    this.lifetime = 0;
    this.maxLifetime = config.maxLifetime || 0;
    this.pullRadius = config.pullRadius || 80;
    this.pullStrength = config.pullStrength || 200;
    this.wellPhase = 0;
};

SB.Obstacle.prototype.update = function(dt) {
    if (!this.active) return;

    if (this.maxLifetime > 0) {
        this.lifetime += dt;
        if (this.lifetime >= this.maxLifetime) {
            this.active = false;
            return;
        }
    }

    if (this.type === SB.OBSTACLE_TYPES.PLATFORM) {
        this.x += this.speed * this.direction * dt * 60;
        if (this.oscillateAmplitude > 0) {
            this.oscillatePhase += this.oscillateSpeed * dt;
            this.y = this.baseY + Math.sin(this.oscillatePhase) * this.oscillateAmplitude;
        }
    } else if (this.type === SB.OBSTACLE_TYPES.SPIKE) {
        this.x += this.speed * this.direction * dt * 60;
    } else if (this.type === SB.OBSTACLE_TYPES.BLADE) {
        this.x += this.speed * this.direction * dt * 60;
        this.rotation += this.rotationSpeed * dt;
    } else if (this.type === SB.OBSTACLE_TYPES.BOOMERANG) {
        var moveAmt = this.speed * this.direction * dt * 60;
        this.x += moveAmt;
        this.traveled += Math.abs(moveAmt);
        this.rotation += 5 * dt;
        if (!this.returning && this.traveled >= this.travelDist) {
            this.returning = true;
            this.direction *= -1;
        }
    } else if (this.type === SB.OBSTACLE_TYPES.GRAVITY_WELL) {
        this.wellPhase += dt * 2;
        this.lifetime += dt;
    } else if (this.type === SB.OBSTACLE_TYPES.LASER) {
        this.laserTimer += dt;
        if (this.laserPhase === 'warning' && this.laserTimer >= 0.8) {
            this.laserPhase = 'charge';
            this.laserTimer = 0;
        } else if (this.laserPhase === 'charge' && this.laserTimer >= 0.3) {
            this.laserPhase = 'active';
            this.laserTimer = 0;
        } else if (this.laserPhase === 'active' && this.laserTimer >= 0.5) {
            this.laserPhase = 'fade';
            this.laserTimer = 0;
        } else if (this.laserPhase === 'fade' && this.laserTimer >= 0.3) {
            this.active = false;
        }
    }
};

SB.Obstacle.prototype.draw = function(ctx) {
    if (!this.active) return;

    if (this.type === SB.OBSTACLE_TYPES.PLATFORM) {
        this._drawPlatform(ctx);
    } else if (this.type === SB.OBSTACLE_TYPES.SPIKE) {
        this._drawSpike(ctx);
    } else if (this.type === SB.OBSTACLE_TYPES.BLADE) {
        this._drawBlade(ctx);
    } else if (this.type === SB.OBSTACLE_TYPES.BOOMERANG) {
        this._drawBoomerang(ctx);
    } else if (this.type === SB.OBSTACLE_TYPES.LASER) {
        this._drawLaser(ctx);
    } else if (this.type === SB.OBSTACLE_TYPES.GRAVITY_WELL) {
        this._drawGravityWell(ctx);
    }
};

SB.Obstacle.prototype._drawPlatform = function(ctx) {
    var r = 7;
    ctx.save();
    ctx.shadowColor = 'rgba(231, 76, 60, 0.4)';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(this.x + r, this.y);
    ctx.lineTo(this.x + this.width - r, this.y);
    ctx.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + r);
    ctx.lineTo(this.x + this.width, this.y + this.height - r);
    ctx.quadraticCurveTo(this.x + this.width, this.y + this.height, this.x + this.width - r, this.y + this.height);
    ctx.lineTo(this.x + r, this.y + this.height);
    ctx.quadraticCurveTo(this.x, this.y + this.height, this.x, this.y + this.height - r);
    ctx.lineTo(this.x, this.y + r);
    ctx.quadraticCurveTo(this.x, this.y, this.x + r, this.y);
    ctx.closePath();

    if (SB.highContrast) {
        ctx.fillStyle = '#FF0000';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
    } else {
        var gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient.addColorStop(0, '#e74c3c');
        gradient.addColorStop(1, '#c0392b');
        ctx.fillStyle = gradient;
        ctx.fill();
    }
    ctx.restore();
};

SB.Obstacle.prototype._drawSpike = function(ctx) {
    var size = this.width;
    var cx = this.x + size / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(255, 100, 50, 0.5)';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(cx, this.y);
    ctx.lineTo(this.x + size, this.y + size);
    ctx.lineTo(this.x, this.y + size);
    ctx.closePath();

    if (SB.highContrast) {
        ctx.fillStyle = '#FF4400';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
    } else {
        var gradient = ctx.createLinearGradient(cx, this.y, cx, this.y + size);
        gradient.addColorStop(0, '#ff6347');
        gradient.addColorStop(1, '#e74c3c');
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
    ctx.restore();
};

SB.Obstacle.prototype._drawBlade = function(ctx) {
    var cx = this.x + this.radius;
    var cy = this.y + this.radius;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotation);
    ctx.shadowColor = 'rgba(150, 150, 150, 0.5)';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, SB.TAU);
    if (SB.highContrast) {
        ctx.fillStyle = '#CCCCCC';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.stroke();
    } else {
        var gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, this.radius);
        gradient.addColorStop(0, '#bdc3c7');
        gradient.addColorStop(1, '#7f8c8d');
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    ctx.strokeStyle = SB.highContrast ? '#FFFFFF' : '#95a5a6';
    ctx.lineWidth = 2;
    for (var i = 0; i < 6; i++) {
        var angle = (SB.TAU / 6) * i;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius);
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, SB.TAU);
    ctx.fillStyle = SB.highContrast ? '#FF0000' : '#2c3e50';
    ctx.fill();

    ctx.restore();
};

SB.Obstacle.prototype._drawBoomerang = function(ctx) {
    var cx = this.x + this.radius;
    var cy = this.y + this.radius;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotation);
    ctx.shadowColor = 'rgba(255, 152, 0, 0.5)';
    ctx.shadowBlur = 10;

    // Boomerang shape: curved V
    ctx.beginPath();
    ctx.moveTo(-this.radius, -2);
    ctx.quadraticCurveTo(0, -this.radius * 0.8, this.radius, -2);
    ctx.quadraticCurveTo(this.radius * 0.6, 2, 0, 4);
    ctx.quadraticCurveTo(-this.radius * 0.6, 2, -this.radius, -2);
    ctx.closePath();

    var grad = ctx.createLinearGradient(-this.radius, 0, this.radius, 0);
    grad.addColorStop(0, '#FF9800');
    grad.addColorStop(0.5, '#FFC107');
    grad.addColorStop(1, '#FF9800');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#E65100';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
};

SB.Obstacle.prototype._drawLaser = function(ctx) {
    var cw = SB.canvasWidth;

    if (this.laserPhase === 'warning') {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 50, 50, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(0, this.y);
        ctx.lineTo(cw, this.y);
        ctx.stroke();
        ctx.setLineDash([]);
        // Small warning indicators on edges
        ctx.fillStyle = 'rgba(255, 50, 50, 0.5)';
        ctx.beginPath();
        ctx.arc(8, this.y, 4, 0, SB.TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cw - 8, this.y, 4, 0, SB.TAU);
        ctx.fill();
        ctx.restore();
    } else if (this.laserPhase === 'charge') {
        var pulse = 0.5 + Math.sin(this.laserTimer * 25) * 0.3;
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 50, 50, ' + pulse + ')';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, this.y);
        ctx.lineTo(cw, this.y);
        ctx.stroke();
        ctx.restore();
    } else if (this.laserPhase === 'active') {
        var beamH = 18;
        ctx.save();
        ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
        ctx.shadowBlur = 20;
        var grad = ctx.createLinearGradient(0, this.y - beamH / 2, 0, this.y + beamH / 2);
        grad.addColorStop(0, 'rgba(255, 100, 100, 0.2)');
        grad.addColorStop(0.3, 'rgba(255, 50, 50, 0.9)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.7, 'rgba(255, 50, 50, 0.9)');
        grad.addColorStop(1, 'rgba(255, 100, 100, 0.2)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, this.y - beamH / 2, cw, beamH);
        ctx.restore();
    } else if (this.laserPhase === 'fade') {
        var a = 1 - this.laserTimer / 0.3;
        var bh = 18 * a;
        ctx.save();
        ctx.fillStyle = 'rgba(255, 50, 50, ' + (a * 0.4).toFixed(2) + ')';
        ctx.fillRect(0, this.y - bh / 2, cw, bh);
        ctx.restore();
    }
};

SB.Obstacle.prototype._drawGravityWell = function(ctx) {
    var cx = this.x + this.radius;
    var cy = this.y + this.radius;
    var pulse = 0.6 + Math.sin(this.wellPhase) * 0.2;

    // Entry fade-in (0.5s) and exit fade-out (last 0.5s of lifetime)
    var fadeIn = Math.min(this.lifetime / 0.5, 1);
    var fadeOut = this.maxLifetime > 0 ? Math.min((this.maxLifetime - this.lifetime) / 0.5, 1) : 1;
    var wellAlpha = fadeIn * Math.max(0, fadeOut);
    if (wellAlpha <= 0) return;

    // Pull field rings (expanding outward)
    ctx.save();
    ctx.globalAlpha = wellAlpha;
    for (var ring = 2; ring >= 0; ring--) {
        var ringPhase = (this.wellPhase * 0.5 + ring * 0.8) % 2;
        var ringR = this.radius + ringPhase * (this.pullRadius - this.radius);
        var ringAlpha = (1 - ringPhase / 2) * 0.12;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, SB.TAU);
        ctx.strokeStyle = 'rgba(155,89,182,' + ringAlpha.toFixed(3) + ')';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    // Core
    ctx.beginPath();
    ctx.arc(cx, cy, this.radius * pulse, 0, SB.TAU);
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.radius * pulse);
    grad.addColorStop(0, 'rgba(142,68,173,0.8)');
    grad.addColorStop(0.6, 'rgba(155,89,182,0.4)');
    grad.addColorStop(1, 'rgba(155,89,182,0)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Inner dot
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, SB.TAU);
    ctx.fillStyle = 'rgba(200,150,255,0.9)';
    ctx.fill();
    ctx.restore();
};

SB.Obstacle.prototype.isOffScreen = function(canvasWidth, canvasHeight) {
    if (this.type === SB.OBSTACLE_TYPES.LASER) return false;
    if (this.type === SB.OBSTACLE_TYPES.GRAVITY_WELL) return false; // uses maxLifetime
    if (this.type === SB.OBSTACLE_TYPES.BLADE) {
        return this.x + this.radius * 2 < -50 || this.x > canvasWidth + 50 ||
               this.y + this.radius * 2 < -50 || this.y > canvasHeight + 50;
    }
    return this.x + this.width < -50 || this.x > canvasWidth + 50 ||
           this.y + this.height < -50 || this.y > canvasHeight + 50;
};

SB.Obstacle.prototype.getBounds = function() {
    if (this.type === SB.OBSTACLE_TYPES.GRAVITY_WELL) {
        return null; // Doesn't kill directly, affects ball physics
    }
    if (this.type === SB.OBSTACLE_TYPES.LASER) {
        if (this.laserPhase === 'active') {
            return { x: 0, y: this.y - 9, width: SB.canvasWidth, height: 18 };
        }
        return null;
    }
    if (this.type === SB.OBSTACLE_TYPES.BOOMERANG) {
        return { x: this.x + this.radius, y: this.y + this.radius, radius: this.radius * 0.8 };
    }
    if (this.type === SB.OBSTACLE_TYPES.BLADE) {
        return { x: this.x + this.radius, y: this.y + this.radius, radius: this.radius };
    }
    if (this.type === SB.OBSTACLE_TYPES.SPIKE) {
        return {
            x: this.x + this.width * 0.15,
            y: this.y + this.height * 0.3,
            width: this.width * 0.7,
            height: this.height * 0.7
        };
    }
    return { x: this.x, y: this.y, width: this.width, height: this.height };
};

// Object Pool
SB.ObstaclePool = function(size) {
    this.pool = [];
    this._activeBuffer = [];
    for (var i = 0; i < size; i++) {
        this.pool.push(new SB.Obstacle());
    }
};

SB.ObstaclePool.prototype.acquire = function(config) {
    for (var i = 0; i < this.pool.length; i++) {
        if (!this.pool[i].active) {
            this.pool[i].init(config);
            return this.pool[i];
        }
    }
    // Pool exhausted — expand dynamically
    var obs = new SB.Obstacle();
    obs.init(config);
    this.pool.push(obs);
    return obs;
};

SB.ObstaclePool.prototype.releaseAll = function() {
    for (var i = 0; i < this.pool.length; i++) {
        this.pool[i].active = false;
    }
};

SB.ObstaclePool.prototype.getActive = function() {
    this._activeBuffer.length = 0;
    for (var i = 0; i < this.pool.length; i++) {
        if (this.pool[i].active) {
            this._activeBuffer.push(this.pool[i]);
        }
    }
    return this._activeBuffer;
};

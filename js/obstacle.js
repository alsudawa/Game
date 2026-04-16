window.SB = window.SB || {};

SB.OBSTACLE_TYPES = {
    PLATFORM: 'platform',
    SPIKE: 'spike',
    BLADE: 'blade',
    BOOMERANG: 'boomerang'
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
};

SB.Obstacle.prototype.update = function(dt) {
    if (!this.active) return;

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

    var gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
    gradient.addColorStop(0, '#e74c3c');
    gradient.addColorStop(1, '#c0392b');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
};

SB.Obstacle.prototype._drawSpike = function(ctx) {
    var size = this.width;
    var cx = this.x + size / 2;
    var cy = this.y + size / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(255, 100, 50, 0.5)';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(cx, this.y);
    ctx.lineTo(this.x + size, this.y + size);
    ctx.lineTo(this.x, this.y + size);
    ctx.closePath();

    var gradient = ctx.createLinearGradient(cx, this.y, cx, this.y + size);
    gradient.addColorStop(0, '#ff6347');
    gradient.addColorStop(1, '#e74c3c');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
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
    var gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, this.radius);
    gradient.addColorStop(0, '#bdc3c7');
    gradient.addColorStop(1, '#7f8c8d');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = '#95a5a6';
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
    ctx.fillStyle = '#2c3e50';
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

SB.Obstacle.prototype.isOffScreen = function(canvasWidth, canvasHeight) {
    if (this.type === SB.OBSTACLE_TYPES.BLADE) {
        return this.x + this.radius * 2 < -50 || this.x > canvasWidth + 50 ||
               this.y + this.radius * 2 < -50 || this.y > canvasHeight + 50;
    }
    return this.x + this.width < -50 || this.x > canvasWidth + 50 ||
           this.y + this.height < -50 || this.y > canvasHeight + 50;
};

SB.Obstacle.prototype.getBounds = function() {
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

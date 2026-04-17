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
    this.spawnAge = 0;
    this.dangerGlow = 0;
    this.returnFlash = 0;
    this.fadeOut = 0;
};

SB.Obstacle.prototype.init = function(config) {
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.width = config.width || 80;
    this.height = config.height || (14 + Math.min(Math.max(this.width - 80, 0) / 80, 1) * 3);
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
    this.spawnAge = 0;
    this.returnFlash = 0;
    this.fadeOut = 0;
};

SB.Obstacle.prototype.update = function(dt) {
    if (!this.active) return;

    if (this.fadeOut > 0) {
        this.fadeOut -= dt * 3;
        if (this.fadeOut <= 0) { this.active = false; return; }
    }

    this.spawnAge += dt;

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
            this.returnFlash = 0.3;
        }
        if (this.returnFlash > 0) this.returnFlash -= dt;
    } else if (this.type === SB.OBSTACLE_TYPES.GRAVITY_WELL) {
        this.wellPhase += dt * 2;
        this.lifetime += dt;
    } else if (this.type === SB.OBSTACLE_TYPES.LASER) {
        this.laserTimer += dt;
        if (this.laserPhase === 'warning' && this.laserTimer >= 0.8) {
            this.laserPhase = 'charge';
            this.laserTimer = 0;
            if (SB.audio) SB.audio.playLaserCharge();
        } else if (this.laserPhase === 'charge' && this.laserTimer >= 0.3) {
            this.laserPhase = 'active';
            this.laserTimer = 0;
            if (SB.audio) SB.audio.playLaserFire();
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

    var fadeSpeed = this.type === SB.OBSTACLE_TYPES.LASER ? 0.5 : (this.type === SB.OBSTACLE_TYPES.SPIKE ? 0.2 : 0.3);
    var fadeIn = Math.min(this.spawnAge / fadeSpeed, 1);
    var foAlpha = this.fadeOut > 0 ? this.fadeOut : 1;
    if (fadeIn < 1 || foAlpha < 1) {
        ctx.save();
        ctx.globalAlpha = Math.min(fadeIn, foAlpha);
        if (fadeIn < 1) {
            var swoosh = (1 - fadeIn) * (1 - fadeIn) * 20;
            ctx.translate(0, -swoosh);
            var fiEased = fadeIn < 0.7 ? fadeIn / 0.7 * 1.1 : 1.1 - (fadeIn - 0.7) / 0.3 * 0.1;
            var fiScale = 0.6 + fiEased * 0.4;
            var fiCx = this.radius ? this.x + this.radius : this.x + (this.width || 0) / 2;
            var fiCy = this.radius ? this.y + this.radius : this.y + (this.height || 0) / 2;
            ctx.translate(fiCx * (1 - fiScale), fiCy * (1 - fiScale));
            ctx.scale(fiScale, fiScale);
        }
        if (foAlpha < 1) {
            var foScale = 0.8 + foAlpha * 0.2;
            var foCx = this.radius ? this.x + this.radius : this.x + (this.width || 0) / 2;
            var foCy = this.radius ? this.y + this.radius : this.y + (this.height || 0) / 2;
            ctx.translate(foCx * (1 - foScale), foCy * (1 - foScale));
            ctx.scale(foScale, foScale);
        }
    }

    // Danger proximity glow
    if (this.dangerGlow > 0) {
        var dgPulse = 0.5 + Math.sin((SB.frameTime || 0) * 0.012) * 0.3;
        var dgAlpha = this.dangerGlow * dgPulse * 0.4;
        var dgCx, dgCy, dgR;
        if (this.radius && (this.type === SB.OBSTACLE_TYPES.BLADE || this.type === SB.OBSTACLE_TYPES.BOOMERANG)) {
            dgCx = this.x + this.radius;
            dgCy = this.y + this.radius;
            dgR = this.radius + 12;
        } else {
            dgCx = this.x + (this.width || 0) / 2;
            dgCy = this.y + (this.height || 0) / 2;
            dgR = Math.max(this.width || 0, this.height || 0) / 2 + 12;
        }
        ctx.save();
        var dgGrad = ctx.createRadialGradient(dgCx, dgCy, dgR * 0.5, dgCx, dgCy, dgR);
        dgGrad.addColorStop(0, 'rgba(255,50,50,' + dgAlpha.toFixed(3) + ')');
        dgGrad.addColorStop(1, 'rgba(255,50,50,0)');
        ctx.fillStyle = dgGrad;
        ctx.beginPath();
        ctx.arc(dgCx, dgCy, dgR, 0, SB.TAU);
        ctx.fill();
        ctx.restore();
    }

    // Drop shadow (skip for laser and gravity well; deeper for faster objects)
    if (this.type !== SB.OBSTACLE_TYPES.LASER && this.type !== SB.OBSTACLE_TYPES.GRAVITY_WELL) {
        var dsSpd = Math.abs(this.speed || this.speedX || 0);
        var dsAlpha = 0.1 + Math.min(dsSpd / 8, 0.08);
        var dsOff = 8 + Math.min(dsSpd / 4, 4);
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,' + dsAlpha.toFixed(2) + ')';
        if (this.radius && (this.type === SB.OBSTACLE_TYPES.BLADE || this.type === SB.OBSTACLE_TYPES.BOOMERANG)) {
            ctx.beginPath();
            ctx.ellipse(this.x + this.radius, this.y + this.radius + dsOff, this.radius * 0.7, this.radius * 0.25, 0, 0, SB.TAU);
            ctx.fill();
        } else {
            ctx.fillRect(this.x + 3, this.y + this.height + 2, this.width - 6, 2 + dsOff * 0.3);
        }
        ctx.restore();
    }

    // Speed-based horizontal stretch for fast-moving platforms/spikes
    var speedStretch = 0;
    if ((this.type === SB.OBSTACLE_TYPES.PLATFORM || this.type === SB.OBSTACLE_TYPES.SPIKE) && Math.abs(this.speed) > 3 && !SB.reducedMotion) {
        speedStretch = Math.min((Math.abs(this.speed) - 3) / 5, 1) * 0.04;
        var stCx = this.x + (this.width || 0) / 2;
        var stCy = this.y + (this.height || 0) / 2;
        ctx.save();
        ctx.translate(stCx, stCy);
        ctx.scale(1 + speedStretch, 1 - speedStretch * 0.3);
        ctx.translate(-stCx, -stCy);
    }

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

    if (speedStretch > 0) ctx.restore();

    if (fadeIn < 1 || foAlpha < 1) {
        ctx.restore();
    }
};

SB.Obstacle.prototype._drawPlatform = function(ctx) {
    var r = 7;
    var edgeDist = Math.min(this.x, SB.canvasWidth - this.x - this.width);
    var edgeGlow = edgeDist < 30 ? (1 - edgeDist / 30) * 0.4 : 0;
    ctx.save();
    ctx.shadowColor = edgeGlow > 0 ? 'rgba(255, 100, 80, ' + (0.4 + edgeGlow).toFixed(2) + ')' : 'rgba(231, 76, 60, 0.4)';
    ctx.shadowBlur = 8 + edgeGlow * 12;

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
        // Top edge highlight (3D bevel effect)
        ctx.beginPath();
        ctx.moveTo(this.x + r, this.y + 1);
        ctx.lineTo(this.x + this.width - r, this.y + 1);
        ctx.strokeStyle = 'rgba(255,180,170,0.45)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Bottom edge shadow
        ctx.beginPath();
        ctx.moveTo(this.x + r, this.y + this.height - 1);
        ctx.lineTo(this.x + this.width - r, this.y + this.height - 1);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    // Corner accent marks
    if (!SB.highContrast) {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        var cm = 4;
        ctx.beginPath();
        ctx.moveTo(this.x + cm, this.y + 2); ctx.lineTo(this.x + 2, this.y + 2); ctx.lineTo(this.x + 2, this.y + cm);
        ctx.moveTo(this.x + this.width - cm, this.y + 2); ctx.lineTo(this.x + this.width - 2, this.y + 2); ctx.lineTo(this.x + this.width - 2, this.y + cm);
        ctx.stroke();
    }
    // Surface dot pattern
    if (!SB.highContrast && !SB.reducedMotion) {
        var dotCount = Math.floor(this.width / 18);
        var dotGap = this.width / (dotCount + 1);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        for (var di = 1; di <= dotCount; di++) {
            ctx.beginPath();
            ctx.arc(this.x + di * dotGap, this.y + this.height / 2, 1.2, 0, SB.TAU);
            ctx.fill();
        }
    }
    // Direction arrow indicator
    if (Math.abs(this.speed) > 0.5 && !SB.reducedMotion) {
        var arDir = this.speed * this.direction > 0 ? 1 : -1;
        var arX = arDir > 0 ? this.x + this.width - 12 : this.x + 12;
        var arY = this.y + this.height / 2;
        var arAlpha = Math.min(Math.abs(this.speed) / 4, 0.5);
        ctx.fillStyle = 'rgba(255,255,255,' + arAlpha.toFixed(2) + ')';
        ctx.beginPath();
        ctx.moveTo(arX + arDir * 5, arY);
        ctx.lineTo(arX - arDir * 3, arY - 3);
        ctx.lineTo(arX - arDir * 3, arY + 3);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
};

SB.Obstacle.prototype._drawSpike = function(ctx) {
    var size = this.width;
    var cx = this.x + size / 2;
    var spikePulse = Math.sin(this.spawnAge * 4) * 3;

    // Oscillation ghost trail
    if (this.oscillateAmplitude > 10 && !SB.reducedMotion) {
        var ghostY = this.baseY + Math.sin(this.oscillatePhase - 0.5) * this.oscillateAmplitude;
        ctx.save();
        ctx.globalAlpha = 0.08;
        ctx.beginPath();
        ctx.moveTo(cx, ghostY);
        ctx.lineTo(this.x + size, ghostY + size);
        ctx.lineTo(this.x, ghostY + size);
        ctx.closePath();
        ctx.fillStyle = '#ff6347';
        ctx.fill();
        ctx.restore();
    }

    ctx.save();
    // Oscillating spikes wobble slightly
    if (this.oscillateAmplitude > 0 && !SB.reducedMotion) {
        var wobble = Math.sin(this.oscillatePhase * 2) * 0.06;
        ctx.translate(cx, this.y + size / 2);
        ctx.rotate(wobble);
        ctx.translate(-cx, -(this.y + size / 2));
    }
    ctx.shadowColor = 'rgba(255, 100, 50, 0.5)';
    ctx.shadowBlur = 10 + spikePulse;

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
        // Bright tip point (larger/brighter at higher speed = harder difficulty)
        var tipSpd = Math.abs(this.speed || 0);
        var tipScale = 1 + Math.min(tipSpd / 6, 0.8);
        var tipPulse = (Math.sin(this.spawnAge * 6) + 1) / 2;
        ctx.beginPath();
        ctx.arc(cx, this.y + 1, 2 * tipScale, 0, SB.TAU);
        ctx.fillStyle = 'rgba(255,200,150,' + (0.4 + tipPulse * 0.4 + tipScale * 0.1).toFixed(2) + ')';
        ctx.fill();
        // Tip glint flash at oscillation extremes
        if (this.oscillateAmplitude > 10) {
            var oscSin = Math.sin(this.oscillatePhase);
            if (Math.abs(oscSin) > 0.92) {
                var glintA = (Math.abs(oscSin) - 0.92) / 0.08;
                ctx.beginPath();
                ctx.arc(cx, this.y, 3, 0, SB.TAU);
                ctx.fillStyle = 'rgba(255,255,255,' + (glintA * 0.7).toFixed(2) + ')';
                ctx.fill();
            }
        }
        // Base glow (stronger for oscillating spikes)
        var oscBoost = this.oscillateAmplitude > 0 ? Math.min(this.oscillateAmplitude / 40, 0.5) : 0;
        var basePulse = (Math.sin(this.spawnAge * 3) + 1) / 2 * (0.15 + oscBoost);
        var baseGrad = ctx.createRadialGradient(cx, this.y + size, 0, cx, this.y + size, size * 0.6);
        baseGrad.addColorStop(0, 'rgba(255,80,50,' + basePulse.toFixed(3) + ')');
        baseGrad.addColorStop(1, 'rgba(255,80,50,0)');
        ctx.fillStyle = baseGrad;
        ctx.fillRect(cx - size * 0.6, this.y + size * 0.4, size * 1.2, size * 0.6);
    }
    ctx.restore();
};

SB.Obstacle.prototype._drawBlade = function(ctx) {
    var cx = this.x + this.radius;
    var cy = this.y + this.radius;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotation);
    var bladeGlowInt = Math.min(Math.abs(this.rotationSpeed || 5) / 8, 1);
    ctx.shadowColor = 'rgba(150, 150, 150, ' + (0.4 + bladeGlowInt * 0.4).toFixed(2) + ')';
    ctx.shadowBlur = 6 + bladeGlowInt * 10;

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
        // Outer edge highlight
        ctx.beginPath();
        ctx.arc(0, 0, this.radius - 1, 0, SB.TAU);
        ctx.strokeStyle = 'rgba(220,220,230,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    ctx.lineWidth = 2;
    for (var i = 0; i < 6; i++) {
        var angle = (SB.TAU / 6) * i;
        ctx.strokeStyle = SB.highContrast ? '#FFFFFF' : (i % 2 === 0 ? '#95a5a6' : '#b0b8b8');
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius);
        ctx.stroke();
    }

    // Center hex nut
    ctx.beginPath();
    for (var hi = 0; hi < 6; hi++) {
        var hAngle = SB.TAU / 6 * hi;
        var hx = Math.cos(hAngle) * 4;
        var hy = Math.sin(hAngle) * 4;
        if (hi === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fillStyle = SB.highContrast ? '#FF0000' : '#2c3e50';
    ctx.fill();
    if (!SB.highContrast) {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    }

    // Spin motion blur arcs + sparks (wider arcs at higher speed)
    if (!SB.reducedMotion) {
        var bladeSpd = Math.abs(this.speedX || 0) + Math.abs(this.speedY || 0);
        var arcLen = 0.5 + Math.min(bladeSpd / 200, 0.6);
        var arcAlpha = 0.08 + Math.min(bladeSpd / 300, 0.08);
        for (var si = 0; si < 3; si++) {
            var sAngle = (SB.TAU / 3) * si;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 2, sAngle, sAngle + arcLen);
            ctx.strokeStyle = 'rgba(180,180,190,' + arcAlpha.toFixed(2) + ')';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        var sparkPhase = this.spawnAge * 8;
        if (Math.sin(sparkPhase) > 0.9) {
            var spkAngle = this.rotation + sparkPhase;
            var spkX = Math.cos(spkAngle) * (this.radius + 1);
            var spkY = Math.sin(spkAngle) * (this.radius + 1);
            ctx.beginPath();
            ctx.arc(spkX, spkY, 1.5, 0, SB.TAU);
            ctx.fillStyle = 'rgba(255,220,150,0.6)';
            ctx.fill();
        }
    }

    ctx.restore();
};

SB.Obstacle.prototype._drawBoomerang = function(ctx) {
    var cx = this.x + this.radius;
    var cy = this.y + this.radius;

    // Drop shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + this.radius + 4, this.radius * 0.6, 2, 0, 0, SB.TAU);
    ctx.fill();
    ctx.restore();

    var bmRet = this.returning ? 1 : 0;
    if (!SB.reducedMotion) {
        var tDir = this.direction;
        var trR = bmRet ? '255,80,60' : '255,152,0';
        for (var ti = 1; ti <= 4; ti++) {
            var tAlpha = (1 - ti / 5) * 0.12;
            var tx = cx - tDir * this.speed * 0.3 * ti;
            var tyCurve = cy + Math.sin(ti * 0.8 + this.rotation) * 3;
            ctx.beginPath();
            ctx.arc(tx, tyCurve, 2 - ti * 0.3, 0, SB.TAU);
            ctx.fillStyle = 'rgba(' + trR + ',' + tAlpha.toFixed(2) + ')';
            ctx.fill();
        }
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotation);
    ctx.shadowColor = bmRet ? 'rgba(255, 80, 60, 0.5)' : 'rgba(255, 152, 0, 0.5)';
    ctx.shadowBlur = 10;

    // Boomerang shape: curved V
    ctx.beginPath();
    ctx.moveTo(-this.radius, -2);
    ctx.quadraticCurveTo(0, -this.radius * 0.8, this.radius, -2);
    ctx.quadraticCurveTo(this.radius * 0.6, 2, 0, 4);
    ctx.quadraticCurveTo(-this.radius * 0.6, 2, -this.radius, -2);
    ctx.closePath();

    if (SB.highContrast) {
        ctx.fillStyle = '#FF8800';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
    } else {
        var grad = ctx.createLinearGradient(-this.radius, 0, this.radius, 0);
        grad.addColorStop(0, '#FF9800');
        grad.addColorStop(0.5, '#FFC107');
        grad.addColorStop(1, '#FF9800');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#E65100';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Spin blur lines (scale with speed)
    if (Math.abs(this.speed) > 1.5 && !SB.reducedMotion) {
        var sbFrac = Math.min((Math.abs(this.speed) - 1.5) / 3, 1);
        var sbCount = 2 + Math.floor(sbFrac * 2);
        var sbAlpha = sbFrac * 0.25;
        ctx.strokeStyle = 'rgba(255,200,100,' + sbAlpha.toFixed(2) + ')';
        ctx.lineWidth = 1;
        for (var sbi = 0; sbi < sbCount; sbi++) {
            var sbAngle = SB.TAU / sbCount * sbi;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.6, sbAngle, sbAngle + 0.4 + sbFrac * 0.5);
            ctx.stroke();
        }
    }

    // Return "!" indicator when returning
    if (this.returning && !SB.reducedMotion) {
        var retBlink = (Math.sin((SB.frameTime || 0) * 0.012) + 1) / 2;
        ctx.save();
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = 'rgba(255,100,50,' + (0.4 + retBlink * 0.4).toFixed(2) + ')';
        ctx.fillText('!', cx, cy - this.radius - 4);
        ctx.restore();
    }

    // Return flash warning (double ring + glow)
    if (this.returnFlash > 0) {
        var rfFrac = this.returnFlash / 0.3;
        var rfAlpha = rfFrac * 0.5;
        var rfR = this.radius + 8 + (1 - rfFrac) * 12;
        ctx.save();
        ctx.shadowColor = 'rgba(255,152,0,0.4)';
        ctx.shadowBlur = rfFrac * 10;
        ctx.beginPath();
        ctx.arc(cx, cy, rfR, 0, SB.TAU);
        ctx.strokeStyle = 'rgba(255,152,0,' + rfAlpha.toFixed(2) + ')';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, rfR + 6, 0, SB.TAU);
        ctx.strokeStyle = 'rgba(255,152,0,' + (rfAlpha * 0.4).toFixed(2) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    ctx.restore();
};

SB.Obstacle.prototype._drawLaser = function(ctx) {
    var cw = SB.canvasWidth;

    var hc = SB.highContrast;
    if (this.laserPhase === 'warning') {
        var warnPulse = 0.25 + Math.sin(this.laserTimer * 8) * 0.15;
        ctx.save();
        ctx.strokeStyle = hc ? 'rgba(255, 255, 0, 0.6)' : 'rgba(255, 50, 50, ' + warnPulse.toFixed(2) + ')';
        ctx.lineWidth = hc ? 2 : 1;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(0, this.y);
        ctx.lineTo(cw, this.y);
        ctx.stroke();
        ctx.setLineDash([]);
        // Pulsing warning indicators on edges
        var dotR = 3 + Math.sin(this.laserTimer * 10) * 1.5;
        ctx.fillStyle = hc ? 'rgba(255, 255, 0, 0.8)' : 'rgba(255, 50, 50, ' + (warnPulse + 0.2).toFixed(2) + ')';
        ctx.shadowColor = 'rgba(255, 50, 50, 0.5)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(8, this.y, dotR, 0, SB.TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cw - 8, this.y, dotR, 0, SB.TAU);
        ctx.fill();
        // Expanding pulse rings at emitters
        if (!SB.reducedMotion) {
            var lpR = 6 + (this.laserTimer % 0.5) / 0.5 * 14;
            var lpA = (1 - (this.laserTimer % 0.5) / 0.5) * 0.3;
            ctx.strokeStyle = 'rgba(255,50,50,' + lpA.toFixed(2) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(8, this.y, lpR, 0, SB.TAU); ctx.stroke();
            ctx.beginPath(); ctx.arc(cw - 8, this.y, lpR, 0, SB.TAU); ctx.stroke();
        }
        ctx.restore();
    } else if (this.laserPhase === 'charge') {
        var pulse = 0.5 + Math.sin(this.laserTimer * 35) * 0.4;
        var chargeW = 2 + this.laserTimer / 0.3 * 4;
        ctx.save();
        ctx.shadowColor = 'rgba(255, 50, 50, 0.6)';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = 'rgba(255, 50, 50, ' + pulse.toFixed(2) + ')';
        ctx.lineWidth = chargeW;
        ctx.beginPath();
        ctx.moveTo(0, this.y);
        ctx.lineTo(cw, this.y);
        ctx.stroke();
        var chargeFrac = this.laserTimer / 0.3;
        var barW = 6 + chargeFrac * 4;
        ctx.fillStyle = 'rgba(255,80,80,' + (pulse * 0.6).toFixed(2) + ')';
        ctx.fillRect(0, this.y - barW / 2, 3, barW);
        ctx.fillRect(cw - 3, this.y - barW / 2, 3, barW);
        var cdR = 3 + chargeFrac * 2;
        ctx.fillStyle = 'rgba(255,200,200,' + (pulse * 0.8).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(1.5, this.y, cdR, 0, SB.TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(cw - 1.5, this.y, cdR, 0, SB.TAU); ctx.fill();
        ctx.restore();
    } else if (this.laserPhase === 'active') {
        var beamPulse = 1 + Math.sin(this.laserTimer * 20) * 0.15;
        var beamH = 18 * beamPulse;
        ctx.save();
        if (hc) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.95)';
            ctx.fillRect(0, this.y - beamH / 2, cw, beamH);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 3;
            ctx.strokeRect(0, this.y - beamH / 2, cw, beamH);
            // HC center stripe
            ctx.fillStyle = '#FFFF00';
            ctx.fillRect(0, this.y - 2, cw, 4);
        } else {
            ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
            ctx.shadowBlur = 25;
            var grad = ctx.createLinearGradient(0, this.y - beamH / 2, 0, this.y + beamH / 2);
            grad.addColorStop(0, 'rgba(255, 100, 100, 0.2)');
            grad.addColorStop(0.3, 'rgba(255, 50, 50, 0.9)');
            grad.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
            grad.addColorStop(0.7, 'rgba(255, 50, 50, 0.9)');
            grad.addColorStop(1, 'rgba(255, 100, 100, 0.2)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, this.y - beamH / 2, cw, beamH);
            // Bright inner core line
            ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 + beamPulse * 0.3).toFixed(2) + ')';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, this.y);
            ctx.lineTo(cw, this.y);
            ctx.stroke();
            // Edge spark emitters (more at higher difficulty)
            var sparkT = this.laserTimer * 40;
            var sparkCount = 3 + Math.floor((SB._difficulty || 0) * 3);
            ctx.fillStyle = 'rgba(255,200,100,0.7)';
            for (var ei = 0; ei < sparkCount; ei++) {
                var sy = this.y + Math.sin(sparkT + ei * 2.1) * (beamH * 0.4);
                ctx.beginPath();
                ctx.arc(3 + ei * 2, sy, 2, 0, SB.TAU);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(cw - 3 - ei * 2, sy, 2, 0, SB.TAU);
                ctx.fill();
            }
        }
        ctx.restore();
    } else if (this.laserPhase === 'fade') {
        var a = 1 - this.laserTimer / 0.3;
        var bh = 18 * a;
        ctx.save();
        ctx.fillStyle = 'rgba(255, 50, 50, ' + (a * 0.4).toFixed(2) + ')';
        ctx.fillRect(0, this.y - bh / 2, cw, bh);
        if (a > 0.1 && !SB.reducedMotion) {
            ctx.strokeStyle = 'rgba(255,120,60,' + (a * 0.25).toFixed(2) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            var hStep = 8;
            ctx.moveTo(0, this.y);
            for (var hx = hStep; hx <= cw; hx += hStep) {
                var hOff = Math.sin(hx * 0.08 + this.laserTimer * 20) * bh * 0.4;
                ctx.lineTo(hx, this.y + hOff);
            }
            ctx.stroke();
        }
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

    var hcg = SB.highContrast;

    // Pull field rings (expanding outward)
    ctx.save();
    ctx.globalAlpha = wellAlpha;
    var ringCount = 3 + Math.min(Math.floor(this.lifetime / 1.5), 2);
    for (var ring = ringCount - 1; ring >= 0; ring--) {
        var ringPhase = (this.wellPhase * 0.5 + ring * (2.4 / ringCount)) % 2;
        var ringR = this.radius + ringPhase * (this.pullRadius - this.radius);
        var ringAlpha = (1 - ringPhase / 2) * (hcg ? 0.3 : 0.12);
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, SB.TAU);
        ctx.strokeStyle = hcg ? 'rgba(255,180,255,' + ringAlpha.toFixed(3) + ')' : 'rgba(155,89,182,' + ringAlpha.toFixed(3) + ')';
        ctx.lineWidth = hcg ? 2 : 1.5;
        ctx.stroke();
    }

    // Core
    var psInt = Math.min(this.pullStrength / 300, 1);
    ctx.beginPath();
    ctx.arc(cx, cy, this.radius * pulse, 0, SB.TAU);
    if (hcg) {
        ctx.fillStyle = 'rgba(200,100,255,0.8)';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
    } else {
        var coreA = 0.7 + psInt * 0.3;
        var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.radius * pulse);
        grad.addColorStop(0, 'rgba(142,68,173,' + coreA.toFixed(2) + ')');
        grad.addColorStop(0.6, 'rgba(155,89,182,' + (coreA * 0.5).toFixed(2) + ')');
        grad.addColorStop(1, 'rgba(155,89,182,0)');
        ctx.fillStyle = grad;
        ctx.fill();
    }

    // Inner spinning ring
    if (!SB.reducedMotion) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.wellPhase * 1.5);
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * pulse * 0.55, 0, Math.PI * 1.2);
        ctx.strokeStyle = 'rgba(200,150,255,' + (wellAlpha * 0.25).toFixed(3) + ')';
        ctx.setLineDash([3, 4]);
        ctx.lineWidth = 1 + psInt * 1;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    // Inner eye (dark center + pulsing iris)
    if (!hcg) {
        var irisR = 5 + Math.sin(this.wellPhase * 2) * 1.5;
        var irisGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, irisR);
        irisGrad.addColorStop(0, 'rgba(20,0,30,0.9)');
        irisGrad.addColorStop(0.6, 'rgba(100,50,150,0.6)');
        irisGrad.addColorStop(1, 'rgba(200,150,255,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, irisR, 0, SB.TAU);
        ctx.fillStyle = irisGrad;
        ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, SB.TAU);
    ctx.fillStyle = hcg ? '#FFFFFF' : 'rgba(255,220,255,0.9)';
    ctx.fill();

    // Orbiting debris particles (count grows with lifetime)
    if (!SB.reducedMotion) {
        var orbCount = 2 + Math.min(Math.floor(this.lifetime / 1.2), 4);
        for (var oi = 0; oi < orbCount; oi++) {
            var oAngle = this.wellPhase * (1.2 + oi * 0.3) + oi * SB.TAU / orbCount;
            var oDist = this.radius * (1.4 + oi * 0.3);
            var ox = cx + Math.cos(oAngle) * oDist;
            var oy = cy + Math.sin(oAngle) * oDist;
            ctx.beginPath();
            ctx.arc(ox, oy, 1.2, 0, SB.TAU);
            ctx.fillStyle = hcg ? 'rgba(255,180,255,' + (wellAlpha * 0.5).toFixed(2) + ')' : 'rgba(180,120,255,' + (wellAlpha * 0.3).toFixed(2) + ')';
            ctx.fill();
        }
    }

    // Distortion wave ring
    if (!SB.reducedMotion && !hcg) {
        var waveR = (this.radius + this.pullRadius) * 0.5;
        var waveSegs = 24;
        ctx.beginPath();
        for (var wi = 0; wi <= waveSegs; wi++) {
            var wAngle = SB.TAU * wi / waveSegs;
            var wR = waveR + Math.sin(wAngle * 4 + this.wellPhase * 3) * 3;
            if (wi === 0) ctx.moveTo(cx + Math.cos(wAngle) * wR, cy + Math.sin(wAngle) * wR);
            else ctx.lineTo(cx + Math.cos(wAngle) * wR, cy + Math.sin(wAngle) * wR);
        }
        ctx.strokeStyle = 'rgba(180,120,255,' + (wellAlpha * 0.1).toFixed(3) + ')';
        ctx.lineWidth = 0.8;
        ctx.stroke();
    }

    // Outer pull boundary ring (dashed, pulsing width)
    var bdAlpha = pulse * 0.08;
    var bdPulse = 1 + Math.sin(this.wellPhase * 2) * 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, this.pullRadius, 0, SB.TAU);
    ctx.strokeStyle = 'rgba(155,89,182,' + bdAlpha.toFixed(3) + ')';
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = bdPulse;
    ctx.stroke();
    ctx.setLineDash([]);

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

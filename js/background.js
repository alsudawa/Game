window.SB = window.SB || {};

SB.Background = function() {
    this.stars = [];
    this.clouds = [];
    this.particles = [];
    this.shootingStars = [];
    this.colorPhase = 0;
    this._cachedGrad = null;
    this._cachedD = -1;
    this._cachedH = 0;
};

SB.Background.prototype.init = function(cw, ch) {
    this.stars = [];
    for (var i = 0; i < 40; i++) {
        this.stars.push({
            x: Math.random() * cw,
            y: Math.random() * ch * 0.7,
            size: SB.randRange(0.5, 2),
            twinkleSpeed: SB.randRange(1, 3),
            twinklePhase: Math.random() * SB.TAU
        });
    }

    this.clouds = [];
    for (var j = 0; j < 7; j++) {
        this.clouds.push({
            x: Math.random() * cw,
            y: SB.randRange(-50, ch),
            width: SB.randRange(60, 150),
            height: SB.randRange(20, 50),
            speed: SB.randRange(5, 15),
            alpha: SB.randRange(0.04, 0.12)
        });
    }

    this.particles = [];
    for (var k = 0; k < 15; k++) {
        this.particles.push({
            x: Math.random() * cw,
            y: Math.random() * ch,
            size: SB.randRange(1, 3),
            speedX: SB.randRange(-5, 5),
            speedY: SB.randRange(-8, -2),
            alpha: SB.randRange(0.1, 0.3),
            phase: Math.random() * SB.TAU
        });
    }
};

SB.Background.prototype.update = function(dt, difficulty) {
    this.colorPhase = difficulty || 0;

    for (var i = 0; i < this.stars.length; i++) {
        this.stars[i].twinklePhase += this.stars[i].twinkleSpeed * dt;
    }

    var ch = SB.canvasHeight;
    var cw = SB.canvasWidth;
    for (var j = 0; j < this.clouds.length; j++) {
        var cloud = this.clouds[j];
        cloud.y += cloud.speed * dt;
        if (cloud.y > ch + 60) {
            cloud.y = -cloud.height - 20;
            cloud.x = Math.random() * cw;
        }
    }

    for (var k = 0; k < this.particles.length; k++) {
        var p = this.particles[k];
        p.x += p.speedX * dt;
        p.y += p.speedY * dt;
        p.phase += 2 * dt;
        if (p.y < -10) {
            p.y = ch + 10;
            p.x = Math.random() * cw;
        }
        if (p.x < -10) p.x = cw + 10;
        if (p.x > cw + 10) p.x = -10;
    }

    // Shooting stars at higher difficulty
    if (difficulty > 0.3 && Math.random() < 0.004 * dt * 60) {
        this.shootingStars.push({
            x: SB.randRange(0, cw),
            y: SB.randRange(0, ch * 0.4),
            vx: SB.randRange(-500, -200),
            vy: SB.randRange(150, 350),
            life: SB.randRange(0.3, 0.6),
            maxLife: 0,
            size: SB.randRange(1, 2.5)
        });
        this.shootingStars[this.shootingStars.length - 1].maxLife = this.shootingStars[this.shootingStars.length - 1].life;
    }
    var wi = 0;
    for (var s = 0; s < this.shootingStars.length; s++) {
        var ss = this.shootingStars[s];
        ss.x += ss.vx * dt;
        ss.y += ss.vy * dt;
        ss.life -= dt;
        if (ss.life > 0) this.shootingStars[wi++] = ss;
    }
    this.shootingStars.length = wi;
};

SB.Background.prototype.draw = function(ctx, cw, ch) {
    var d = this.colorPhase;

    // Cache background gradient (only rebuild when difficulty or height changes)
    // Zone-based sky: CALM(deep blue) > RISING(sunset orange) > INTENSE(blood red) > EXTREME(deep purple)
    var quantD = Math.floor(d * 50) / 50;
    if (!this._cachedGrad || quantD !== this._cachedD || ch !== this._cachedH) {
        var topR, topG, topB, botR, botG, botB;
        if (d < 0.3) {
            // CALM: deep navy to dark blue
            var t = d / 0.3;
            topR = Math.floor(SB.lerp(10, 25, t));
            topG = Math.floor(SB.lerp(10, 15, t));
            topB = Math.floor(SB.lerp(35, 50, t));
            botR = Math.floor(SB.lerp(20, 50, t));
            botG = Math.floor(SB.lerp(35, 60, t));
            botB = Math.floor(SB.lerp(70, 90, t));
        } else if (d < 0.5) {
            // RISING: dark blue to sunset orange
            var t2 = (d - 0.3) / 0.2;
            topR = Math.floor(SB.lerp(25, 60, t2));
            topG = Math.floor(SB.lerp(15, 20, t2));
            topB = Math.floor(SB.lerp(50, 45, t2));
            botR = Math.floor(SB.lerp(50, 200, t2));
            botG = Math.floor(SB.lerp(60, 100, t2));
            botB = Math.floor(SB.lerp(90, 50, t2));
        } else if (d < 0.8) {
            // INTENSE: sunset to blood red
            var t3 = (d - 0.5) / 0.3;
            topR = Math.floor(SB.lerp(60, 50, t3));
            topG = Math.floor(SB.lerp(20, 10, t3));
            topB = Math.floor(SB.lerp(45, 40, t3));
            botR = Math.floor(SB.lerp(200, 180, t3));
            botG = Math.floor(SB.lerp(100, 50, t3));
            botB = Math.floor(SB.lerp(50, 40, t3));
        } else {
            // EXTREME: blood red to deep purple
            var t4 = (d - 0.8) / 0.2;
            topR = Math.floor(SB.lerp(50, 40, t4));
            topG = Math.floor(SB.lerp(10, 5, t4));
            topB = Math.floor(SB.lerp(40, 60, t4));
            botR = Math.floor(SB.lerp(180, 120, t4));
            botG = Math.floor(SB.lerp(50, 30, t4));
            botB = Math.floor(SB.lerp(40, 100, t4));
        }

        this._cachedGrad = ctx.createLinearGradient(0, 0, 0, ch);
        this._cachedGrad.addColorStop(0, 'rgb(' + topR + ',' + topG + ',' + topB + ')');
        this._cachedGrad.addColorStop(1, 'rgb(' + botR + ',' + botG + ',' + botB + ')');
        this._cachedD = quantD;
        this._cachedH = ch;
    }
    ctx.fillStyle = this._cachedGrad;
    ctx.fillRect(0, 0, cw, ch);

    for (var i = 0; i < this.stars.length; i++) {
        var star = this.stars[i];
        var alpha = (Math.sin(star.twinklePhase) + 1) / 2 * 0.7 + 0.1;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, SB.TAU);
        ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
        ctx.fill();
    }

    for (var j = 0; j < this.clouds.length; j++) {
        var cloud = this.clouds[j];
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, ' + cloud.alpha + ')';
        ctx.translate(cloud.x, cloud.y);
        ctx.scale(1, cloud.height / cloud.width);
        ctx.beginPath();
        ctx.arc(0, 0, cloud.width / 2, 0, SB.TAU);
        ctx.fill();
        ctx.restore();
    }

    for (var k = 0; k < this.particles.length; k++) {
        var p = this.particles[k];
        var pa = p.alpha * ((Math.sin(p.phase) + 1) / 2);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, SB.TAU);
        ctx.fillStyle = 'rgba(255, 255, 255, ' + pa + ')';
        ctx.fill();
    }

    // Shooting stars
    for (var s = 0; s < this.shootingStars.length; s++) {
        var ss = this.shootingStars[s];
        var sa = (ss.life / ss.maxLife) * 0.8;
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, ' + sa + ')';
        ctx.lineWidth = ss.size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(ss.x - ss.vx * 0.04, ss.y - ss.vy * 0.04);
        ctx.stroke();
        ctx.restore();
    }
};

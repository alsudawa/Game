window.SB = window.SB || {};

SB.Background = function() {
    this.stars = [];
    this.clouds = [];
    this.particles = [];
    this.shootingStars = [];
    this.speedLines = [];
    this.colorPhase = 0;
    this.bounceShift = 0;
    this._cachedGrad = null;
    this._cachedD = -1;
    this._cachedH = 0;
};

SB.Background.prototype.init = function(cw, ch) {
    this.stars = [];
    for (var i = 0; i < 45; i++) {
        var sDepth = i < 15 ? 0.4 : (i < 30 ? 0.7 : 1.0);
        this.stars.push({
            x: Math.random() * cw,
            y: Math.random() * ch * 0.7,
            size: SB.randRange(0.5, 2) * sDepth,
            twinkleSpeed: SB.randRange(1, 3) * sDepth,
            twinklePhase: Math.random() * SB.TAU,
            depth: sDepth
        });
    }

    this.clouds = [];
    for (var j = 0; j < 9; j++) {
        var depth = j < 3 ? 0.5 : (j < 6 ? 0.75 : 1.0);
        this.clouds.push({
            x: Math.random() * cw,
            y: SB.randRange(-50, ch),
            width: SB.randRange(60, 150) * depth,
            height: SB.randRange(20, 50) * depth,
            speed: SB.randRange(5, 15) * depth,
            alpha: SB.randRange(0.03, 0.08) * depth,
            depth: depth
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
    if (this.bounceShift > 0) this.bounceShift = Math.max(0, this.bounceShift - dt * 4);

    var twinkleMult = 1 + (this.comboBoost || 0) * 2 + (difficulty || 0) * 0.5;
    for (var i = 0; i < this.stars.length; i++) {
        this.stars[i].twinklePhase += this.stars[i].twinkleSpeed * dt * twinkleMult;
    }

    var ch = SB.canvasHeight;
    var cw = SB.canvasWidth;
    for (var j = 0; j < this.clouds.length; j++) {
        var cloud = this.clouds[j];
        cloud.y += cloud.speed * dt;
        cloud.x += Math.sin(cloud.y * 0.01) * (cloud.depth || 1) * dt * 3;
        if (cloud.y > ch + 60) {
            cloud.y = -cloud.height - 20;
            cloud.x = Math.random() * cw;
        }
    }

    var pSpeedMult = 1 + (difficulty || 0) * 0.8;
    for (var k = 0; k < this.particles.length; k++) {
        var p = this.particles[k];
        p.x += p.speedX * dt * pSpeedMult;
        p.y += p.speedY * dt * pSpeedMult;
        p.phase += 2 * dt;
        if (p.y < -10) {
            p.y = ch + 10;
            p.x = Math.random() * cw;
        }
        if (p.x < -10) p.x = cw + 10;
        if (p.x > cw + 10) p.x = -10;
    }

    // Speed lines at higher difficulty (background streaks conveying speed)
    if (difficulty > 0.4) {
        var slSpawnRate = (difficulty - 0.4) / 0.6 * 0.8; // 0 at d=0.4, 0.8 at d=1.0
        if (Math.random() < slSpawnRate * dt * 60) {
            this.speedLines.push({
                x: SB.randRange(-20, cw + 20),
                y: -5,
                len: SB.randRange(15, 40 + difficulty * 30),
                speed: SB.randRange(400, 800) * (0.6 + difficulty * 0.4),
                alpha: SB.randRange(0.03, 0.08 + difficulty * 0.04)
            });
        }
    }
    var slw = 0;
    for (var sl = 0; sl < this.speedLines.length; sl++) {
        var line = this.speedLines[sl];
        line.y += line.speed * dt;
        if (line.y - line.len < ch + 10) {
            this.speedLines[slw++] = line;
        }
    }
    this.speedLines.length = slw;

    // Shooting stars at higher difficulty
    var ssRate = 0.004 + Math.max(0, difficulty - 0.3) * 0.008;
    if (difficulty > 0.3 && Math.random() < ssRate * dt * 60) {
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

SB.Background.prototype.draw = function(ctx, cw, ch, ballX, ballY) {
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
    if (d > 0.3) {
        var ambPulse = (Math.sin((SB.frameTime || 0) * 0.002) + 1) / 2 * (d - 0.3) * 0.03;
        ctx.fillStyle = 'rgba(255,255,255,' + ambPulse.toFixed(4) + ')';
        ctx.fillRect(0, 0, cw, ch);
    }

    // Parallax offsets based on ball position (subtle depth)
    var pxNorm = typeof ballX === 'number' ? (ballX - cw / 2) / cw : 0;
    var pyNorm = typeof ballY === 'number' ? (ballY - ch / 2) / ch : 0;
    var bShift = this.bounceShift || 0;
    var starPx = pxNorm * -2;
    var starPy = pyNorm * -1.5 - bShift * 3;
    var cloudPx = pxNorm * -5;
    var cloudPy = pyNorm * -3 - bShift * 1.5;

    for (var i = 0; i < this.stars.length; i++) {
        var star = this.stars[i];
        var alpha = (Math.sin(star.twinklePhase) + 1) / 2 * 0.7 + 0.1;
        ctx.beginPath();
        var sd = star.depth || 1;
        ctx.arc(star.x + starPx * sd, star.y + starPy * sd, star.size, 0, SB.TAU);
        var sColor = (i % 5 === 0) ? '255,240,200' : (i % 7 === 0) ? '200,220,255' : '255,255,255';
        ctx.fillStyle = 'rgba(' + sColor + ',' + alpha + ')';
        ctx.fill();
    }

    var cloudDiffMult = 1 + d * 0.8;
    for (var j = 0; j < this.clouds.length; j++) {
        var cloud = this.clouds[j];
        ctx.save();
        var cdepth = cloud.depth || 1;
        var cBright = Math.floor(200 + cdepth * 55);
        var cR = cBright, cG = cBright, cB = cBright;
        if (d > 0.5) {
            var cTint = (d - 0.5) / 0.5;
            cR = Math.floor(cBright + cTint * 40);
            cG = Math.floor(cBright - cTint * 30);
            cB = Math.floor(cBright - cTint * 20);
        }
        ctx.fillStyle = 'rgba(' + cR + ',' + cG + ',' + cB + ',' + (cloud.alpha * cloudDiffMult).toFixed(3) + ')';
        ctx.translate(cloud.x + cloudPx * cdepth, cloud.y + cloudPy * cdepth);
        ctx.scale(1, cloud.height / cloud.width);
        ctx.beginPath();
        ctx.arc(0, 0, cloud.width / 2, 0, SB.TAU);
        ctx.fill();
        ctx.restore();
    }

    var pColor = d > 0.8 ? '200,180,255' : d > 0.5 ? '255,200,180' : d > 0.3 ? '255,230,200' : '255,255,255';
    for (var k = 0; k < this.particles.length; k++) {
        var p = this.particles[k];
        var pa = p.alpha * ((Math.sin(p.phase) + 1) / 2);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, SB.TAU);
        ctx.fillStyle = 'rgba(' + pColor + ',' + pa + ')';
        ctx.fill();
    }

    // Shooting stars with gradient trail (brighter at higher difficulty)
    var ssBrightMult = 1 + d * 0.4;
    for (var s = 0; s < this.shootingStars.length; s++) {
        var ss = this.shootingStars[s];
        var sa = Math.min((ss.life / ss.maxLife) * 0.8 * ssBrightMult, 1);
        var ssSpeed = Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy);
        var trailMult = 0.04 + (ssSpeed / 600) * 0.04;
        var tailX = ss.x - ss.vx * trailMult;
        var tailY = ss.y - ss.vy * trailMult;
        ctx.save();
        var ssGrad = ctx.createLinearGradient(ss.x, ss.y, tailX, tailY);
        ssGrad.addColorStop(0, 'rgba(255, 255, 255, ' + sa.toFixed(2) + ')');
        ssGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.strokeStyle = ssGrad;
        ctx.lineWidth = ss.size * 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
        // Bright head dot (scales with speed)
        var headScale = 0.8 + Math.min(ssSpeed / 800, 0.5);
        ctx.beginPath();
        ctx.arc(ss.x, ss.y, ss.size * headScale, 0, SB.TAU);
        ctx.fillStyle = 'rgba(255, 255, 240, ' + sa.toFixed(2) + ')';
        ctx.fill();
        ctx.restore();
    }

    // Speed lines (vertical streaks at high difficulty)
    if (this.speedLines.length > 0) {
        ctx.save();
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        var slColor = d > 0.8 ? '200,150,255' : d > 0.5 ? '255,180,150' : '255,255,255';
        for (var sl = 0; sl < this.speedLines.length; sl++) {
            var line = this.speedLines[sl];
            ctx.strokeStyle = 'rgba(' + slColor + ',' + line.alpha.toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(line.x, line.y);
            ctx.lineTo(line.x, line.y - line.len);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Aurora borealis effect in EXTREME zone (d > 0.8)
    if (d > 0.8) {
        var auroraAlpha = (d - 0.8) / 0.2 * 0.08;
        var ft = (SB.frameTime || 0) * 0.001;
        ctx.save();
        var auroraBands = 3 + Math.floor((d - 0.8) / 0.2 * 2);
        for (var ai = 0; ai < auroraBands; ai++) {
            var aPhase = ft * 0.3 + ai * (6.3 / auroraBands);
            var ax = cw * (0.1 + ai * (0.8 / auroraBands)) + Math.sin(aPhase) * cw * 0.15;
            var aH = ch * 0.3 + Math.sin(aPhase * 0.7) * ch * 0.1;
            var aW = cw * 0.25 + Math.sin(aPhase * 0.5 + 1) * cw * 0.08;
            var aColorIdx = (ai + Math.floor(ft * 0.15)) % 3;
            var aColor = aColorIdx === 0 ? '100,200,255' : (aColorIdx === 1 ? '180,100,255' : '100,255,180');
            var aGrad = ctx.createLinearGradient(ax, 0, ax, aH);
            aGrad.addColorStop(0, 'rgba(' + aColor + ',' + auroraAlpha.toFixed(3) + ')');
            aGrad.addColorStop(0.5, 'rgba(' + aColor + ',' + (auroraAlpha * 0.5).toFixed(3) + ')');
            aGrad.addColorStop(1, 'rgba(' + aColor + ',0)');
            ctx.fillStyle = aGrad;
            ctx.fillRect(ax - aW / 2, 0, aW, aH);
        }
        ctx.restore();
    }
};

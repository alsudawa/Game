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
    this._pendingStars = 0;
};

SB.Background.prototype.triggerShootingStar = function(count) {
    this._pendingStars += (count || 1);
};

SB.Background.prototype.init = function(cw, ch) {
    this.stars = [];
    for (var i = 0; i < 45; i++) {
        var sDepth = i < 15 ? 0.4 : (i < 30 ? 0.7 : 1.0);
        var sx = Math.random() * cw;
        var sy = Math.random() * ch * 0.7;
        this.stars.push({
            x: sx, y: sy,
            size: SB.randRange(0.5, 2) * sDepth,
            twinkleSpeed: SB.randRange(1, 3) * sDepth,
            twinklePhase: Math.random() * SB.TAU,
            depth: sDepth
        });
        // Star clusters: ~20% chance to add 1-2 neighbor stars
        if (Math.random() < 0.2) {
            for (var ci = 0; ci < 1 + Math.floor(Math.random() * 2); ci++) {
                this.stars.push({
                    x: sx + SB.randRange(-8, 8), y: sy + SB.randRange(-6, 6),
                    size: SB.randRange(0.3, 1) * sDepth,
                    twinkleSpeed: SB.randRange(1.5, 3.5) * sDepth,
                    twinklePhase: Math.random() * SB.TAU,
                    depth: sDepth
                });
            }
        }
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
        var pDepth = 0.5 + Math.random() * 0.5;
        this.particles.push({
            x: Math.random() * cw,
            y: Math.random() * ch,
            size: SB.randRange(1, 3) * pDepth,
            speedX: SB.randRange(-5, 5) * pDepth,
            speedY: SB.randRange(-8, -2) * pDepth,
            alpha: SB.randRange(0.1, 0.3) * pDepth,
            phase: Math.random() * SB.TAU
        });
    }
};

SB.Background.prototype.update = function(dt, difficulty) {
    this.colorPhase = difficulty || 0;
    if (this.bounceShift > 0) this.bounceShift = Math.max(0, this.bounceShift - dt * 4);

    var bp = (SB.audio && SB.audio.beatPulse) || 0;
    var twinkleMult = 1 + (this.comboBoost || 0) * 2 + (difficulty || 0) * 0.5 + bp * 0.8;
    for (var i = 0; i < this.stars.length; i++) {
        this.stars[i].twinklePhase += this.stars[i].twinkleSpeed * dt * twinkleMult;
    }

    var ch = SB.canvasHeight;
    var cw = SB.canvasWidth;
    var cloudSpeedMult = 1 + (difficulty || 0) * 1.2;
    for (var j = 0; j < this.clouds.length; j++) {
        var cloud = this.clouds[j];
        cloud.y += cloud.speed * dt * cloudSpeedMult;
        cloud.x += Math.sin(cloud.y * 0.01) * (cloud.depth || 1) * dt * 3 * cloudSpeedMult;
        if (cloud.y > ch + 60) {
            cloud.y = -cloud.height - 20;
            cloud.x = Math.random() * cw;
        }
    }

    var pSpeedMult = 1 + (difficulty || 0) * 0.8;
    var pDriftX = (difficulty || 0) > 0.5 ? ((difficulty - 0.5) / 0.5) * 15 : 0;
    for (var k = 0; k < this.particles.length; k++) {
        var p = this.particles[k];
        p.x += (p.speedX + pDriftX * Math.sin(p.phase * 0.5)) * dt * pSpeedMult;
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

    // Manual shooting star triggers (from milestones etc.)
    for (var msi = 0; msi < this._pendingStars; msi++) {
        this.shootingStars.push({
            x: SB.randRange(cw * 0.2, cw * 0.8),
            y: SB.randRange(0, ch * 0.2),
            vx: SB.randRange(-600, -300) * (Math.random() < 0.5 ? 1 : -1),
            vy: SB.randRange(200, 400),
            life: SB.randRange(0.5, 0.8),
            maxLife: 0.8,
            size: SB.randRange(2, 3.5)
        });
    }
    this._pendingStars = 0;

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
    if (d > 0.85 && !SB.reducedMotion) {
        var exPulse = (Math.sin((SB.frameTime || 0) * 0.004) + 1) / 2;
        var exA = (d - 0.85) / 0.15 * exPulse * 0.025;
        ctx.fillStyle = 'rgba(155,89,182,' + exA.toFixed(4) + ')';
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

    var zoneTintR = 255, zoneTintG = 255, zoneTintB = 255;
    if (d > 0.5) {
        var ztFrac = (d - 0.5) / 0.5;
        if (d > 0.8) {
            zoneTintR = Math.floor(SB.lerp(255, 200, ztFrac));
            zoneTintG = Math.floor(SB.lerp(255, 180, ztFrac));
            zoneTintB = 255;
        } else {
            zoneTintR = 255;
            zoneTintG = Math.floor(SB.lerp(255, 200, ztFrac));
            zoneTintB = Math.floor(SB.lerp(255, 200, ztFrac));
        }
    }
    for (var i = 0; i < this.stars.length; i++) {
        var star = this.stars[i];
        var alpha = (Math.sin(star.twinklePhase) + 1) / 2 * 0.7 + 0.1;
        ctx.beginPath();
        var sd = star.depth || 1;
        ctx.arc(star.x + starPx * sd, star.y + starPy * sd, star.size, 0, SB.TAU);
        var sColor;
        if (d > 0.5) {
            sColor = zoneTintR + ',' + zoneTintG + ',' + zoneTintB;
        } else {
            sColor = (i % 5 === 0) ? '255,240,200' : (i % 7 === 0) ? '200,220,255' : '255,255,255';
        }
        ctx.fillStyle = 'rgba(' + sColor + ',' + alpha + ')';
        ctx.fill();
    }

    if (!SB.reducedMotion) {
        for (var gi = 0; gi < this.stars.length; gi += 10) {
            var gs = this.stars[gi];
            var gsd = gs.depth || 1;
            var ga = (Math.sin(gs.twinklePhase) + 1) / 2 * 0.03;
            if (ga > 0.01) {
                ctx.beginPath();
                ctx.arc(gs.x + starPx * gsd, gs.y + starPy * gsd, gs.size * 5, 0, SB.TAU);
                ctx.fillStyle = 'rgba(200,210,255,' + ga.toFixed(3) + ')';
                ctx.fill();
            }
        }
    }

    // Constellation lines at extreme difficulty
    if (d > 0.75 && !SB.reducedMotion) {
        var clAlpha = (d - 0.75) / 0.25 * 0.06;
        ctx.save();
        ctx.strokeStyle = 'rgba(200,200,255,' + clAlpha.toFixed(3) + ')';
        ctx.lineWidth = 0.5;
        for (var ci = 0; ci < this.stars.length; ci += 3) {
            var s1 = this.stars[ci];
            var s1d = s1.depth || 1;
            var s1x = s1.x + starPx * s1d;
            var s1y = s1.y + starPy * s1d;
            for (var cj = ci + 3; cj < this.stars.length; cj += 3) {
                var s2 = this.stars[cj];
                var dx = s1.x - s2.x;
                var dy = s1.y - s2.y;
                if (dx * dx + dy * dy < 3600) {
                    var s2d = s2.depth || 1;
                    ctx.beginPath();
                    ctx.moveTo(s1x, s1y);
                    ctx.lineTo(s2.x + starPx * s2d, s2.y + starPy * s2d);
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    }

    var cloudDiffMult = 1 + d * 0.8;
    var cloudFade = d > 0.6 ? 1 - (d - 0.6) / 0.4 * 0.4 : 1;
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
        ctx.fillStyle = 'rgba(' + cR + ',' + cG + ',' + cB + ',' + (cloud.alpha * cloudDiffMult * cloudFade).toFixed(3) + ')';
        ctx.translate(cloud.x + cloudPx * cdepth, cloud.y + cloudPy * cdepth);
        ctx.scale(1, cloud.height / cloud.width);
        var cloudScale = 1 + d * 0.15;
        var cloudR = cloud.width / 2 * cloudScale;
        ctx.beginPath();
        ctx.arc(0, 0, cloudR, 0, SB.TAU);
        ctx.fill();
        if (d > 0.5 && !SB.reducedMotion) {
            var cgStr = (d - 0.5) / 0.5 * 0.05;
            var cgGrad = ctx.createRadialGradient(0, 0, cloudR * 0.5, 0, 0, cloudR * 1.8);
            cgGrad.addColorStop(0, 'rgba(' + cR + ',' + cG + ',' + cB + ',' + cgStr.toFixed(3) + ')');
            cgGrad.addColorStop(1, 'rgba(' + cR + ',' + cG + ',' + cB + ',0)');
            ctx.fillStyle = cgGrad;
            ctx.fillRect(-cloudR * 1.8, -cloudR * 1.8, cloudR * 3.6, cloudR * 3.6);
        }
        ctx.restore();
    }

    var pColor = d > 0.8 ? '200,180,255' : d > 0.5 ? '255,200,180' : d > 0.3 ? '255,230,200' : '255,255,255';
    var pAlphaMult = 1 + d * 0.6;
    for (var k = 0; k < this.particles.length; k++) {
        var p = this.particles[k];
        var pa = p.alpha * ((Math.sin(p.phase) + 1) / 2) * pAlphaMult;
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
        ctx.lineCap = 'round';
        var slColor = d > 0.8 ? '200,150,255' : d > 0.5 ? '255,180,150' : '255,255,255';
        for (var sl = 0; sl < this.speedLines.length; sl++) {
            var line = this.speedLines[sl];
            ctx.lineWidth = 0.8 + line.len / 60;
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

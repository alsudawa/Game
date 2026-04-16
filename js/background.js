window.SB = window.SB || {};

SB.Background = function() {
    this.stars = [];
    this.clouds = [];
    this.particles = [];
    this.colorPhase = 0;
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
};

SB.Background.prototype.draw = function(ctx, cw, ch) {
    var d = this.colorPhase;

    var topR = Math.floor(SB.lerp(15, 40, d));
    var topG = Math.floor(SB.lerp(12, 10, d));
    var topB = Math.floor(SB.lerp(41, 60, d));
    var botR = Math.floor(SB.lerp(30, 233, d));
    var botG = Math.floor(SB.lerp(50, 100, d));
    var botB = Math.floor(SB.lerp(80, 67, d));

    var gradient = ctx.createLinearGradient(0, 0, 0, ch);
    gradient.addColorStop(0, 'rgb(' + topR + ',' + topG + ',' + topB + ')');
    gradient.addColorStop(1, 'rgb(' + botR + ',' + botG + ',' + botB + ')');
    ctx.fillStyle = gradient;
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
        ctx.beginPath();
        ctx.ellipse(cloud.x, cloud.y, cloud.width / 2, cloud.height / 2, 0, 0, SB.TAU);
        ctx.fillStyle = 'rgba(255, 255, 255, ' + cloud.alpha + ')';
        ctx.fill();
    }

    for (var k = 0; k < this.particles.length; k++) {
        var p = this.particles[k];
        var pa = p.alpha * ((Math.sin(p.phase) + 1) / 2);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, SB.TAU);
        ctx.fillStyle = 'rgba(255, 255, 255, ' + pa + ')';
        ctx.fill();
    }
};

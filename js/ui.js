window.SB = window.SB || {};

SB.UI = function() {
    this.idleBallY = 0;
    this.idleBallPhase = 0;
    this.blinkPhase = 0;
    this.gameOverAlpha = 0;
    this.scoreCountUp = 0;
    this.font = "-apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif";
    this.comboPopups = [];
    this.powerupEffectsRef = null;
};

SB.UI.prototype.update = function(dt, state, powerupEffects, comboCount, comboTimer) {
    this.blinkPhase += 2.5 * dt;
    this.powerupEffectsRef = powerupEffects || null;

    if (state === 'start') {
        this.idleBallPhase += 3 * dt;
        this.idleBallY = Math.sin(this.idleBallPhase) * 20;
    }

    // Update combo popups
    for (var i = this.comboPopups.length - 1; i >= 0; i--) {
        var p = this.comboPopups[i];
        p.timer += dt;
        p.y -= 40 * dt;
        if (p.timer > 1.0) {
            this.comboPopups.splice(i, 1);
        }
    }

    // Add combo popup when combo triggers
    if (comboCount >= 2 && comboTimer > 1.9) {
        this.comboPopups.push({
            text: comboCount + 'x COMBO!',
            x: SB.canvasWidth / 2,
            y: SB.canvasHeight * 0.35,
            timer: 0
        });
    }
};

SB.UI.prototype.drawStartScreen = function(ctx, cw, ch, highScore) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title
    ctx.save();
    ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.font = 'bold ' + Math.min(cw * 0.12, 52) + 'px ' + this.font;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('SKY BOUNCE', cw / 2, ch * 0.22);
    ctx.restore();

    // Subtitle
    ctx.font = Math.min(cw * 0.035, 14) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('Tap to bounce. Avoid obstacles. Collect stars.', cw / 2, ch * 0.30);

    // Idle ball
    var ballY = ch * 0.45 + this.idleBallY;
    ctx.save();
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(cw / 2, ballY, 18, 0, SB.TAU);
    var gradient = ctx.createRadialGradient(cw / 2 - 5, ballY - 5, 2, cw / 2, ballY, 18);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(1, '#FFD700');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();

    // Powerup legend
    var legendY = ch * 0.56;
    var iconSize = Math.min(cw * 0.025, 10);
    ctx.font = Math.min(cw * 0.03, 12) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    var legends = [
        { color: '#5DADE2', label: 'Shield' },
        { color: '#AF7AC5', label: 'Magnet' },
        { color: '#58D68D', label: 'Slow-Mo' }
    ];
    var totalW = legends.length * 75;
    var startX = cw / 2 - totalW / 2;
    for (var i = 0; i < legends.length; i++) {
        var lx = startX + i * 75 + 10;
        ctx.beginPath();
        ctx.arc(lx, legendY, iconSize, 0, SB.TAU);
        ctx.fillStyle = legends[i].color;
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.textAlign = 'left';
        ctx.fillText(legends[i].label, lx + iconSize + 4, legendY + 1);
    }
    ctx.textAlign = 'center';

    // Tap to start
    var blinkAlpha = (Math.sin(this.blinkPhase) + 1) / 2 * 0.7 + 0.3;
    ctx.font = 'bold ' + Math.min(cw * 0.06, 24) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255, 255, 255, ' + blinkAlpha + ')';
    ctx.fillText('TAP TO START', cw / 2, ch * 0.68);

    if (highScore > 0) {
        ctx.font = Math.min(cw * 0.045, 18) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
        ctx.fillText('BEST: ' + highScore, cw / 2, ch * 0.78);
    }
};

SB.UI.prototype.drawHUD = function(ctx, cw, ch, score) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold ' + Math.min(cw * 0.1, 40) + 'px ' + this.font;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillText(Math.floor(score), cw / 2 + 2, 22);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(Math.floor(score), cw / 2, 20);

    // Combo popups
    for (var i = 0; i < this.comboPopups.length; i++) {
        var p = this.comboPopups[i];
        var alpha = 1 - p.timer;
        var scale = 1 + p.timer * 0.3;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold ' + Math.floor(18 * scale) + 'px ' + this.font;
        ctx.fillStyle = '#FFD700';
        ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
        ctx.shadowBlur = 8;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.text, p.x, p.y);
        ctx.restore();
    }

    // Active powerup indicators
    this._drawPowerupBar(ctx, cw, ch);
};

SB.UI.prototype._drawPowerupBar = function(ctx, cw, ch) {
    if (!this.powerupEffectsRef) return;
    var effects = this.powerupEffectsRef;
    var barY = ch - 40;
    var items = [];

    if (effects.shield) {
        items.push({ color: '#5DADE2', label: 'SHIELD', timer: effects.shieldTimer, max: effects.shieldDuration });
    }
    if (effects.magnet) {
        items.push({ color: '#AF7AC5', label: 'MAGNET', timer: effects.magnetTimer, max: effects.magnetDuration });
    }
    if (effects.slow) {
        items.push({ color: '#58D68D', label: 'SLOW', timer: effects.slowTimer, max: effects.slowDuration });
    }

    if (items.length === 0) return;

    var totalW = items.length * 80;
    var startX = cw / 2 - totalW / 2;

    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var x = startX + i * 80;
        var progress = item.timer / item.max;

        // Background bar
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x, barY, 70, 8);

        // Progress bar
        ctx.fillStyle = item.color;
        ctx.fillRect(x, barY, 70 * progress, 8);

        // Label
        ctx.font = Math.min(cw * 0.025, 10) + 'px ' + this.font;
        ctx.fillStyle = item.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(item.label, x + 35, barY - 2);
    }
};

SB.UI.prototype.resetGameOver = function(finalScore) {
    this.gameOverAlpha = 0;
    this.scoreCountUp = 0;
    this._finalScore = finalScore;
    this.comboPopups = [];
};

SB.UI.prototype.drawGameOver = function(ctx, cw, ch, score, highScore, isNewHigh) {
    this.gameOverAlpha = Math.min(this.gameOverAlpha + 0.05, 1);
    var displayScore = Math.floor(score);

    if (this.scoreCountUp < displayScore) {
        this.scoreCountUp += Math.max(1, Math.floor(displayScore / 60));
        if (this.scoreCountUp > displayScore) this.scoreCountUp = displayScore;
    }

    ctx.fillStyle = 'rgba(0, 0, 0, ' + (this.gameOverAlpha * 0.65) + ')';
    ctx.fillRect(0, 0, cw, ch);

    var alpha = this.gameOverAlpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // GAME OVER title
    ctx.save();
    ctx.shadowColor = 'rgba(231, 76, 60, 0.5)';
    ctx.shadowBlur = 15;
    ctx.font = 'bold ' + Math.min(cw * 0.1, 42) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
    ctx.fillText('GAME OVER', cw / 2, ch * 0.25);
    ctx.restore();

    // Score
    ctx.font = 'bold ' + Math.min(cw * 0.15, 60) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
    ctx.fillText(Math.floor(this.scoreCountUp), cw / 2, ch * 0.37);

    // New best / best
    if (isNewHigh && this.scoreCountUp >= displayScore) {
        var pulse = 1 + Math.sin(this.blinkPhase * 2) * 0.1;
        ctx.save();
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 10;
        ctx.font = 'bold ' + Math.min(cw * 0.055, 22) * pulse + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255, 215, 0, ' + alpha + ')';
        ctx.fillText('NEW BEST!', cw / 2, ch * 0.46);
        ctx.restore();
    } else {
        ctx.font = Math.min(cw * 0.04, 16) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255, 215, 0, ' + (alpha * 0.7) + ')';
        ctx.fillText('BEST: ' + highScore, cw / 2, ch * 0.46);
    }

    if (this.gameOverAlpha >= 0.8) {
        // Share button
        var btnW = Math.min(cw * 0.45, 180);
        var btnH = 42;
        var btnX = cw / 2 - btnW / 2;
        var btnY = ch * 0.55;

        ctx.fillStyle = 'rgba(52, 152, 219, ' + alpha * 0.9 + ')';
        this._roundRect(ctx, btnX, btnY, btnW, btnH, 10);
        ctx.fill();

        ctx.font = 'bold ' + Math.min(cw * 0.04, 16) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
        ctx.fillText('SHARE SCORE', cw / 2, btnY + btnH / 2);

        // Store button bounds for click detection
        SB._shareBtn = { x: btnX, y: btnY, w: btnW, h: btnH, score: displayScore };

        // Tap to restart
        var blinkAlpha = (Math.sin(this.blinkPhase) + 1) / 2 * 0.6 + 0.3;
        ctx.font = 'bold ' + Math.min(cw * 0.05, 20) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255, 255, 255, ' + blinkAlpha + ')';
        ctx.fillText('TAP TO RESTART', cw / 2, ch * 0.70);
    }
};

SB.UI.prototype._roundRect = function(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
};

// Share handler (called from input)
SB.shareScore = function(score) {
    var text = 'I scored ' + score + ' in Sky Bounce! Can you beat me?';
    var url = window.location.href;

    if (navigator.share) {
        navigator.share({ title: 'Sky Bounce', text: text, url: url }).catch(function() {});
    } else {
        // Fallback: copy to clipboard
        var full = text + ' ' + url;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(full).then(function() {
                // Could show a "Copied!" toast
            }).catch(function() {});
        }
    }
};

window.SB = window.SB || {};

SB.UI = function() {
    this.idleBallY = 0;
    this.idleBallPhase = 0;
    this.blinkPhase = 0;
    this.gameOverAlpha = 0;
    this.scoreCountUp = 0;
    this.font = "-apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif";
};

SB.UI.prototype.update = function(dt, state) {
    this.blinkPhase += 2.5 * dt;
    if (state === 'start') {
        this.idleBallPhase += 3 * dt;
        this.idleBallY = Math.sin(this.idleBallPhase) * 20;
    }
};

SB.UI.prototype.drawStartScreen = function(ctx, cw, ch, highScore) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.save();
    ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.font = 'bold ' + Math.min(cw * 0.12, 52) + 'px ' + this.font;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('SKY BOUNCE', cw / 2, ch * 0.25);
    ctx.restore();

    ctx.font = Math.min(cw * 0.04, 16) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('Tap to bounce. Avoid obstacles. Collect stars.', cw / 2, ch * 0.33);

    var ballY = ch * 0.5 + this.idleBallY;
    ctx.save();
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(cw / 2, ballY, 18, 0, SB.TAU);
    var gradient = ctx.createRadialGradient(
        cw / 2 - 5, ballY - 5, 2,
        cw / 2, ballY, 18
    );
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(1, '#FFD700');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();

    var blinkAlpha = (Math.sin(this.blinkPhase) + 1) / 2 * 0.7 + 0.3;
    ctx.font = 'bold ' + Math.min(cw * 0.06, 24) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255, 255, 255, ' + blinkAlpha + ')';
    ctx.fillText('TAP TO START', cw / 2, ch * 0.7);

    if (highScore > 0) {
        ctx.font = Math.min(cw * 0.045, 18) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
        ctx.fillText('BEST: ' + highScore, cw / 2, ch * 0.8);
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
};

SB.UI.prototype.resetGameOver = function(finalScore) {
    this.gameOverAlpha = 0;
    this.scoreCountUp = 0;
    this._finalScore = finalScore;
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

    ctx.save();
    ctx.shadowColor = 'rgba(231, 76, 60, 0.5)';
    ctx.shadowBlur = 15;
    ctx.font = 'bold ' + Math.min(cw * 0.1, 42) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
    ctx.fillText('GAME OVER', cw / 2, ch * 0.3);
    ctx.restore();

    ctx.font = 'bold ' + Math.min(cw * 0.15, 60) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
    ctx.fillText(Math.floor(this.scoreCountUp), cw / 2, ch * 0.43);

    if (isNewHigh && this.scoreCountUp >= displayScore) {
        var pulse = 1 + Math.sin(this.blinkPhase * 2) * 0.1;
        ctx.save();
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 10;
        ctx.font = 'bold ' + Math.min(cw * 0.055, 22) * pulse + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255, 215, 0, ' + alpha + ')';
        ctx.fillText('NEW BEST!', cw / 2, ch * 0.535);
        ctx.restore();
    } else {
        ctx.font = Math.min(cw * 0.04, 16) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255, 215, 0, ' + (alpha * 0.7) + ')';
        ctx.fillText('BEST: ' + highScore, cw / 2, ch * 0.535);
    }

    if (this.gameOverAlpha >= 0.8) {
        var blinkAlpha = (Math.sin(this.blinkPhase) + 1) / 2 * 0.6 + 0.3;
        ctx.font = 'bold ' + Math.min(cw * 0.05, 20) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255, 255, 255, ' + blinkAlpha + ')';
        ctx.fillText('TAP TO RESTART', cw / 2, ch * 0.68);
    }
};

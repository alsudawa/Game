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
    this.achievementToast = null;
    this.achievementToastTimer = 0;
    this.xpResult = null;
    this.progressionRef = null;
};

SB.UI.prototype.update = function(dt, state, powerupEffects, comboCount, comboTimer) {
    this.blinkPhase += 2.5 * dt;
    this.powerupEffectsRef = powerupEffects || null;

    if (state === 'start') {
        this.idleBallPhase += 3 * dt;
        this.idleBallY = Math.sin(this.idleBallPhase) * 20;
    }

    // Combo popups
    for (var i = this.comboPopups.length - 1; i >= 0; i--) {
        var p = this.comboPopups[i];
        p.timer += dt;
        p.y -= 40 * dt;
        if (p.timer > 1.0) this.comboPopups.splice(i, 1);
    }

    if (comboCount >= 2 && comboTimer > 1.9) {
        this.comboPopups.push({
            text: comboCount + 'x COMBO!',
            x: SB.canvasWidth / 2,
            y: SB.canvasHeight * 0.35,
            timer: 0
        });
    }

    // Achievement toast
    if (this.achievementToast) {
        this.achievementToastTimer += dt;
        if (this.achievementToastTimer > 3.0) {
            this.achievementToast = null;
        }
    }
};

SB.UI.prototype.showAchievementToast = function(ach) {
    this.achievementToast = ach;
    this.achievementToastTimer = 0;
};

SB.UI.prototype.drawAchievementToast = function(ctx, cw, ch) {
    if (!this.achievementToast) return;
    var t = this.achievementToastTimer;
    var alpha = t < 0.3 ? t / 0.3 : (t > 2.5 ? 1 - (t - 2.5) / 0.5 : 1);
    if (alpha <= 0) return;

    var w = Math.min(cw * 0.8, 280);
    var h = 50;
    var x = cw / 2 - w / 2;
    var y = ch * 0.12;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    this._roundRect(ctx, x, y, w, h, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,215,0,0.6)';
    ctx.lineWidth = 1.5;
    this._roundRect(ctx, x, y, w, h, 12);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = Math.min(cw * 0.05, 20) + 'px ' + this.font;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(this.achievementToast.icon + ' ' + this.achievementToast.name, x + 14, y + h / 2 - 8);

    ctx.font = Math.min(cw * 0.03, 12) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255,215,0,0.9)';
    ctx.fillText(this.achievementToast.desc, x + 14, y + h / 2 + 12);

    ctx.restore();
};

SB.UI.prototype.drawStartScreen = function(ctx, cw, ch, highScore, progression, achievements, skinManager) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title
    ctx.save();
    ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.font = 'bold ' + Math.min(cw * 0.12, 52) + 'px ' + this.font;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('SKY BOUNCE', cw / 2, ch * 0.12);
    ctx.restore();

    // Level & XP bar
    if (progression) {
        var lvlY = ch * 0.19;
        ctx.font = 'bold ' + Math.min(cw * 0.035, 14) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText('Lv.' + progression.level, cw / 2, lvlY);

        var xpInfo = progression.getXPForCurrentLevel();
        var barW = Math.min(cw * 0.5, 180);
        var barH = 6;
        var barX = cw / 2 - barW / 2;
        var barY = lvlY + 12;
        var progress = xpInfo.current / xpInfo.required;

        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = 'rgba(255,215,0,0.7)';
        ctx.fillRect(barX, barY, barW * progress, barH);

        ctx.font = Math.min(cw * 0.025, 10) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText(xpInfo.current + ' / ' + xpInfo.required + ' XP', cw / 2, barY + barH + 10);
    }

    // Subtitle
    ctx.font = Math.min(cw * 0.032, 13) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillText('Tap left/right to steer the ball', cw / 2, ch * 0.28);

    // Idle ball with current skin
    var currentSkin = skinManager ? skinManager.getCurrentSkin() : SB.SKINS[0];
    var ballY = ch * 0.37 + this.idleBallY;
    ctx.save();
    ctx.shadowColor = currentSkin.glow;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(cw / 2, ballY, 18, 0, SB.TAU);
    var gradient = ctx.createRadialGradient(cw / 2 - 5, ballY - 5, 2, cw / 2, ballY, 18);
    gradient.addColorStop(0, currentSkin.core);
    gradient.addColorStop(1, currentSkin.glow);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();

    // Skin selector
    if (skinManager && progression) {
        this._drawSkinSelector(ctx, cw, ch * 0.47, skinManager, progression.level);
    }

    // Powerup legend
    var legendY = ch * 0.56;
    var iconSize = Math.min(cw * 0.02, 8);
    ctx.font = Math.min(cw * 0.025, 10) + 'px ' + this.font;
    var legends = [
        { color: '#5DADE2', label: 'Shield: Block 1 hit' },
        { color: '#AF7AC5', label: 'Magnet: Pull stars' },
        { color: '#58D68D', label: 'Slow: Slow enemies' }
    ];
    for (var i = 0; i < legends.length; i++) {
        var ly = legendY + i * 18;
        ctx.beginPath();
        ctx.arc(cw / 2 - 70, ly, iconSize, 0, SB.TAU);
        ctx.fillStyle = legends[i].color;
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.textAlign = 'left';
        ctx.fillText(legends[i].label, cw / 2 - 55, ly + 1);
    }
    ctx.textAlign = 'center';

    // Achievements count
    if (achievements) {
        var achCount = achievements.getUnlockedCount();
        ctx.font = Math.min(cw * 0.03, 12) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,215,0,0.5)';
        ctx.fillText(achCount + '/' + SB.ACHIEVEMENTS.length + ' Achievements', cw / 2, ch * 0.66);
    }

    // Tap to start
    var blinkAlpha = (Math.sin(this.blinkPhase) + 1) / 2 * 0.7 + 0.3;
    ctx.font = 'bold ' + Math.min(cw * 0.06, 24) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255, 255, 255, ' + blinkAlpha + ')';
    ctx.fillText('TAP TO START', cw / 2, ch * 0.76);

    if (highScore > 0) {
        ctx.font = Math.min(cw * 0.045, 18) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
        ctx.fillText('BEST: ' + highScore, cw / 2, ch * 0.85);
    }
};

SB.UI.prototype._drawSkinSelector = function(ctx, cw, y, skinManager, playerLevel) {
    var skins = skinManager.getAvailableSkins(playerLevel);
    var spacing = 42;
    var totalW = (skins.length - 1) * spacing;
    var startX = cw / 2 - totalW / 2;
    var btnR = 16;

    SB._skinBtns = [];

    for (var i = 0; i < skins.length; i++) {
        var info = skins[i];
        var skin = info.skin;
        var x = startX + i * spacing;

        SB._skinBtns.push({
            x: x,
            y: y,
            r: btnR + 6,
            skinId: skin.id,
            unlocked: info.unlocked
        });

        ctx.save();

        if (!info.unlocked) {
            ctx.globalAlpha = 0.3;
        }

        // Circle with skin glow color
        var r = info.selected ? btnR + 2 : btnR - 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, SB.TAU);
        var grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
        grad.addColorStop(0, skin.core);
        grad.addColorStop(1, skin.glow);
        ctx.fillStyle = grad;
        ctx.fill();

        // Border
        if (info.selected) {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 8;
        } else {
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 1;
        }
        ctx.stroke();

        ctx.restore();

        // Lock icon or level requirement
        if (!info.unlocked) {
            ctx.font = Math.min(cw * 0.02, 8) + 'px ' + this.font;
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Lv.' + skin.unlockLevel, x, y + btnR + 10);
        }
    }

    // Label
    ctx.font = Math.min(cw * 0.022, 9) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SKINS', cw / 2, y - btnR - 8);
};

SB.UI.prototype.drawTutorial = function(ctx, cw, ch) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, cw, ch);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Left arrow
    ctx.font = 'bold ' + Math.min(cw * 0.08, 32) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('\u2190', cw * 0.2, ch * 0.5);
    ctx.font = Math.min(cw * 0.035, 14) + 'px ' + this.font;
    ctx.fillText('Tap left', cw * 0.2, ch * 0.5 + 30);

    // Right arrow
    ctx.font = 'bold ' + Math.min(cw * 0.08, 32) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('\u2192', cw * 0.8, ch * 0.5);
    ctx.font = Math.min(cw * 0.035, 14) + 'px ' + this.font;
    ctx.fillText('Tap right', cw * 0.8, ch * 0.5 + 30);

    // Center instruction
    ctx.font = 'bold ' + Math.min(cw * 0.05, 20) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText('Tap anywhere to bounce!', cw / 2, ch * 0.3);

    var blinkAlpha = (Math.sin(this.blinkPhase * 2) + 1) / 2 * 0.5 + 0.5;
    ctx.font = Math.min(cw * 0.035, 14) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255,215,0,' + blinkAlpha + ')';
    ctx.fillText('Tap to continue', cw / 2, ch * 0.7);

    ctx.restore();
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

    this._drawPowerupBar(ctx, cw, ch);
};

SB.UI.prototype._drawPowerupBar = function(ctx, cw, ch) {
    if (!this.powerupEffectsRef) return;
    var effects = this.powerupEffectsRef;
    var barY = ch - 45;
    var items = [];

    if (effects.shield) items.push({ color: '#5DADE2', label: 'SHIELD', timer: effects.shieldTimer, max: effects.shieldDuration });
    if (effects.magnet) items.push({ color: '#AF7AC5', label: 'MAGNET', timer: effects.magnetTimer, max: effects.magnetDuration });
    if (effects.slow) items.push({ color: '#58D68D', label: 'SLOW', timer: effects.slowTimer, max: effects.slowDuration });

    if (items.length === 0) return;

    var totalW = items.length * 80;
    var startX = cw / 2 - totalW / 2;

    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var x = startX + i * 80;
        var progress = item.timer / item.max;

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x, barY, 70, 8);
        ctx.fillStyle = item.color;
        ctx.fillRect(x, barY, 70 * progress, 8);
        ctx.font = Math.min(cw * 0.025, 10) + 'px ' + this.font;
        ctx.fillStyle = item.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(item.label, x + 35, barY - 2);
    }
};

SB.UI.prototype.resetGameOver = function(finalScore, xpResult, progression) {
    this.gameOverAlpha = 0;
    this.scoreCountUp = 0;
    this._finalScore = finalScore;
    this.comboPopups = [];
    this.xpResult = xpResult;
    this.progressionRef = progression;
};

SB.UI.prototype.drawGameOver = function(ctx, cw, ch, score, highScore, isNewHigh) {
    this.gameOverAlpha = Math.min(this.gameOverAlpha + 0.05, 1);
    var displayScore = Math.floor(score);

    if (this.scoreCountUp < displayScore) {
        this.scoreCountUp += Math.max(1, Math.floor(displayScore / 60));
        if (this.scoreCountUp > displayScore) this.scoreCountUp = displayScore;
    }

    ctx.fillStyle = 'rgba(0, 0, 0, ' + (this.gameOverAlpha * 0.7) + ')';
    ctx.fillRect(0, 0, cw, ch);

    var alpha = this.gameOverAlpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // GAME OVER
    ctx.save();
    ctx.shadowColor = 'rgba(231, 76, 60, 0.5)';
    ctx.shadowBlur = 15;
    ctx.font = 'bold ' + Math.min(cw * 0.1, 42) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
    ctx.fillText('GAME OVER', cw / 2, ch * 0.18);
    ctx.restore();

    // Score
    ctx.font = 'bold ' + Math.min(cw * 0.15, 60) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
    ctx.fillText(Math.floor(this.scoreCountUp), cw / 2, ch * 0.29);

    // New best or best
    if (isNewHigh && this.scoreCountUp >= displayScore) {
        var pulse = 1 + Math.sin(this.blinkPhase * 2) * 0.1;
        ctx.save();
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 10;
        ctx.font = 'bold ' + Math.min(cw * 0.055, 22) * pulse + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255, 215, 0, ' + alpha + ')';
        ctx.fillText('NEW BEST!', cw / 2, ch * 0.37);
        ctx.restore();
    } else {
        ctx.font = Math.min(cw * 0.04, 16) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255, 215, 0, ' + (alpha * 0.7) + ')';
        ctx.fillText('BEST: ' + highScore, cw / 2, ch * 0.37);
    }

    // XP earned + level
    if (this.xpResult && this.progressionRef) {
        var xpY = ch * 0.44;
        ctx.font = Math.min(cw * 0.035, 14) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.6) + ')';
        ctx.fillText('+' + this.xpResult.xpEarned + ' XP   |   Lv.' + this.progressionRef.level, cw / 2, xpY);

        if (this.xpResult.leveledUp) {
            ctx.save();
            ctx.shadowColor = '#76FF03';
            ctx.shadowBlur = 8;
            ctx.font = 'bold ' + Math.min(cw * 0.04, 16) + 'px ' + this.font;
            ctx.fillStyle = 'rgba(118, 255, 3, ' + alpha + ')';
            ctx.fillText('LEVEL UP!', cw / 2, xpY + 22);
            ctx.restore();
        }

        // XP bar
        var xpInfo = this.progressionRef.getXPForCurrentLevel();
        var barW = Math.min(cw * 0.5, 180);
        var barH = 5;
        var barX = cw / 2 - barW / 2;
        var barYPos = xpY + (this.xpResult.leveledUp ? 38 : 16);
        var progress = xpInfo.current / xpInfo.required;

        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(barX, barYPos, barW, barH);
        ctx.fillStyle = 'rgba(255,215,0,0.7)';
        ctx.fillRect(barX, barYPos, barW * progress, barH);
    }

    if (this.gameOverAlpha >= 0.8) {
        // Share button
        var btnW = Math.min(cw * 0.45, 180);
        var btnH = 40;
        var btnX = cw / 2 - btnW / 2;
        var btnY = ch * 0.58;

        ctx.fillStyle = 'rgba(52, 152, 219, ' + alpha * 0.9 + ')';
        this._roundRect(ctx, btnX, btnY, btnW, btnH, 10);
        ctx.fill();

        ctx.font = 'bold ' + Math.min(cw * 0.04, 16) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
        ctx.fillText('SHARE SCORE', cw / 2, btnY + btnH / 2);

        SB._shareBtn = { x: btnX, y: btnY, w: btnW, h: btnH, score: displayScore };

        // Tap to restart
        var blinkAlpha = (Math.sin(this.blinkPhase) + 1) / 2 * 0.6 + 0.3;
        ctx.font = 'bold ' + Math.min(cw * 0.05, 20) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255, 255, 255, ' + blinkAlpha + ')';
        ctx.fillText('TAP TO RESTART', cw / 2, ch * 0.72);
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

SB.shareScore = function(score) {
    var text = 'I scored ' + score + ' in Sky Bounce! Can you beat me?';
    var url = window.location.href;

    if (navigator.share) {
        navigator.share({ title: 'Sky Bounce', text: text, url: url }).catch(function() {});
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text + ' ' + url).catch(function() {});
    }
};

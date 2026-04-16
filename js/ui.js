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
    this.lockMsg = '';
    this.lockMsgTimer = 0;
    this.zoneMsg = '';
    this.zoneMsgTimer = 0;
    this.nearMissTimer = 0;
    this.scorePopups = [];
};

SB.UI.prototype.update = function(dt, state, powerupEffects, comboCount, comboTimer) {
    this.blinkPhase += 2.5 * dt;
    this.powerupEffectsRef = powerupEffects || null;

    if (state === 'start') {
        this.idleBallPhase += 3 * dt;
        this.idleBallY = Math.sin(this.idleBallPhase) * 20;
    }

    // Combo popups (swap-and-pop to avoid splice in hot loop)
    var writeIdx = 0;
    for (var i = 0; i < this.comboPopups.length; i++) {
        var p = this.comboPopups[i];
        p.timer += dt;
        p.y -= 40 * dt;
        if (p.timer <= 1.0) {
            this.comboPopups[writeIdx++] = p;
        }
    }
    this.comboPopups.length = writeIdx;

    if (comboCount >= 2 && comboTimer > 1.9 && this.comboPopups.length < 6) {
        this.comboPopups.push({
            text: comboCount + 'x COMBO!',
            x: SB.canvasWidth / 2,
            y: SB.canvasHeight * 0.35,
            timer: 0
        });
    }

    if (this.lockMsgTimer > 0) this.lockMsgTimer -= dt;
    if (this.zoneMsgTimer > 0) this.zoneMsgTimer -= dt;
    if (this.nearMissTimer > 0) this.nearMissTimer -= dt;

    // Score popups
    var spWi = 0;
    for (var si = 0; si < this.scorePopups.length; si++) {
        var sp = this.scorePopups[si];
        sp.timer += dt;
        sp.y -= 50 * dt;
        if (sp.timer <= 0.8) this.scorePopups[spWi++] = sp;
    }
    this.scorePopups.length = spWi;

    // Achievement toast
    if (this.achievementToast) {
        this.achievementToastTimer += dt;
        if (this.achievementToastTimer > 3.0) {
            this.achievementToast = null;
        }
    }
};

SB.UI.prototype.addScorePopup = function(x, y, text, color) {
    if (this.scorePopups.length < 8) {
        this.scorePopups.push({ x: x, y: y, text: text, color: color || '#FFD700', timer: 0 });
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

SB.UI.prototype.drawStartScreen = function(ctx, cw, ch, highScore, progression, achievements, skinManager, daily) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title
    ctx.save();
    ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.font = 'bold ' + Math.min(cw * 0.12, 52) + 'px ' + this.font;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('SKY BOUNCE', cw / 2, ch * 0.08);
    ctx.restore();

    // Level & XP bar + Coins
    if (progression) {
        var lvlY = ch * 0.15;
        ctx.font = 'bold ' + Math.min(cw * 0.035, 14) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText('Lv.' + progression.level, cw / 2 - 40, lvlY);

        // Coin display
        var coins = SB.Storage.getCoins();
        ctx.fillStyle = 'rgba(255,215,0,0.7)';
        ctx.fillText(coins + ' coins', cw / 2 + 40, lvlY);

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
    }

    // Daily Challenge box
    if (daily) {
        this._drawDailyChallenge(ctx, cw, ch * 0.23, daily);
    }

    // Idle ball with current skin
    var currentSkin = skinManager ? skinManager.getCurrentSkin() : SB.SKINS[0];
    var ballY = ch * 0.34 + this.idleBallY;
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
        this._drawSkinSelector(ctx, cw, ch * 0.44, skinManager, progression.level);
    }

    // Locked skin message
    if (this.lockMsgTimer > 0) {
        var lAlpha = Math.min(this.lockMsgTimer, 1);
        ctx.font = Math.min(cw * 0.03, 12) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,100,100,' + lAlpha.toFixed(2) + ')';
        ctx.fillText(this.lockMsg, cw / 2, ch * 0.49);
    }

    // Achievements button (tappable)
    if (achievements) {
        var achY = ch * 0.54;
        var achCount = achievements.getUnlockedCount();
        var achText = achCount + '/' + SB.ACHIEVEMENTS.length + ' Achievements';
        ctx.font = Math.min(cw * 0.032, 13) + 'px ' + this.font;
        var tw = ctx.measureText(achText).width;
        var achW = tw + 24;
        var achH = 26;
        var achX = cw / 2 - achW / 2;

        ctx.fillStyle = 'rgba(255,215,0,0.1)';
        this._roundRect(ctx, achX, achY - achH / 2, achW, achH, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,215,0,0.3)';
        ctx.lineWidth = 1;
        this._roundRect(ctx, achX, achY - achH / 2, achW, achH, 8);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,215,0,0.7)';
        ctx.fillText(achText, cw / 2, achY);

        SB._achBtn = { x: achX, y: achY - achH / 2, w: achW, h: achH };
    }

    // Tap to start
    var blinkAlpha = (Math.sin(this.blinkPhase) + 1) / 2 * 0.7 + 0.3;
    ctx.font = 'bold ' + Math.min(cw * 0.06, 24) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255, 255, 255, ' + blinkAlpha + ')';
    ctx.fillText('TAP TO START', cw / 2, ch * 0.65);

    if (highScore > 0) {
        ctx.font = Math.min(cw * 0.045, 18) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
        ctx.fillText('BEST: ' + highScore, cw / 2, ch * 0.74);
    }

    // Mute button (top-right corner)
    var muteSize = Math.min(cw * 0.06, 24);
    var muteX = cw - muteSize - 10;
    var muteY = 10;
    var isMuted = SB.audio.muted;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = muteSize + 'px ' + this.font;
    ctx.fillStyle = isMuted ? 'rgba(255,100,100,0.7)' : 'rgba(255,255,255,0.5)';
    ctx.fillText(isMuted ? 'MUTE' : 'SND', muteX + muteSize / 2, muteY + muteSize / 2);
    ctx.restore();
    SB._muteBtn = { x: muteX, y: muteY, w: muteSize + 4, h: muteSize + 4 };
};

SB.UI.prototype._drawDailyChallenge = function(ctx, cw, y, daily) {
    var boxW = Math.min(cw * 0.75, 260);
    var boxH = 44;
    var boxX = cw / 2 - boxW / 2;
    var boxY = y - boxH / 2;

    // Background
    ctx.fillStyle = daily.completed ? 'rgba(46,204,113,0.12)' : 'rgba(255,255,255,0.06)';
    this._roundRect(ctx, boxX, boxY, boxW, boxH, 10);
    ctx.fill();
    ctx.strokeStyle = daily.completed ? 'rgba(46,204,113,0.4)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    this._roundRect(ctx, boxX, boxY, boxW, boxH, 10);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Label
    ctx.font = Math.min(cw * 0.022, 9) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('DAILY CHALLENGE', boxX + 10, boxY + 12);

    // Challenge name + desc
    ctx.font = 'bold ' + Math.min(cw * 0.03, 12) + 'px ' + this.font;
    ctx.fillStyle = daily.completed ? 'rgba(46,204,113,0.9)' : 'rgba(255,255,255,0.8)';
    ctx.fillText(daily.challenge.name + ': ' + daily.challenge.desc, boxX + 10, boxY + 28);

    // Target / status
    ctx.textAlign = 'right';
    ctx.font = 'bold ' + Math.min(cw * 0.028, 11) + 'px ' + this.font;
    if (daily.completed) {
        ctx.fillStyle = 'rgba(46,204,113,0.9)';
        ctx.fillText('DONE', boxX + boxW - 10, boxY + 20);
    } else {
        ctx.fillStyle = 'rgba(255,215,0,0.7)';
        ctx.fillText('Goal: ' + daily.challenge.target, boxX + boxW - 10, boxY + 20);
    }

    ctx.textAlign = 'center';
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
            unlocked: info.unlocked,
            unlockLevel: skin.unlockLevel
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

SB.UI.prototype.drawTutorial = function(ctx, cw, ch, tutorialStep) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, cw, ch);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var step = tutorialStep || 0;
    var fontSize = Math.min(cw * 0.045, 18);
    var smallFont = Math.min(cw * 0.032, 13);

    if (step === 0) {
        // Step 1: Tap to bounce + directional control
        ctx.font = 'bold ' + Math.min(cw * 0.055, 22) + 'px ' + this.font;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('Tap anywhere to bounce!', cw / 2, ch * 0.25);

        ctx.font = 'bold ' + Math.min(cw * 0.07, 28) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText('\u2190', cw * 0.2, ch * 0.45);
        ctx.fillText('\u2192', cw * 0.8, ch * 0.45);

        ctx.font = fontSize + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText('Tap left side', cw * 0.2, ch * 0.45 + 28);
        ctx.fillText('Tap right side', cw * 0.8, ch * 0.45 + 28);

        ctx.font = smallFont + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText('Steer the ball left or right', cw / 2, ch * 0.58);
    } else if (step === 1) {
        // Step 2: Obstacles
        ctx.font = 'bold ' + Math.min(cw * 0.055, 22) + 'px ' + this.font;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('Avoid obstacles!', cw / 2, ch * 0.25);

        ctx.font = fontSize + 'px ' + this.font;
        ctx.fillStyle = 'rgba(231,76,60,0.8)';
        ctx.fillText('Platforms, spikes, blades', cw / 2, ch * 0.38);

        ctx.font = smallFont + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('They get faster as your score grows', cw / 2, ch * 0.48);

        // Draw mini obstacle icons
        ctx.fillStyle = '#CC4444';
        ctx.fillRect(cw * 0.25, ch * 0.55, 50, 8); // platform
        // spike triangle
        ctx.beginPath();
        ctx.moveTo(cw * 0.5 - 10, ch * 0.56);
        ctx.lineTo(cw * 0.5, ch * 0.55 - 12);
        ctx.lineTo(cw * 0.5 + 10, ch * 0.56);
        ctx.closePath();
        ctx.fill();
        // blade circle
        ctx.beginPath();
        ctx.arc(cw * 0.72, ch * 0.55, 10, 0, SB.TAU);
        ctx.stroke();
    } else if (step === 2) {
        // Step 3: Stars + powerups
        ctx.font = 'bold ' + Math.min(cw * 0.055, 22) + 'px ' + this.font;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('Collect stars & powerups!', cw / 2, ch * 0.25);

        ctx.font = fontSize + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,215,0,0.8)';
        ctx.fillText('Stars = +5 points + 1 coin', cw / 2, ch * 0.38);

        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText('Combo: collect 2+ in 2 seconds!', cw / 2, ch * 0.46);

        // Powerup colors
        ctx.font = smallFont + 'px ' + this.font;
        ctx.fillStyle = '#5DADE2';
        ctx.fillText('Shield - absorb one hit', cw / 2, ch * 0.56);
        ctx.fillStyle = '#AF7AC5';
        ctx.fillText('Magnet - attract stars', cw / 2, ch * 0.62);
        ctx.fillStyle = '#58D68D';
        ctx.fillText('Slow - slow obstacles', cw / 2, ch * 0.68);
    }

    // Step indicator
    ctx.font = smallFont + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    var dots = '';
    for (var i = 0; i < 3; i++) dots += (i === step ? ' \u25CF ' : ' \u25CB ');
    ctx.fillText(dots, cw / 2, ch * 0.82);

    // Continue hint
    var blinkAlpha = (Math.sin(this.blinkPhase * 2) + 1) / 2 * 0.5 + 0.5;
    ctx.font = smallFont + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255,215,0,' + blinkAlpha + ')';
    ctx.fillText('Tap to continue', cw / 2, ch * 0.88);

    ctx.restore();
};

SB.UI.prototype.drawHUD = function(ctx, cw, ch, score, zone) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold ' + Math.min(cw * 0.1, 40) + 'px ' + this.font;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillText(Math.floor(score), cw / 2 + 2, 22);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(Math.floor(score), cw / 2, 20);

    // Zone message popup
    if (this.zoneMsgTimer > 0) {
        var zA = Math.min(this.zoneMsgTimer, 1);
        var zScale = 1 + (2 - this.zoneMsgTimer) * 0.05;
        ctx.save();
        ctx.globalAlpha = zA;
        ctx.font = 'bold ' + Math.floor(Math.min(cw * 0.06, 24) * zScale) + 'px ' + this.font;
        var zoneColors = { CALM: '#5DADE2', RISING: '#F39C12', INTENSE: '#E74C3C', EXTREME: '#9B59B6' };
        ctx.fillStyle = zoneColors[this.zoneMsg] || '#FFFFFF';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 12;
        ctx.fillText(this.zoneMsg + ' ZONE', cw / 2, ch * 0.12);
        ctx.restore();
    }

    // Coin counter + PB in HUD (top-right)
    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.font = 'bold ' + Math.min(cw * 0.03, 12) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255,215,0,0.75)';
    ctx.fillText(SB.Storage.getCoins() + ' coins', cw - 12, 10);
    var hs = SB.Storage.getHighScore();
    if (hs > 0) {
        ctx.fillStyle = score >= hs ? 'rgba(46,204,113,0.6)' : 'rgba(255,255,255,0.3)';
        ctx.fillText('PB: ' + hs, cw - 12, 26);
    }
    ctx.restore();

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

    // Score popups
    for (var si = 0; si < this.scorePopups.length; si++) {
        var sp = this.scorePopups[si];
        var spAlpha = 1 - sp.timer / 0.8;
        ctx.save();
        ctx.globalAlpha = spAlpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold ' + Math.min(cw * 0.035, 14) + 'px ' + this.font;
        ctx.fillStyle = sp.color;
        ctx.fillText(sp.text, sp.x, sp.y);
        ctx.restore();
    }

    // Pause button (top-left, 44pt touch target)
    var pauseR = 18;
    var pauseCx = 28;
    var pauseCy = 28;
    ctx.save();
    ctx.beginPath();
    ctx.arc(pauseCx, pauseCy, pauseR, 0, SB.TAU);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.min(cw * 0.04, 16) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('||', pauseCx, pauseCy);
    ctx.restore();
    SB._pauseBtn = { x: 0, y: 0, w: 56, h: 56 };

    // Near-miss feedback
    if (this.nearMissTimer > 0) {
        var nmAlpha = this.nearMissTimer / 0.6;
        var nmScale = 1 + (0.6 - this.nearMissTimer) * 0.5;
        ctx.save();
        ctx.globalAlpha = nmAlpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold ' + Math.floor(Math.min(cw * 0.04, 16) * nmScale) + 'px ' + this.font;
        ctx.fillStyle = '#F39C12';
        ctx.shadowColor = '#F39C12';
        ctx.shadowBlur = 8;
        ctx.fillText('CLOSE! +2', cw / 2, ch * 0.22);
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

SB.UI.prototype.resetGameOver = function(finalScore, xpResult, progression, dailyJustCompleted, runStats, streak, recentRuns) {
    this.gameOverAlpha = 0;
    this.scoreCountUp = 0;
    this._finalScore = finalScore;
    this.comboPopups = [];
    this.xpResult = xpResult;
    this.progressionRef = progression;
    this.dailyJustCompleted = dailyJustCompleted || false;
    this.rank = SB.Storage.getRank(finalScore);
    this.runStats = runStats || { time: 0, stars: 0, maxCombo: 0 };
    this.streak = streak || { current: 0, best: 0 };
    this.recentRuns = recentRuns || [];
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

    // Run stats
    if (this.runStats) {
        ctx.font = Math.min(cw * 0.028, 11) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.45) + ')';
        var statsText = Math.floor(this.runStats.time) + 's  |  ' + this.runStats.stars + ' stars  |  +' + (this.runStats.coins || 0) + ' coins';
        if (this.runStats.maxCombo >= 2) statsText += '  |  ' + this.runStats.maxCombo + 'x combo';
        ctx.fillText(statsText, cw / 2, ch * 0.40);
    }

    // Rank
    if (this.rank && this.rank <= 10) {
        ctx.font = Math.min(cw * 0.035, 14) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.5) + ')';
        ctx.fillText('#' + this.rank + ' on leaderboard', cw / 2, ch * 0.41);
    }

    // Streak display
    if (this.streak && this.streak.current >= 2) {
        ctx.font = 'bold ' + Math.min(cw * 0.03, 12) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,150,50,' + (alpha * 0.8) + ')';
        var streakText = 'Day ' + this.streak.current + ' streak!';
        if (this.streak.current >= this.streak.best && this.streak.current >= 3) {
            streakText += ' (Best!)';
        }
        ctx.fillText(streakText, cw / 2, ch * 0.435);
    }

    // Recent runs mini chart
    if (this.recentRuns && this.recentRuns.length >= 2) {
        var chartY = ch * 0.465;
        var chartW = Math.min(cw * 0.35, 130);
        var chartH = 22;
        var chartX = cw / 2 - chartW / 2;
        var maxRun = 1;
        for (var ri = 0; ri < this.recentRuns.length; ri++) {
            if (this.recentRuns[ri] > maxRun) maxRun = this.recentRuns[ri];
        }
        var barGap = 3;
        var barW = (chartW - (this.recentRuns.length - 1) * barGap) / this.recentRuns.length;

        ctx.font = Math.min(cw * 0.02, 8) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.3) + ')';
        ctx.fillText('Recent runs', cw / 2, chartY - 6);

        for (var rj = 0; rj < this.recentRuns.length; rj++) {
            var bx = chartX + rj * (barW + barGap);
            var bh = Math.max(2, (this.recentRuns[rj] / maxRun) * chartH);
            var by = chartY + chartH - bh;
            var isLast = (rj === this.recentRuns.length - 1);
            ctx.fillStyle = isLast ? 'rgba(255,215,0,' + (alpha * 0.7) + ')' : 'rgba(255,255,255,' + (alpha * 0.25) + ')';
            this._roundRect(ctx, bx, by, barW, bh, 2);
            ctx.fill();
        }
    }

    // XP earned + level
    if (this.xpResult && this.progressionRef) {
        var xpY = ch * 0.50;
        var xpText = '+' + this.xpResult.xpEarned + ' XP';
        if (this.dailyJustCompleted) xpText += '  +25 Daily';
        ctx.font = Math.min(cw * 0.035, 14) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.6) + ')';
        ctx.fillText(xpText + '   |   Lv.' + this.progressionRef.level, cw / 2, xpY);

        if (this.xpResult.leveledUp) {
            ctx.save();
            ctx.shadowColor = '#76FF03';
            ctx.shadowBlur = 8;
            ctx.font = 'bold ' + Math.min(cw * 0.04, 16) + 'px ' + this.font;
            ctx.fillStyle = 'rgba(118, 255, 3, ' + alpha + ')';
            ctx.fillText('LEVEL UP!', cw / 2, xpY + 22);
            ctx.restore();
        }

        if (this.dailyJustCompleted) {
            ctx.save();
            ctx.shadowColor = '#2ecc71';
            ctx.shadowBlur = 8;
            ctx.font = 'bold ' + Math.min(cw * 0.035, 14) + 'px ' + this.font;
            ctx.fillStyle = 'rgba(46, 204, 113, ' + alpha + ')';
            ctx.fillText('DAILY CHALLENGE COMPLETE!', cw / 2, xpY + (this.xpResult.leveledUp ? 42 : 22));
            ctx.restore();
        }

        // XP bar
        var xpInfo = this.progressionRef.getXPForCurrentLevel();
        var barW = Math.min(cw * 0.5, 180);
        var barH = 5;
        var barX = cw / 2 - barW / 2;
        var barYPos = xpY + (this.xpResult.leveledUp ? 56 : (this.dailyJustCompleted ? 38 : 16));
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
        var btnY = ch * 0.64;

        ctx.fillStyle = 'rgba(52, 152, 219, ' + alpha * 0.9 + ')';
        this._roundRect(ctx, btnX, btnY, btnW, btnH, 10);
        ctx.fill();

        ctx.font = 'bold ' + Math.min(cw * 0.04, 16) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
        ctx.fillText('SHARE SCORE', cw / 2, btnY + btnH / 2);

        SB._shareBtn = { x: btnX, y: btnY, w: btnW, h: btnH, score: displayScore };

        // Play Again button
        var playBtnY = ch * 0.72;
        ctx.fillStyle = 'rgba(46, 204, 113, ' + alpha * 0.85 + ')';
        this._roundRect(ctx, btnX, playBtnY, btnW, btnH, 10);
        ctx.fill();

        ctx.font = 'bold ' + Math.min(cw * 0.04, 16) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
        ctx.fillText('PLAY AGAIN', cw / 2, playBtnY + btnH / 2);

        SB._playAgainBtn = { x: btnX, y: playBtnY, w: btnW, h: btnH };
    }
};

SB.UI.prototype.drawPauseScreen = function(ctx, cw, ch) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, cw, ch);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold ' + Math.min(cw * 0.1, 40) + 'px ' + this.font;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('PAUSED', cw / 2, ch * 0.3);

    // Resume button
    var btnW = Math.min(cw * 0.5, 180);
    var btnH = 44;
    var resumeY = ch * 0.48;
    var resumeX = cw / 2 - btnW / 2;

    ctx.fillStyle = 'rgba(46, 204, 113, 0.85)';
    this._roundRect(ctx, resumeX, resumeY, btnW, btnH, 10);
    ctx.fill();
    ctx.font = 'bold ' + Math.min(cw * 0.045, 18) + 'px ' + this.font;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('RESUME', cw / 2, resumeY + btnH / 2);

    SB._resumeBtn = { x: resumeX, y: resumeY, w: btnW, h: btnH };

    // Quit button
    var quitY = ch * 0.58;
    ctx.fillStyle = 'rgba(231, 76, 60, 0.7)';
    this._roundRect(ctx, resumeX, quitY, btnW, btnH, 10);
    ctx.fill();
    ctx.font = 'bold ' + Math.min(cw * 0.045, 18) + 'px ' + this.font;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('QUIT', cw / 2, quitY + btnH / 2);

    SB._quitBtn = { x: resumeX, y: quitY, w: btnW, h: btnH };
};

SB.UI.prototype.drawRevivePrompt = function(ctx, cw, ch, countdown, coins, cost) {
    // Darken background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, cw, ch);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Heading
    ctx.font = 'bold ' + Math.min(cw * 0.06, 24) + 'px ' + this.font;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Continue your run?', cw / 2, ch * 0.2);

    // Countdown circle
    var countY = ch * 0.33;
    var countR = Math.min(cw * 0.1, 42);
    var countNum = Math.ceil(countdown);

    // Background ring
    ctx.beginPath();
    ctx.arc(cw / 2, countY, countR, 0, SB.TAU);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 5;
    ctx.stroke();

    // Countdown arc
    var progress = countdown / 3.0;
    ctx.beginPath();
    ctx.arc(cw / 2, countY, countR, -Math.PI / 2, -Math.PI / 2 + SB.TAU * progress);
    ctx.strokeStyle = '#E74C3C';
    ctx.lineWidth = 5;
    ctx.stroke();

    // Number
    ctx.font = 'bold ' + Math.min(cw * 0.1, 40) + 'px ' + this.font;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(countNum, cw / 2, countY);

    // Revive button (includes countdown in text)
    var btnW = Math.min(cw * 0.65, 240);
    var btnH = 50;
    var btnX = cw / 2 - btnW / 2;
    var btnY = ch * 0.48;

    var canAfford = coins >= cost;
    ctx.fillStyle = canAfford ? 'rgba(46, 204, 113, 0.9)' : 'rgba(100, 100, 100, 0.6)';
    this._roundRect(ctx, btnX, btnY, btnW, btnH, 12);
    ctx.fill();

    if (canAfford) {
        ctx.strokeStyle = 'rgba(46, 204, 113, 0.4)';
        ctx.lineWidth = 2;
        this._roundRect(ctx, btnX, btnY, btnW, btnH, 12);
        ctx.stroke();
    }

    ctx.font = 'bold ' + Math.min(cw * 0.042, 17) + 'px ' + this.font;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('REVIVE (' + cost + ' coins) - ' + countNum + 's', cw / 2, btnY + btnH / 2);

    // Current coins
    ctx.font = Math.min(cw * 0.032, 13) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255,215,0,0.7)';
    ctx.fillText('You have ' + coins + ' coins', cw / 2, btnY + btnH + 18);

    // Store button bounds for tap detection
    SB._reviveBtn = { x: btnX, y: btnY, w: btnW, h: btnH };

    // Skip text — visible immediately
    var blinkAlpha = (Math.sin(this.blinkPhase * 2) + 1) / 2 * 0.3 + 0.2;
    ctx.font = Math.min(cw * 0.028, 11) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255,255,255,' + blinkAlpha + ')';
    ctx.fillText('Tap elsewhere to skip', cw / 2, ch * 0.68);
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

SB.UI.prototype.drawAchievementViewer = function(ctx, cw, ch, achievements) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(0, 0, cw, ch);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title
    ctx.font = 'bold ' + Math.min(cw * 0.07, 28) + 'px ' + this.font;
    ctx.fillStyle = '#FFD700';
    ctx.fillText('ACHIEVEMENTS', cw / 2, ch * 0.06);

    var count = achievements.getUnlockedCount();
    ctx.font = Math.min(cw * 0.03, 12) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(count + ' / ' + SB.ACHIEVEMENTS.length + ' unlocked', cw / 2, ch * 0.10);

    // Achievement list
    var startY = ch * 0.14;
    var rowH = Math.min(ch * 0.05, 32);
    var listW = Math.min(cw * 0.85, 300);
    var listX = cw / 2 - listW / 2;

    for (var i = 0; i < SB.ACHIEVEMENTS.length; i++) {
        var ach = SB.ACHIEVEMENTS[i];
        var unlocked = achievements.unlocked[ach.id];
        var rowY = startY + i * rowH;

        if (rowY + rowH > ch * 0.90) break;

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        var alpha = unlocked ? 1 : 0.35;
        ctx.globalAlpha = alpha;

        // Icon
        ctx.font = Math.min(cw * 0.04, 16) + 'px ' + this.font;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(ach.icon, listX, rowY + rowH / 2);

        // Name
        ctx.font = 'bold ' + Math.min(cw * 0.03, 12) + 'px ' + this.font;
        ctx.fillStyle = unlocked ? '#FFD700' : '#888888';
        ctx.fillText(ach.name, listX + 28, rowY + rowH / 2 - 6);

        // Desc
        ctx.font = Math.min(cw * 0.025, 10) + 'px ' + this.font;
        ctx.fillStyle = unlocked ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)';
        ctx.fillText(ach.desc, listX + 28, rowY + rowH / 2 + 8);

        // Checkmark or progress bar
        if (unlocked) {
            ctx.textAlign = 'right';
            ctx.font = Math.min(cw * 0.035, 14) + 'px ' + this.font;
            ctx.fillStyle = '#2ecc71';
            ctx.fillText('\u2713', listX + listW, rowY + rowH / 2);
        } else {
            var prog = achievements.getProgress(ach);
            if (prog && prog.target > 1) {
                var barW = Math.min(listW * 0.2, 50);
                var barH = 4;
                var barX = listX + listW - barW;
                var barY = rowY + rowH / 2 - barH / 2;
                var pct = prog.current / prog.target;
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(barX, barY, barW, barH);
                ctx.fillStyle = 'rgba(255,215,0,0.5)';
                ctx.fillRect(barX, barY, barW * pct, barH);
                ctx.textAlign = 'right';
                ctx.font = Math.min(cw * 0.02, 8) + 'px ' + this.font;
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.fillText(prog.current + '/' + prog.target, barX - 4, rowY + rowH / 2);
            }
        }

        ctx.globalAlpha = 1;
    }

    // Close hint
    ctx.textAlign = 'center';
    var blinkAlpha = (Math.sin(this.blinkPhase) + 1) / 2 * 0.4 + 0.3;
    ctx.font = Math.min(cw * 0.035, 14) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255,255,255,' + blinkAlpha + ')';
    ctx.fillText('Tap to close', cw / 2, ch * 0.95);

    ctx.restore();
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

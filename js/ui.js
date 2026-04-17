window.SB = window.SB || {};

SB.UI = function() {
    this.idleBallY = 0;
    this.idleBallPhase = 0;
    this.blinkPhase = 0;
    // Ambient sparkles for start screen
    this._sparkles = [];
    for (var si = 0; si < 12; si++) {
        this._sparkles.push({
            x: Math.random(),
            y: Math.random(),
            speed: 0.02 + Math.random() * 0.04,
            size: 1 + Math.random() * 2,
            phase: Math.random() * Math.PI * 2
        });
    }
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
    this.zoneWipeTimer = 0;
    this.zoneWipeColor = '93,173,226';
    this.milestoneMsg = '';
    this.milestoneMsgTimer = 0;
    this.nearMissTimer = 0;
    this.nearMissStreak = 0;
    this.scorePopups = [];
    this.pickupRings = [];
    this.tapRipples = [];
    this.displayScore = 0;
    this.coinBump = 0;
    this._tips = [
        'Tap left or right to steer',
        'Double-tap for a power bounce!',
        'Collect stars for combo bonus',
        'Near-misses give bonus points',
        'Shield absorbs one hit',
        'Magnet attracts nearby stars',
        'Slow-mo slows all obstacles',
        'Coins give 2x coin value',
        'Higher zones = harder + more points',
        'Revive costs 20 coins'
    ];
    this._tipIndex = Math.floor(Math.random() * this._tips.length);
    this._tipTimer = 0;
};

SB.UI.prototype.update = function(dt, state, powerupEffects, comboCount, comboTimer) {
    this.blinkPhase += 2.5 * dt;
    this.powerupEffectsRef = powerupEffects || null;

    if (state === 'start') {
        this.idleBallPhase += 3 * dt;
        this.idleBallY = -Math.abs(Math.sin(this.idleBallPhase)) * 20;
        this._tipTimer += dt;
        if (this._tipTimer >= 4.0) {
            this._tipTimer = 0;
            this._tipIndex = (this._tipIndex + 1) % this._tips.length;
        }
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
        var comboColor = comboCount >= 7 ? '#FF0044' : (comboCount >= 5 ? '#FF4444' : (comboCount >= 3 ? '#FF8C42' : '#FFD700'));
        var comboSize = comboCount >= 7 ? 1.6 : (comboCount >= 5 ? 1.4 : (comboCount >= 3 ? 1.2 : 1.0));
        this.comboPopups.push({
            text: comboCount + 'x COMBO!',
            x: SB.canvasWidth / 2,
            y: SB.canvasHeight * 0.35,
            timer: 0,
            color: comboColor,
            sizeScale: comboSize
        });
    }

    if (this.lockMsgTimer > 0) this.lockMsgTimer -= dt;
    if (this.zoneMsgTimer > 0) this.zoneMsgTimer -= dt;
    if (this.zoneWipeTimer > 0) this.zoneWipeTimer -= dt;
    if (this.milestoneMsgTimer > 0) this.milestoneMsgTimer -= dt;
    if (this.nearMissTimer > 0) this.nearMissTimer -= dt;
    if (this.coinBump > 0) this.coinBump -= dt;

    // Score popups
    var spWi = 0;
    for (var si = 0; si < this.scorePopups.length; si++) {
        var sp = this.scorePopups[si];
        sp.timer += dt;
        sp.y -= 50 * dt;
        sp.x += (sp.drift || 0) * dt;
        if (sp.timer <= 0.8) this.scorePopups[spWi++] = sp;
    }
    this.scorePopups.length = spWi;

    // Pickup rings
    var prWi = 0;
    for (var pi = 0; pi < this.pickupRings.length; pi++) {
        var pr = this.pickupRings[pi];
        pr.timer += dt;
        if (pr.timer <= pr.duration) this.pickupRings[prWi++] = pr;
    }
    this.pickupRings.length = prWi;

    // Tap ripples
    var trWi = 0;
    for (var tri = 0; tri < this.tapRipples.length; tri++) {
        var tr = this.tapRipples[tri];
        tr.timer += dt;
        if (tr.timer <= tr.duration) this.tapRipples[trWi++] = tr;
    }
    this.tapRipples.length = trWi;

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
        for (var pi = 0; pi < this.scorePopups.length; pi++) {
            if (Math.abs(this.scorePopups[pi].y - y) < 18) y -= 18;
        }
        var drift = (x - SB.canvasWidth / 2) / SB.canvasWidth * 40;
        this.scorePopups.push({ x: x, y: y, text: text, color: color || '#FFD700', timer: 0, drift: drift });
    }
};

SB.UI.prototype.addTapRipple = function(x, y) {
    if (this.tapRipples.length < 4) {
        this.tapRipples.push({ x: x, y: y, timer: 0, duration: 0.4 });
    }
};

SB.UI.prototype.addPickupRing = function(x, y, color) {
    if (this.pickupRings.length < 6) {
        this.pickupRings.push({ x: x, y: y, color: color || '255,215,0', timer: 0, duration: 0.35 });
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
    // Ambient sparkles drifting upward
    ctx.save();
    for (var si = 0; si < this._sparkles.length; si++) {
        var sp = this._sparkles[si];
        sp.y -= sp.speed * 0.016;
        sp.phase += 0.03;
        if (sp.y < -0.05) { sp.y = 1.05; sp.x = Math.random(); }
        var spAlpha = (Math.sin(sp.phase) + 1) / 2 * 0.4 + 0.1;
        ctx.beginPath();
        ctx.arc(sp.x * cw, sp.y * ch, sp.size, 0, SB.TAU);
        ctx.fillStyle = 'rgba(255,215,0,' + spAlpha.toFixed(2) + ')';
        ctx.fill();
    }
    ctx.restore();

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

    // Idle ball with current skin + breathing glow
    var currentSkin = skinManager ? skinManager.getCurrentSkin() : SB.SKINS[0];
    var ballY = ch * 0.34 + this.idleBallY;
    var breathe = Math.sin(this.blinkPhase * 0.8) * 0.5 + 0.5;
    ctx.save();
    ctx.shadowColor = currentSkin.glow;
    ctx.shadowBlur = 18 + breathe * 15;
    var breatheSize = 18 + Math.sin(this.blinkPhase * 1.2) * 1.5;
    ctx.beginPath();
    ctx.arc(cw / 2, ballY, breatheSize, 0, SB.TAU);
    var gradient = ctx.createRadialGradient(cw / 2 - 5, ballY - 5, 2, cw / 2, ballY, breatheSize);
    gradient.addColorStop(0, currentSkin.core);
    gradient.addColorStop(1, currentSkin.glow);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
    // Outer glow ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(cw / 2, ballY, 22 + breathe * 4, 0, SB.TAU);
    ctx.strokeStyle = 'rgba(' + SB.hexToRGB(currentSkin.glow) + ',' + (breathe * 0.2).toFixed(2) + ')';
    ctx.lineWidth = 1.5;
    ctx.stroke();
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

    // Rotating tips
    var tipAlpha = this._tipTimer < 0.3 ? this._tipTimer / 0.3 : (this._tipTimer > 3.5 ? (4.0 - this._tipTimer) / 0.5 : 1);
    ctx.font = Math.min(cw * 0.025, 10) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255,255,255,' + (tipAlpha * 0.4).toFixed(2) + ')';
    ctx.fillText(this._tips[this._tipIndex], cw / 2, ch * 0.70);

    if (highScore > 0) {
        ctx.font = Math.min(cw * 0.045, 18) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
        ctx.fillText('BEST: ' + SB.formatNum(highScore), cw / 2, ch * 0.74);
    }

    // Last run summary
    var lastRun = SB.Storage.getLastRun();
    if (lastRun) {
        ctx.font = Math.min(cw * 0.025, 10) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillText('Last: ' + lastRun.score + ' pts  |  ' + lastRun.stars + ' stars  |  ' + lastRun.time + 's', cw / 2, ch * 0.79);
    }

    // Lifetime stats
    var lifetime = SB.Storage.getLifetimeStats();
    if (lifetime.totalGames > 0) {
        var streak = SB.Storage.getStreak();
        ctx.font = Math.min(cw * 0.02, 8) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        var ltText = lifetime.totalGames + ' games  |  ' + lifetime.totalScore + ' total pts';
        if (streak.best >= 2) ltText += '  |  ' + streak.best + ' day best streak';
        ctx.fillText(ltText, cw / 2, ch * 0.84);
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

    // High contrast toggle (top-right, below mute)
    var hcY = muteY + muteSize + 8;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = Math.min(cw * 0.03, 12) + 'px ' + this.font;
    ctx.fillStyle = SB.highContrast ? 'rgba(46,204,113,0.7)' : 'rgba(255,255,255,0.3)';
    ctx.fillText('HC', muteX + muteSize / 2, hcY + muteSize / 2);
    ctx.restore();
    SB._hcBtn = { x: muteX, y: hcY, w: muteSize + 4, h: muteSize + 4 };
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
        ctx.fillText('Stars = +5 pts + 1 coin', cw / 2, ch * 0.36);

        ctx.fillStyle = 'rgba(255,180,0,0.8)';
        ctx.fillText('Moving coins = +3 pts + 2 coins', cw / 2, ch * 0.42);

        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText('Combo: collect 2+ in 2 seconds!', cw / 2, ch * 0.48);

        // Powerup colors
        ctx.font = smallFont + 'px ' + this.font;
        ctx.fillStyle = '#5DADE2';
        ctx.fillText('Shield - absorb one hit', cw / 2, ch * 0.54);
        ctx.fillStyle = '#AF7AC5';
        ctx.fillText('Magnet - attract stars', cw / 2, ch * 0.59);
        ctx.fillStyle = '#58D68D';
        ctx.fillText('Slow - slow obstacles', cw / 2, ch * 0.64);
        ctx.fillStyle = '#FFD54F';
        ctx.fillText('x2 - double score', cw / 2, ch * 0.69);
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

SB.UI.prototype.drawHUD = function(ctx, cw, ch, score, zone, cachedCoins, cachedHighScore, comboTimer, comboCount, difficulty, ballY, scoreShake) {
    // Smooth score counter (lerp toward actual)
    if (this.displayScore < score) {
        var diff = score - this.displayScore;
        this.displayScore += Math.max(1, Math.ceil(diff * 0.15));
        if (this.displayScore > score) this.displayScore = score;
    } else {
        this.displayScore = score;
    }

    // Adaptive opacity: fade HUD when ball is near top
    var hudAlpha = 1;
    if (typeof ballY === 'number' && ballY < ch * 0.15) {
        hudAlpha = 0.3 + (ballY / (ch * 0.15)) * 0.7;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold ' + Math.min(cw * 0.1, 40) + 'px ' + this.font;

    var scoreText = SB.formatNum(Math.floor(this.displayScore));
    var ssOx = 0, ssOy = 0;
    if (scoreShake > 0) {
        var ssFrac = scoreShake / 0.2;
        ssOx = Math.sin(scoreShake * 80) * ssFrac * 4;
        ssOy = Math.cos(scoreShake * 60) * ssFrac * 2;
    }
    ctx.fillStyle = 'rgba(0, 0, 0, ' + (0.2 * hudAlpha).toFixed(2) + ')';
    ctx.fillText(scoreText, cw / 2 + 2 + ssOx, 22 + ssOy);
    ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.85 * hudAlpha).toFixed(2) + ')';
    ctx.fillText(scoreText, cw / 2 + ssOx, 20 + ssOy);

    // Score multiplier badge with countdown
    if (this.powerupEffectsRef && this.powerupEffectsRef.scoreMult) {
        var smPulse = 0.8 + Math.sin((SB.frameTime || 0) * 0.006) * 0.2;
        var smSec = Math.ceil(this.powerupEffectsRef.scoreMultTimer);
        // Flash faster in last 2 seconds
        if (smSec <= 2) smPulse = 0.5 + Math.sin((SB.frameTime || 0) * 0.015) * 0.5;
        ctx.save();
        ctx.font = 'bold ' + Math.min(cw * 0.04, 16) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,213,79,' + smPulse.toFixed(2) + ')';
        ctx.shadowColor = '#FFD54F';
        ctx.shadowBlur = 8;
        var scoreW = ctx.measureText(scoreText).width;
        ctx.fillText('x2 ' + smSec + 's', cw / 2 + scoreW / 2 + 18, 28);
        ctx.restore();
    }

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

    // Zone transition wipe
    if (this.zoneWipeTimer > 0 && !SB.reducedMotion) {
        var wFrac = 1 - this.zoneWipeTimer / 0.5;
        var wAlpha = wFrac < 0.5 ? wFrac * 2 * 0.15 : (1 - wFrac) * 2 * 0.15;
        var wX = wFrac * cw * 1.4 - cw * 0.2;
        var wW = cw * 0.3;
        var wGrad = ctx.createLinearGradient(wX, 0, wX + wW, 0);
        wGrad.addColorStop(0, 'rgba(' + this.zoneWipeColor + ',0)');
        wGrad.addColorStop(0.5, 'rgba(' + this.zoneWipeColor + ',' + wAlpha.toFixed(3) + ')');
        wGrad.addColorStop(1, 'rgba(' + this.zoneWipeColor + ',0)');
        ctx.fillStyle = wGrad;
        ctx.fillRect(wX, 0, wW, ch);
    }

    // Milestone popup (below zone message area)
    if (this.milestoneMsgTimer > 0) {
        var mA = Math.min(this.milestoneMsgTimer, 1);
        var mScale = 1 + (1.5 - this.milestoneMsgTimer) * 0.08;
        ctx.save();
        ctx.globalAlpha = mA;
        ctx.font = 'bold ' + Math.floor(Math.min(cw * 0.07, 28) * mScale) + 'px ' + this.font;
        ctx.fillStyle = '#FFD700';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 15;
        ctx.fillText(this.milestoneMsg, cw / 2, ch * 0.16);
        ctx.restore();
    }

    // Coin counter + PB in HUD (top-right)
    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    var coinScale = this.coinBump > 0 ? 1 + this.coinBump / 0.2 * 0.3 : 1;
    ctx.font = 'bold ' + Math.min(cw * 0.03 * coinScale, 12 * coinScale) + 'px ' + this.font;
    ctx.fillStyle = this.coinBump > 0 ? 'rgba(255,215,0,1)' : 'rgba(255,215,0,0.75)';
    ctx.fillText((cachedCoins || 0) + ' coins', cw - 12, 10);
    if (cachedHighScore > 0) {
        ctx.fillStyle = score >= cachedHighScore ? 'rgba(46,204,113,0.6)' : 'rgba(255,255,255,0.3)';
        ctx.fillText('PB: ' + cachedHighScore, cw - 12, 26);
    }
    ctx.restore();

    // Bounce counter + speed gauge (bottom-left)
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.font = Math.min(cw * 0.025, 10) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255,255,255,' + (0.25 * hudAlpha).toFixed(2) + ')';
    ctx.fillText((this.runBounces || 0) + ' bounces', 10, ch - 10);
    // Speed gauge bar
    var sgW = 40, sgH = 3, sgX = 10, sgY = ch - 22;
    var sgFrac = this.ballSpeedFrac || 0;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(sgX, sgY, sgW, sgH);
    var sgColor = sgFrac > 0.7 ? '231,76,60' : (sgFrac > 0.4 ? '243,156,18' : '93,173,226');
    ctx.fillStyle = 'rgba(' + sgColor + ',' + (0.4 * hudAlpha).toFixed(2) + ')';
    ctx.fillRect(sgX, sgY, sgW * sgFrac, sgH);
    ctx.restore();

    // Combo popups (escalating visual intensity)
    for (var i = 0; i < this.comboPopups.length; i++) {
        var p = this.comboPopups[i];
        var alpha = 1 - p.timer;
        var baseSize = 18 * (p.sizeScale || 1);
        var scale = 1 + p.timer * 0.3;
        // Burst effect on spawn: quick scale-up then settle
        if (p.timer < 0.08) scale = 1 + (p.timer / 0.08) * 0.5;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold ' + Math.floor(baseSize * scale) + 'px ' + this.font;
        ctx.fillStyle = p.color || '#FFD700';
        ctx.shadowColor = p.color || 'rgba(255, 215, 0, 0.5)';
        ctx.shadowBlur = 8 + (p.sizeScale || 1) * 4;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.text, p.x, p.y);
        ctx.restore();
    }

    // Score popups
    for (var si = 0; si < this.scorePopups.length; si++) {
        var sp = this.scorePopups[si];
        var spAlpha = 1 - sp.timer / 0.8;
        // Scale: burst up then settle (1.0 → 1.4 → 1.0)
        var spScale = sp.timer < 0.1 ? 1 + (sp.timer / 0.1) * 0.4 : 1.4 - (sp.timer - 0.1) / 0.7 * 0.4;
        ctx.save();
        ctx.globalAlpha = spAlpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold ' + Math.floor(Math.min(cw * 0.035, 14) * spScale) + 'px ' + this.font;
        ctx.fillStyle = sp.color;
        ctx.shadowColor = sp.color;
        ctx.shadowBlur = 4;
        ctx.fillText(sp.text, sp.x, sp.y);
        ctx.restore();
    }

    // Pickup rings (expanding circle on collect)
    for (var ri = 0; ri < this.pickupRings.length; ri++) {
        var ring = this.pickupRings[ri];
        var rProgress = ring.timer / ring.duration;
        var rRadius = 10 + rProgress * 35;
        var rAlpha = (1 - rProgress) * 0.5;
        ctx.save();
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, rRadius, 0, SB.TAU);
        ctx.strokeStyle = 'rgba(' + ring.color + ',' + rAlpha.toFixed(2) + ')';
        ctx.lineWidth = 2 * (1 - rProgress);
        ctx.stroke();
        ctx.restore();
    }

    // Tap ripples (expanding rings at tap position)
    for (var tri = 0; tri < this.tapRipples.length; tri++) {
        var tap = this.tapRipples[tri];
        var tProgress = tap.timer / tap.duration;
        var tRadius = 8 + tProgress * 40;
        var tAlpha = (1 - tProgress) * 0.3;
        ctx.save();
        ctx.beginPath();
        ctx.arc(tap.x, tap.y, tRadius, 0, SB.TAU);
        ctx.strokeStyle = 'rgba(255,255,255,' + tAlpha.toFixed(2) + ')';
        ctx.lineWidth = 1.5 * (1 - tProgress);
        ctx.stroke();
        if (tProgress < 0.15) {
            ctx.beginPath();
            ctx.arc(tap.x, tap.y, 3 * (1 - tProgress / 0.15), 0, SB.TAU);
            ctx.fillStyle = 'rgba(255,255,255,' + (0.4 * (1 - tProgress / 0.15)).toFixed(2) + ')';
            ctx.fill();
        }
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

    // Near-miss feedback (shows streak if applicable)
    if (this.nearMissTimer > 0) {
        var nmAlpha = this.nearMissTimer / 0.6;
        var nmScale = 1 + (0.6 - this.nearMissTimer) * 0.5;
        ctx.save();
        ctx.globalAlpha = nmAlpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var nmFontSize = Math.min(cw * 0.04, 16);
        if (this.nearMissStreak >= 2) nmFontSize *= 1.2;
        ctx.font = 'bold ' + Math.floor(nmFontSize * nmScale) + 'px ' + this.font;
        ctx.fillStyle = this.nearMissStreak >= 3 ? '#E74C3C' : '#F39C12';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        var nmText = this.nearMissStreak >= 2 ? 'DAREDEVIL x' + this.nearMissStreak : 'CLOSE!';
        ctx.fillText(nmText, cw / 2, ch * 0.22);
        ctx.restore();
    }

    // Combo timer bar (thin bar under score showing remaining combo time)
    if (comboTimer > 0 && comboCount >= 1) {
        var ctBarW = Math.min(cw * 0.3, 120);
        var ctBarH = 3;
        var ctBarX = cw / 2 - ctBarW / 2;
        var ctBarY = 62;
        var ctProgress = comboTimer / 2.0;
        var ctColor = comboCount >= 5 ? '255,68,68' : (comboCount >= 3 ? '255,140,66' : '255,215,0');
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(ctBarX, ctBarY, ctBarW, ctBarH);
        ctx.fillStyle = 'rgba(' + ctColor + ',0.7)';
        ctx.fillRect(ctBarX, ctBarY, ctBarW * ctProgress, ctBarH);
    }

    // Difficulty progress bar (thin bar at very top of screen)
    if (typeof difficulty === 'number' && difficulty > 0) {
        var dpBarW = cw;
        var dpBarH = 2;
        var dpProgress = Math.min(difficulty, 1);
        var dpColor = difficulty < 0.3 ? '93,173,226' : (difficulty < 0.5 ? '243,156,18' : (difficulty < 0.8 ? '231,76,60' : '155,89,182'));
        ctx.fillStyle = 'rgba(' + dpColor + ',0.3)';
        ctx.fillRect(0, 0, dpBarW * dpProgress, dpBarH);
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
    if (effects.scoreMult) items.push({ color: '#FFD54F', label: 'x2 SCORE', timer: effects.scoreMultTimer, max: effects.scoreMultDuration });

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
        var secLeft = Math.ceil(item.timer);
        ctx.fillText(item.label + ' ' + secLeft + 's', x + 35, barY - 2);
    }
};

SB.UI.prototype.resetGameOver = function(finalScore, xpResult, progression, dailyJustCompleted, runStats, streak, recentRuns) {
    this.gameOverAlpha = 0;
    this.scoreCountUp = 0;
    this.displayScore = 0;
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
    // Secondary alpha for detail sections (staggered fade-in)
    var detailAlpha = Math.max(0, (this.gameOverAlpha - 0.4) / 0.6);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Flowing layout: use a Y cursor that adapts to content
    var gap = Math.min(ch * 0.025, 14);
    var compact = ch < 500;
    var y = ch * 0.10;

    // GAME OVER
    ctx.save();
    ctx.shadowColor = 'rgba(231, 76, 60, 0.5)';
    ctx.shadowBlur = 15;
    ctx.font = 'bold ' + Math.min(cw * 0.1, 42) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
    ctx.fillText('GAME OVER', cw / 2, y);
    ctx.restore();
    y += Math.min(cw * 0.1, 42) * 0.6 + gap;

    // Score
    var scoreFontSize = Math.min(cw * 0.15, 60);
    ctx.font = 'bold ' + scoreFontSize + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
    ctx.fillText(SB.formatNum(this.scoreCountUp), cw / 2, y);
    y += scoreFontSize * 0.5 + gap;

    // New best or best
    if (isNewHigh && this.scoreCountUp >= displayScore) {
        var pulse = 1 + Math.sin(this.blinkPhase * 2) * 0.1;
        ctx.save();
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 10;
        ctx.font = 'bold ' + Math.min(cw * 0.055, 22) * pulse + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255, 215, 0, ' + alpha + ')';
        ctx.fillText('NEW BEST!', cw / 2, y);
        ctx.restore();
    } else {
        ctx.font = Math.min(cw * 0.04, 16) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255, 215, 0, ' + (alpha * 0.7) + ')';
        ctx.fillText('BEST: ' + SB.formatNum(highScore), cw / 2, y);
    }
    y += gap + 4;

    // Run stats
    if (this.runStats) {
        // Death cause
        if (this.runStats.deathCause) {
            ctx.font = Math.min(cw * 0.025, 10) + 'px ' + this.font;
            ctx.fillStyle = 'rgba(231,76,60,' + (alpha * 0.5) + ')';
            ctx.fillText('Killed by: ' + this.runStats.deathCause, cw / 2, y);
            y += gap;
        }

        ctx.font = Math.min(cw * 0.028, 11) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.45) + ')';
        var statsText = Math.floor(this.runStats.time) + 's  |  ' + this.runStats.stars + ' stars  |  +' + (this.runStats.coins || 0) + ' coins';
        if (this.runStats.bounces) statsText += '  |  ' + this.runStats.bounces + ' bounces';
        if (this.runStats.maxCombo >= 2) statsText += '  |  ' + this.runStats.maxCombo + 'x combo';
        ctx.fillText(statsText, cw / 2, y);
        y += gap;

        // Zone reached
        if (this.runStats.zone && this.runStats.zone !== 'CALM') {
            var zoneColors = { RISING: '#F39C12', INTENSE: '#E74C3C', EXTREME: '#9B59B6' };
            ctx.font = Math.min(cw * 0.025, 10) + 'px ' + this.font;
            ctx.fillStyle = zoneColors[this.runStats.zone] || 'rgba(255,255,255,0.4)';
            ctx.fillText('Reached ' + this.runStats.zone + ' zone', cw / 2, y);
            y += gap;
        }
    }

    // Rank (inline, small)
    if (this.rank && this.rank <= 10) {
        ctx.font = Math.min(cw * 0.028, 11) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.4) + ')';
        ctx.fillText('#' + this.rank + ' on leaderboard', cw / 2, y);
        y += gap;
    }

    // Streak display (staggered fade-in)
    if (this.streak && this.streak.current >= 2 && detailAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = detailAlpha;
        ctx.font = 'bold ' + Math.min(cw * 0.03, 12) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,150,50,0.8)';
        var streakText = 'Day ' + this.streak.current + ' streak!';
        if (this.streak.current >= this.streak.best && this.streak.current >= 3) {
            streakText += ' (Best!)';
        }
        ctx.fillText(streakText, cw / 2, y);
        ctx.restore();
        y += gap;
    }

    // Recent runs mini chart (skip on very compact screens, staggered fade-in)
    if (!compact && this.recentRuns && this.recentRuns.length >= 2 && detailAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = detailAlpha;
        var chartW = Math.min(cw * 0.35, 130);
        var chartH = 20;
        var chartX = cw / 2 - chartW / 2;
        var maxRun = 1;
        for (var ri = 0; ri < this.recentRuns.length; ri++) {
            if (this.recentRuns[ri] > maxRun) maxRun = this.recentRuns[ri];
        }
        var barGap2 = 3;
        var barW2 = (chartW - (this.recentRuns.length - 1) * barGap2) / this.recentRuns.length;

        // Calculate average
        var runSum = 0;
        for (var ra = 0; ra < this.recentRuns.length; ra++) runSum += this.recentRuns[ra];
        var runAvg = Math.floor(runSum / this.recentRuns.length);

        ctx.font = Math.min(cw * 0.02, 8) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillText('Recent runs (avg ' + runAvg + ')', cw / 2, y);
        y += 8;

        for (var rj = 0; rj < this.recentRuns.length; rj++) {
            var bx = chartX + rj * (barW2 + barGap2);
            var bh = Math.max(2, (this.recentRuns[rj] / maxRun) * chartH);
            var by = y + chartH - bh;
            var isLast = (rj === this.recentRuns.length - 1);
            ctx.fillStyle = isLast ? 'rgba(255,215,0,0.7)' : 'rgba(255,255,255,0.25)';
            this._roundRect(ctx, bx, by, barW2, bh, 2);
            ctx.fill();
        }
        ctx.restore();
        y += chartH + gap;
    }

    // XP earned + level (staggered fade-in)
    if (this.xpResult && this.progressionRef && detailAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = detailAlpha;
        var xpText = '+' + this.xpResult.xpEarned + ' XP';
        if (this.dailyJustCompleted) xpText += '  +25 Daily';
        ctx.font = Math.min(cw * 0.032, 13) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(xpText + '   |   Lv.' + this.progressionRef.level, cw / 2, y);
        y += gap;

        if (this.xpResult.leveledUp) {
            ctx.save();
            ctx.shadowColor = '#76FF03';
            ctx.shadowBlur = 8;
            ctx.font = 'bold ' + Math.min(cw * 0.04, 16) + 'px ' + this.font;
            ctx.fillStyle = '#76FF03';
            ctx.fillText('LEVEL UP!', cw / 2, y);
            ctx.restore();
            y += gap + 4;

            // Skin unlock notification
            if (this.xpResult.unlockedSkin) {
                ctx.save();
                ctx.shadowColor = this.xpResult.unlockedSkin.glow;
                ctx.shadowBlur = 10;
                ctx.font = 'bold ' + Math.min(cw * 0.03, 12) + 'px ' + this.font;
                ctx.fillStyle = this.xpResult.unlockedSkin.glow;
                ctx.fillText('New skin: ' + this.xpResult.unlockedSkin.name + '!', cw / 2, y);
                ctx.restore();
                y += gap;
            }
        }

        if (this.dailyJustCompleted) {
            ctx.save();
            ctx.shadowColor = '#2ecc71';
            ctx.shadowBlur = 8;
            ctx.font = 'bold ' + Math.min(cw * 0.035, 14) + 'px ' + this.font;
            ctx.fillStyle = '#2ecc71';
            ctx.fillText('DAILY CHALLENGE COMPLETE!', cw / 2, y);
            ctx.restore();
            y += gap + 4;
        }

        // XP bar
        var xpInfo = this.progressionRef.getXPForCurrentLevel();
        var xpBarW = Math.min(cw * 0.5, 180);
        var xpBarH = 5;
        var xpBarX = cw / 2 - xpBarW / 2;
        var progress = xpInfo.current / xpInfo.required;

        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(xpBarX, y, xpBarW, xpBarH);
        ctx.fillStyle = 'rgba(255,215,0,0.7)';
        ctx.fillRect(xpBarX, y, xpBarW * progress, xpBarH);
        ctx.restore();
        y += xpBarH + gap;
    }

    if (this.gameOverAlpha >= 0.8) {
        // Buttons: place from bottom up to guarantee they're always visible
        var btnW = Math.min(cw * 0.45, 180);
        var btnH = 38;
        var btnX = cw / 2 - btnW / 2;
        var playBtnY = ch - btnH - Math.max(ch * 0.06, 20);
        var shareBtnY = playBtnY - btnH - 10;

        // Share button
        ctx.fillStyle = 'rgba(52, 152, 219, ' + alpha * 0.9 + ')';
        this._roundRect(ctx, btnX, shareBtnY, btnW, btnH, 10);
        ctx.fill();
        ctx.font = 'bold ' + Math.min(cw * 0.04, 16) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
        ctx.fillText('SHARE SCORE', cw / 2, shareBtnY + btnH / 2);
        SB._shareBtn = { x: btnX, y: shareBtnY, w: btnW, h: btnH, score: displayScore };

        // Play Again button
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

    if (!SB.reducedMotion) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        for (var sl = 0; sl < ch; sl += 4) {
            ctx.fillRect(0, sl, cw, 2);
        }
    }

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

    // Number with pulse
    var cpulse = 1 + (1 - (countdown % 1)) * 0.15;
    ctx.save();
    ctx.shadowColor = '#E74C3C';
    ctx.shadowBlur = 5 + (1 - (countdown % 1)) * 10;
    ctx.font = 'bold ' + Math.min(cw * 0.1, 40) * cpulse + 'px ' + this.font;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(countNum, cw / 2, countY);
    ctx.restore();

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

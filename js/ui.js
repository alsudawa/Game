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
    this.scoreFlash = 0;
    this.scoreSizePulse = 0;
    this.pauseFade = 0;
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
    this._dailyBarFill = 0;
    this.shareTapFlash = 0;
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
        if (this._dailyBarFill < 1) this._dailyBarFill = Math.min(1, this._dailyBarFill + dt * 1.2);
    } else {
        this._dailyBarFill = 0;
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

    // Chain lines
    if (this._chainLines) {
        var clWi = 0;
        for (var cli = 0; cli < this._chainLines.length; cli++) {
            var cl = this._chainLines[cli];
            cl.timer += dt;
            if (cl.timer <= cl.duration) this._chainLines[clWi++] = cl;
        }
        this._chainLines.length = clWi;
    }

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
        var drift = (x - SB.canvasWidth / 2) / SB.canvasWidth * 40 + (SB._ballVx || 0) * 0.3;
        var numMatch = text.match(/\d+/);
        var valScale = numMatch ? Math.min(parseInt(numMatch[0], 10) / 10, 1.5) : 1;
        var popScale = 1 + valScale * 0.2;
        this.scorePopups.push({ x: x, y: y, text: text, color: color || '#FFD700', timer: 0, drift: drift, sizeScale: popScale });
    }
};

SB.UI.prototype.addTapRipple = function(x, y, color) {
    if (this.tapRipples.length < 4) {
        this.tapRipples.push({ x: x, y: y, timer: 0, duration: 0.4, color: color || '255,255,255' });
    }
};

SB.UI.prototype.addChainLine = function(x1, y1, x2, y2, combo) {
    if (!this._chainLines) this._chainLines = [];
    if (this._chainLines.length < 4) {
        this._chainLines.push({ x1: x1, y1: y1, x2: x2, y2: y2, timer: 0, duration: 0.3, combo: combo || 1 });
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

    // Trophy icon (procedural)
    var tX = x + 22, tY = y + h / 2 - 4;
    var tS = Math.min(cw * 0.02, 8);
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(tX - tS, tY - tS);
    ctx.lineTo(tX + tS, tY - tS);
    ctx.lineTo(tX + tS * 0.7, tY + tS * 0.3);
    ctx.lineTo(tX - tS * 0.7, tY + tS * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(tX - tS * 0.2, tY + tS * 0.3, tS * 0.4, tS * 0.6);
    ctx.fillRect(tX - tS * 0.5, tY + tS * 0.85, tS, tS * 0.2);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = Math.min(cw * 0.05, 20) + 'px ' + this.font;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(this.achievementToast.icon + ' ' + this.achievementToast.name, x + 38, y + h / 2 - 8);

    ctx.font = Math.min(cw * 0.03, 12) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255,215,0,0.9)';
    ctx.fillText(this.achievementToast.desc, x + 38, y + h / 2 + 12);

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
    var titleFont = Math.min(cw * 0.12, 52);
    ctx.font = 'bold ' + titleFont + 'px ' + this.font;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('SKY BOUNCE', cw / 2, ch * 0.08);
    // Shimmer sweep
    if (!SB.reducedMotion) {
        var shimT = ((SB.frameTime || 0) * 0.0003) % 1;
        var shimX = cw * (shimT * 1.4 - 0.2);
        var shimW = cw * 0.15;
        var shimGrad = ctx.createLinearGradient(shimX, 0, shimX + shimW, 0);
        shimGrad.addColorStop(0, 'rgba(255,255,255,0)');
        shimGrad.addColorStop(0.5, 'rgba(255,255,255,0.15)');
        shimGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = shimGrad;
        ctx.fillRect(cw / 2 - titleFont * 3, ch * 0.08 - titleFont * 0.6, titleFont * 6, titleFont * 1.2);
        ctx.globalCompositeOperation = 'source-over';
    }
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
    // Ball drop shadow (scales with height from rest position)
    var shadowDist = Math.abs(this.idleBallY);
    var shadowScale = 0.6 + (1 - shadowDist / 20) * 0.4;
    var shadowAlpha = 0.05 + (1 - shadowDist / 20) * 0.1;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,' + shadowAlpha.toFixed(2) + ')';
    ctx.translate(cw / 2, ch * 0.34 + 22);
    ctx.scale(shadowScale, 0.3 * shadowScale);
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, SB.TAU);
    ctx.fill();
    ctx.restore();
    // Idle ball trail
    var glowRGB = SB.hexToRGB(currentSkin.glow);
    for (var bt = 3; bt >= 1; bt--) {
        var btY = ch * 0.34 + (-Math.abs(Math.sin(this.idleBallPhase - bt * 0.4)) * 20);
        var btAlpha = (1 - bt / 4) * 0.15;
        var btSize = 18 - bt * 2;
        ctx.beginPath();
        ctx.arc(cw / 2, btY, btSize, 0, SB.TAU);
        ctx.fillStyle = 'rgba(' + glowRGB + ',' + btAlpha.toFixed(2) + ')';
        ctx.fill();
    }
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
    // Outer glow rings
    ctx.save();
    var glowStr = SB.hexToRGB(currentSkin.glow);
    ctx.beginPath();
    ctx.arc(cw / 2, ballY, 22 + breathe * 4, 0, SB.TAU);
    ctx.strokeStyle = 'rgba(' + glowStr + ',' + (breathe * 0.2).toFixed(2) + ')';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cw / 2, ballY, 30 + breathe * 6, 0, SB.TAU);
    ctx.strokeStyle = 'rgba(' + glowStr + ',' + (breathe * 0.08).toFixed(2) + ')';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (!SB.reducedMotion) {
        var ssAngle = this.blinkPhase * 0.6;
        ctx.beginPath();
        ctx.arc(cw / 2, ballY, 25 + breathe * 5, ssAngle, ssAngle + 0.6);
        ctx.strokeStyle = 'rgba(255,255,255,' + (breathe * 0.25).toFixed(2) + ')';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
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

        // Achievement count badge
        if (achCount > 0) {
            var badgeX = achX + achW + 4;
            var badgeY = achY;
            var badgeR = 8;
            var badgePulse = (Math.sin(this.blinkPhase * 2) + 1) / 2;
            ctx.save();
            ctx.shadowColor = 'rgba(255,215,0,0.4)';
            ctx.shadowBlur = 4 + badgePulse * 4;
            ctx.beginPath();
            ctx.arc(badgeX, badgeY, badgeR, 0, SB.TAU);
            ctx.fillStyle = 'rgba(255,215,0,0.8)';
            ctx.fill();
            ctx.font = 'bold ' + Math.min(cw * 0.025, 10) + 'px ' + this.font;
            ctx.fillStyle = '#000';
            ctx.fillText('' + achCount, badgeX, badgeY + 0.5);
            ctx.restore();
        }

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
        ctx.save();
        ctx.font = Math.min(cw * 0.045, 18) + 'px ' + this.font;
        if (highScore >= 50) {
            ctx.shadowColor = 'rgba(255,215,0,0.5)';
            ctx.shadowBlur = 8 + (Math.sin(this.blinkPhase * 1.5) + 1) / 2 * 8;
        }
        ctx.fillStyle = highScore >= 50 ? 'rgba(255, 215, 0, 0.85)' : 'rgba(255, 215, 0, 0.7)';
        ctx.fillText('BEST: ' + SB.formatNum(highScore), cw / 2, ch * 0.74);
        // Procedural crown icon above best score
        var crY = ch * 0.74 - 14;
        var crW = ctx.measureText('BEST: ' + SB.formatNum(highScore)).width / 2 + 14;
        ctx.fillStyle = 'rgba(255,215,0,' + (0.3 + (Math.sin(this.blinkPhase * 1.5) + 1) / 2 * 0.2).toFixed(2) + ')';
        ctx.beginPath();
        var crX = cw / 2 - crW;
        ctx.moveTo(crX, crY); ctx.lineTo(crX + 3, crY - 6); ctx.lineTo(crX + 6, crY - 2);
        ctx.lineTo(crX + 9, crY - 7); ctx.lineTo(crX + 12, crY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // Sparkle dots flanking the score
        var hsSparkle = (Math.sin(this.blinkPhase * 2.5) + 1) / 2;
        var hsW = ctx.measureText('BEST: ' + SB.formatNum(highScore)).width / 2 + 8;
        ctx.fillStyle = 'rgba(255,215,0,' + (hsSparkle * 0.5).toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(cw / 2 - hsW, ch * 0.74, 1.5, 0, SB.TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cw / 2 + hsW, ch * 0.74, 1.5, 0, SB.TAU);
        ctx.fill();
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

    // Version text
    ctx.font = Math.min(cw * 0.018, 7) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.textAlign = 'center';
    ctx.fillText('Sky Bounce v1.0', cw / 2, ch * 0.97);
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

    // Progress bar at bottom of box
    if (!daily.completed && daily.challenge && daily.challenge.target > 0) {
        var pbW = boxW - 20;
        var pbH = 3;
        var pbX = boxX + 10;
        var pbY = boxY + boxH - 7;
        var pbFrac = Math.min((daily.bestAttempt || 0) / daily.challenge.target, 1);
        var pbAnim = pbFrac * this._dailyBarFill;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(pbX, pbY, pbW, pbH);
        ctx.fillStyle = 'rgba(255,215,0,' + (0.4 + pbAnim * 0.3).toFixed(2) + ')';
        ctx.fillRect(pbX, pbY, pbW * pbAnim, pbH);
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
            var selPulse = (Math.sin(this.blinkPhase * 2) + 1) / 2;
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = skin.glow;
            ctx.shadowBlur = 8 + selPulse * 8;
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

    // Step indicator dots (active dot glows)
    var dotSpacing = 18;
    var dotBaseX = cw / 2 - dotSpacing;
    var dotY = ch * 0.82;
    for (var di = 0; di < 3; di++) {
        var dotActive = di === step;
        var dotR = dotActive ? 4 : 2.5;
        ctx.beginPath();
        ctx.arc(dotBaseX + di * dotSpacing, dotY, dotR, 0, SB.TAU);
        if (dotActive) {
            ctx.fillStyle = 'rgba(255,215,0,0.9)';
            ctx.shadowColor = 'rgba(255,215,0,0.5)';
            ctx.shadowBlur = 6;
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.shadowBlur = 0;
        }
        ctx.fill();
    }
    ctx.shadowBlur = 0;

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

    if (this.scoreSizePulse > 0) this.scoreSizePulse = Math.max(0, this.scoreSizePulse - 0.016);
    var multActive = this.powerupEffectsRef && this.powerupEffectsRef.scoreMult ? 0.08 : 0;
    var scoreFontMult = 1 + this.scoreSizePulse * 0.15 + multActive;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold ' + Math.min(cw * 0.1, 40) * scoreFontMult + 'px ' + this.font;

    var scoreText = SB.formatNum(Math.floor(this.displayScore));
    var ssOx = 0, ssOy = 0;
    if (scoreShake > 0) {
        var ssFrac = scoreShake / 0.2;
        ssOx = Math.sin(scoreShake * 80) * ssFrac * 4;
        ssOy = Math.cos(scoreShake * 60) * ssFrac * 2;
    }
    ctx.fillStyle = 'rgba(0, 0, 0, ' + (0.2 * hudAlpha).toFixed(2) + ')';
    ctx.fillText(scoreText, cw / 2 + 2 + ssOx, 22 + ssOy);
    var zoneRGB = ({ CALM: '200,230,255', RISING: '255,200,100', INTENSE: '255,120,100', EXTREME: '200,130,255' })[this.currentZone] || '255,255,255';
    var scoreColor = 'rgba(' + zoneRGB + ',' + (0.85 * hudAlpha).toFixed(2) + ')';
    if (this.scoreFlash > 0) {
        var sfBlend = this.scoreFlash / 0.4;
        scoreColor = 'rgba(255, 215, 0, ' + (sfBlend * hudAlpha).toFixed(2) + ')';
        this.scoreFlash -= 0.016;
    }
    if (this.scoreFlash > 0) {
        ctx.save();
        ctx.shadowColor = 'rgba(255,215,0,0.4)';
        ctx.shadowBlur = this.scoreFlash / 0.4 * 10;
        ctx.fillStyle = scoreColor;
        ctx.fillText(scoreText, cw / 2 + ssOx, 20 + ssOy);
        ctx.restore();
    } else if (comboCount >= 3 && !SB.reducedMotion) {
        var swBaseX = cw / 2 + ssOx;
        var swBaseY = 20 + ssOy;
        ctx.save();
        ctx.textAlign = 'left';
        var swTotalW = ctx.measureText(scoreText).width;
        var swStartX = swBaseX - swTotalW / 2;
        ctx.fillStyle = scoreColor;
        for (var swi = 0; swi < scoreText.length; swi++) {
            var swOff = Math.sin((SB.frameTime || 0) * 0.006 + swi * 0.8) * 2;
            ctx.fillText(scoreText[swi], swStartX, swBaseY + swOff);
            swStartX += ctx.measureText(scoreText[swi]).width;
        }
        ctx.textAlign = 'center';
        ctx.restore();
    } else {
        ctx.fillStyle = scoreColor;
        ctx.fillText(scoreText, cw / 2 + ssOx, 20 + ssOy);
    }

    if (this.scoreSizePulse > 0.1 && !SB.reducedMotion) {
        var shimFrac = ((SB.frameTime || 0) * 0.002 + this.scoreSizePulse * 5) % 1;
        var shimW2 = cw * 0.12;
        var shimX2 = (cw / 2 - shimW2 * 2) + shimFrac * shimW2 * 4;
        var shimGrad2 = ctx.createLinearGradient(shimX2, 0, shimX2 + shimW2, 0);
        shimGrad2.addColorStop(0, 'rgba(255,215,0,0)');
        shimGrad2.addColorStop(0.5, 'rgba(255,215,0,' + (this.scoreSizePulse * 0.3).toFixed(2) + ')');
        shimGrad2.addColorStop(1, 'rgba(255,215,0,0)');
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = shimGrad2;
        ctx.fillRect(cw / 2 - cw * 0.2, 16 + ssOy, cw * 0.4, 36);
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();
    }

    if (zone && zone.name !== 'CALM') {
        var ulRGB = ({ RISING: '243,156,18', INTENSE: '231,76,60', EXTREME: '155,89,182' })[zone.name] || '255,255,255';
        var ulW = Math.min(ctx.measureText(scoreText).width + 10, cw * 0.3);
        var ulA = 0.25 * hudAlpha;
        ctx.fillStyle = 'rgba(' + ulRGB + ',' + ulA.toFixed(2) + ')';
        ctx.fillRect(cw / 2 - ulW / 2, 38 + ssOy, ulW, 1.5);
    }

    if (comboTimer > 0 && comboCount >= 1) {
        var ctFrac = comboTimer / 2.0;
        var ctR = Math.min(cw * 0.05, 20) + 20;
        var ctColor = comboCount >= 5 ? '255,68,68' : comboCount >= 3 ? '255,140,66' : '255,215,0';
        ctx.save();
        ctx.beginPath();
        ctx.arc(cw / 2, 30, ctR, -Math.PI / 2, -Math.PI / 2 + SB.TAU * ctFrac);
        ctx.strokeStyle = 'rgba(' + ctColor + ',' + (0.3 * hudAlpha * ctFrac).toFixed(2) + ')';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        var cbW = Math.min(cw * 0.3, 100);
        var cbH = 3;
        var cbX = (cw - cbW) / 2;
        var cbY = 38;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.08 * hudAlpha).toFixed(2) + ')';
        ctx.fillRect(cbX, cbY, cbW, cbH);
        ctx.fillStyle = 'rgba(' + ctColor + ',' + (0.5 * hudAlpha * ctFrac).toFixed(2) + ')';
        ctx.fillRect(cbX, cbY, cbW * ctFrac, cbH);
        if (comboCount >= 2) {
            ctx.save();
            var cmScale = comboCount >= 5 ? 1.3 : (comboCount >= 3 ? 1.15 : 1);
            ctx.font = 'bold ' + Math.min(cw * 0.025 * cmScale, 10 * cmScale) + 'px ' + this.font;
            if (comboCount >= 3) {
                ctx.shadowColor = 'rgba(' + ctColor + ',0.5)';
                ctx.shadowBlur = comboCount >= 5 ? 8 : 4;
            }
            ctx.fillStyle = 'rgba(' + ctColor + ',' + (0.6 * hudAlpha).toFixed(2) + ')';
            ctx.fillText(comboCount + 'x', cw / 2, 55 + ssOy);
            ctx.restore();
        }
    }

    if (cachedHighScore > 0 && score < cachedHighScore && score > cachedHighScore * 0.5) {
        var pbDiff = Math.ceil(cachedHighScore - score);
        var pbClose = pbDiff <= 5;
        ctx.save();
        ctx.font = (pbClose ? 'bold ' : '') + Math.min(cw * 0.025, 10) + 'px ' + this.font;
        if (pbClose) {
            var pbGlow = (Math.sin(this.blinkPhase * 4) + 1) / 2;
            ctx.shadowColor = 'rgba(255,215,0,0.6)';
            ctx.shadowBlur = 4 + pbGlow * 8;
        }
        ctx.fillStyle = 'rgba(255,215,0,' + ((pbClose ? 0.7 : 0.4) * hudAlpha).toFixed(2) + ')';
        ctx.fillText(pbDiff + ' to PB', cw / 2, 58);
        ctx.restore();
    } else if (score >= 5) {
        var nextMs = (Math.floor(score / 10) + 1) * 10;
        var msDiff = Math.ceil(nextMs - score);
        ctx.font = Math.min(cw * 0.02, 8) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.2 * hudAlpha).toFixed(2) + ')';
        ctx.fillText('next ' + nextMs + ' in ' + msDiff, cw / 2, 58);
    }

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
        var smX = cw / 2 + scoreW / 2 + 18;
        ctx.fillText('x2 ' + smSec + 's', smX, 28);
        // Timer arc around badge
        var smFrac = this.powerupEffectsRef.scoreMultTimer / (this.powerupEffectsRef.scoreMultDuration || 8);
        ctx.beginPath();
        ctx.arc(smX, 28, 12, -Math.PI / 2, -Math.PI / 2 + SB.TAU * smFrac);
        ctx.strokeStyle = 'rgba(255,213,79,' + (smPulse * 0.4).toFixed(2) + ')';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }

    // Active powerup HUD icons (top-left corner)
    if (this.powerupEffectsRef) {
        var puIcons = [];
        var ppe = this.powerupEffectsRef;
        if (ppe.shield) puIcons.push({ frac: ppe.shieldTimer / (ppe.shieldDuration || 10), c: '52,152,219', label: 'S' });
        if (ppe.magnet) puIcons.push({ frac: ppe.magnetTimer / (ppe.magnetDuration || 8), c: '155,89,182', label: 'M' });
        if (ppe.slow) puIcons.push({ frac: ppe.slowTimer / (ppe.slowDuration || 6), c: '46,204,113', label: 'T' });
        for (var pi = 0; pi < puIcons.length; pi++) {
            var px = 22 + pi * 28;
            var py = 22;
            var pir = 10;
            ctx.save();
            ctx.beginPath();
            ctx.arc(px, py, pir, 0, SB.TAU);
            ctx.fillStyle = 'rgba(' + puIcons[pi].c + ',' + (0.2 * hudAlpha).toFixed(2) + ')';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(px, py, pir, -Math.PI / 2, -Math.PI / 2 + SB.TAU * puIcons[pi].frac);
            ctx.strokeStyle = 'rgba(' + puIcons[pi].c + ',' + (0.6 * hudAlpha).toFixed(2) + ')';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.font = 'bold 9px ' + this.font;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * hudAlpha).toFixed(2) + ')';
            ctx.fillText(puIcons[pi].label, px, py);
            ctx.restore();
        }
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

    // Zone name pill (top-left)
    if (zone && zone.name && zone.name !== 'CALM') {
        var znColors = { RISING: '243,156,18', INTENSE: '231,76,60', EXTREME: '155,89,182' };
        var znC = znColors[zone.name] || '255,255,255';
        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = Math.min(cw * 0.02, 8) + 'px ' + this.font;
        var znW = ctx.measureText(zone.name).width + 10;
        ctx.fillStyle = 'rgba(' + znC + ',' + (0.1 * hudAlpha).toFixed(2) + ')';
        this._roundRect(ctx, 8, 10, znW, 14, 4);
        ctx.fill();
        ctx.fillStyle = 'rgba(' + znC + ',' + (0.6 * hudAlpha).toFixed(2) + ')';
        ctx.fillText(zone.name, 13, 12);
        ctx.restore();
    }

    // Difficulty meter (thin bar below zone pill)
    if (difficulty > 0) {
        var dmW = 40;
        var dmH = 2;
        var dmX = 8;
        var dmY = zone && zone.name !== 'CALM' ? 28 : 12;
        var dmFrac = Math.min(difficulty, 1);
        var dmC = difficulty > 0.8 ? '155,89,182' : difficulty > 0.5 ? '231,76,60' : difficulty > 0.3 ? '243,156,18' : '93,173,226';
        ctx.fillStyle = 'rgba(255,255,255,' + (0.06 * hudAlpha).toFixed(2) + ')';
        ctx.fillRect(dmX, dmY, dmW, dmH);
        ctx.fillStyle = 'rgba(' + dmC + ',' + (0.4 * hudAlpha).toFixed(2) + ')';
        ctx.fillRect(dmX, dmY, dmW * dmFrac, dmH);
    }

    // Coin counter + PB in HUD (top-right)
    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    // Golden glow flash behind counter on coin gain
    if (this.coinBump > 0) {
        var cbGlowA = (this.coinBump / 0.2) * 0.15;
        ctx.save();
        ctx.fillStyle = 'rgba(255,215,0,' + cbGlowA.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(cw - 35, 16, 20 + (1 - this.coinBump / 0.2) * 10, 0, SB.TAU);
        ctx.fill();
        ctx.restore();
    }
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    var coinScale = this.coinBump > 0 ? 1 + this.coinBump / 0.2 * 0.3 : 1;
    var coinShakeX = this.coinBump > 0 ? Math.sin(this.coinBump * 50) * this.coinBump / 0.2 * 3 : 0;
    ctx.font = 'bold ' + Math.min(cw * 0.03 * coinScale, 12 * coinScale) + 'px ' + this.font;
    ctx.fillStyle = this.coinBump > 0 ? 'rgba(255,215,0,1)' : 'rgba(255,215,0,0.75)';
    var coinText = (cachedCoins || 0) + ' coins';
    ctx.fillText(coinText, cw - 12 + coinShakeX, 10);
    // Coin icon
    var ciX = cw - 12 - ctx.measureText(coinText).width - 8 + coinShakeX;
    ctx.beginPath();
    ctx.arc(ciX, 14, 4 * coinScale, 0, SB.TAU);
    ctx.fillStyle = 'rgba(255,200,0,' + (0.6 * hudAlpha).toFixed(2) + ')';
    ctx.fill();
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
    var survTime = Math.floor(this.runSurviveTime || 0);
    var survMin = Math.floor(survTime / 60);
    var survSec = survTime % 60;
    var timeStr = survMin > 0 ? survMin + ':' + (survSec < 10 ? '0' : '') + survSec : survSec + 's';
    ctx.fillText(timeStr, 22, ch - 22);
    var bcText = (this.runBounces || 0) + ' bounces';
    ctx.fillText(bcText, 22, ch - 10);
    var shY = ch - 16, shX = 14;
    ctx.fillStyle = 'rgba(255,255,255,' + (0.2 * hudAlpha).toFixed(2) + ')';
    ctx.beginPath();
    ctx.moveTo(shX - 4, shY - 2);
    ctx.lineTo(shX + 2, shY - 5);
    ctx.lineTo(shX + 3, shY - 1);
    ctx.lineTo(shX + 5, shY);
    ctx.lineTo(shX - 4, shY);
    ctx.closePath();
    ctx.fill();
    // Speed gauge bar
    var sgW = 40, sgH = 3, sgX = 10, sgY = ch - 22;
    var sgFrac = this.ballSpeedFrac || 0;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(sgX, sgY, sgW, sgH);
    var sgColor = sgFrac > 0.7 ? '231,76,60' : (sgFrac > 0.4 ? '243,156,18' : '93,173,226');
    ctx.fillStyle = 'rgba(' + sgColor + ',' + (0.4 * hudAlpha).toFixed(2) + ')';
    ctx.fillRect(sgX, sgY, sgW * sgFrac, sgH);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.08 * hudAlpha).toFixed(3) + ')';
    for (var sgT = 1; sgT <= 3; sgT++) {
        ctx.fillRect(sgX + sgW * sgT / 4, sgY - 1, 1, sgH + 2);
    }
    // Difficulty bar
    if (difficulty > 0) {
        var dbY = sgY - 8;
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(sgX, dbY, sgW, sgH);
        var dbColor = difficulty > 0.8 ? '155,89,182' : difficulty > 0.5 ? '231,76,60' : difficulty > 0.3 ? '243,156,18' : '93,173,226';
        ctx.fillStyle = 'rgba(' + dbColor + ',' + (0.3 * hudAlpha).toFixed(2) + ')';
        ctx.fillRect(sgX, dbY, sgW * difficulty, sgH);
        ctx.font = Math.min(cw * 0.015, 6) + 'px ' + this.font;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = 'rgba(255,255,255,' + (0.12 * hudAlpha).toFixed(3) + ')';
        ctx.fillText('DIFF', sgX + sgW + 3, dbY + sgH + 1);
    }
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
        if ((p.sizeScale || 1) >= 1.4 && !SB.reducedMotion) {
            var cpRingR = baseSize * scale * 0.8 + (1 - alpha) * 10;
            ctx.beginPath();
            ctx.arc(p.x, p.y, cpRingR, 0, SB.TAU);
            ctx.strokeStyle = p.color || '#FFD700';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
        ctx.fillText(p.text, p.x, p.y);
        ctx.restore();
    }

    // Score popups
    for (var si = 0; si < this.scorePopups.length; si++) {
        var sp = this.scorePopups[si];
        var spFrac = sp.timer / 0.8;
        var spAlpha = 1 - spFrac * spFrac;
        // Scale: pop from 0 → 1.4 → 1.0
        var spScale = sp.timer < 0.05 ? (sp.timer / 0.05) * 1.4 : (sp.timer < 0.15 ? 1.4 : 1.4 - (sp.timer - 0.15) / 0.65 * 0.4);
        ctx.save();
        ctx.globalAlpha = spAlpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold ' + Math.floor(Math.min(cw * 0.035, 14) * spScale * (sp.sizeScale || 1)) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillText(sp.text, sp.x + 1, sp.y + 1);
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
        var rElastic = rProgress < 0.6 ? (rProgress / 0.6) * 1.15 : 1.15 - Math.sin((rProgress - 0.6) / 0.4 * Math.PI) * 0.15;
        var rRadius = 10 + rElastic * 40;
        var rAlpha = (1 - rProgress) * 0.5;
        ctx.save();
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, rRadius, 0, SB.TAU);
        ctx.strokeStyle = 'rgba(' + ring.color + ',' + rAlpha.toFixed(2) + ')';
        ctx.lineWidth = 3 * (1 - rProgress);
        ctx.stroke();
        ctx.restore();
    }

    // Collect chain lines
    if (this._chainLines) {
        for (var cli = 0; cli < this._chainLines.length; cli++) {
            var cln = this._chainLines[cli];
            var clAlpha = (1 - cln.timer / cln.duration) * 0.3;
            ctx.save();
            ctx.shadowColor = 'rgba(255,215,0,' + (clAlpha * 0.5).toFixed(2) + ')';
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.moveTo(cln.x1, cln.y1);
            ctx.lineTo(cln.x2, cln.y2);
            ctx.strokeStyle = 'rgba(255,215,0,' + clAlpha.toFixed(2) + ')';
            var clCombo = Math.min(cln.combo || 1, 7);
            ctx.lineWidth = (1.5 + clCombo * 0.3) * (1 - cln.timer / cln.duration);
            ctx.stroke();
            ctx.restore();
        }
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
        ctx.strokeStyle = 'rgba(' + (tap.color || '255,255,255') + ',' + tAlpha.toFixed(2) + ')';
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
    var pausePulse = (Math.sin(this.blinkPhase * 1.5) + 1) / 2 * 0.06;
    ctx.save();
    ctx.beginPath();
    ctx.arc(pauseCx, pauseCy, pauseR, 0, SB.TAU);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.1 + pausePulse).toFixed(3) + ')';
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
        ctx.shadowBlur = 8 + Math.min(this.nearMissStreak, 5) * 4;
        var nmText = this.nearMissStreak >= 2 ? 'DAREDEVIL x' + this.nearMissStreak : 'CLOSE!';
        ctx.fillText(nmText, cw / 2, ch * 0.22);
        if (this.nearMissStreak >= 4) {
            ctx.shadowBlur = 20 + this.nearMissStreak * 3;
            ctx.fillText(nmText, cw / 2, ch * 0.22);
        }
        ctx.restore();
        if (!SB.reducedMotion) {
            var nmEdge = nmAlpha * 0.15;
            ctx.save();
            ctx.strokeStyle = 'rgba(243,156,18,' + nmEdge.toFixed(3) + ')';
            ctx.lineWidth = 3;
            ctx.strokeRect(1, 1, cw - 2, ch - 2);
            ctx.restore();
        }
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
        var ctAlpha = comboTimer < 0.5 ? (Math.sin((SB.frameTime || 0) * 0.02) > 0 ? 0.9 : 0.2) : 0.7;
        ctx.fillStyle = 'rgba(' + ctColor + ',' + ctAlpha.toFixed(2) + ')';
        ctx.fillRect(ctBarX, ctBarY, ctBarW * ctProgress, ctBarH);
    }

    if (this.dailyTarget && this.dailyTarget > 0) {
        var dcFrac = Math.min((this.dailyProgress || 0) / this.dailyTarget, 1);
        var dcW = Math.min(cw * 0.25, 100);
        var dcH = 3;
        var dcX = cw - dcW - 8;
        var dcY = ch - 16;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(dcX, dcY, dcW, dcH);
        var dcDone = dcFrac >= 1;
        ctx.fillStyle = dcDone ? 'rgba(46,204,113,0.7)' : 'rgba(255,215,0,0.5)';
        ctx.fillRect(dcX, dcY, dcW * dcFrac, dcH);
        ctx.textAlign = 'right';
        ctx.font = Math.min(cw * 0.02, 8) + 'px ' + this.font;
        ctx.fillStyle = dcDone ? 'rgba(46,204,113,0.6)' : 'rgba(255,255,255,0.3)';
        ctx.fillText(dcDone ? 'Daily done!' : 'Daily ' + Math.floor(dcFrac * 100) + '%', cw - 8, dcY - 2);
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
        var pbColor = progress > 0.5 ? item.color : (progress > 0.25 ? '#FFD700' : '#FF4444');
        ctx.fillStyle = pbColor;
        ctx.fillRect(x, barY, 70 * progress, 8);
        ctx.font = Math.min(cw * 0.025, 10) + 'px ' + this.font;
        ctx.fillStyle = item.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        var secLeft = Math.ceil(item.timer);
        ctx.fillText(item.label + ' ' + secLeft + 's', x + 35, barY - 2);
    }
};

SB.UI.prototype.resetGameOver = function(finalScore, xpResult, progression, dailyJustCompleted, runStats, streak, recentRuns, prevRun) {
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
    this.prevRun = prevRun || null;
    this.achCount = 0;
    this._countUpDone = false;
};

SB.UI.prototype.drawGameOver = function(ctx, cw, ch, score, highScore, isNewHigh) {
    this.gameOverAlpha = Math.min(this.gameOverAlpha + 0.05, 1);
    var displayScore = Math.floor(score);

    if (this.scoreCountUp < displayScore) {
        var prevCount = this.scoreCountUp;
        this.scoreCountUp += Math.max(1, Math.floor(displayScore / 60));
        if (this.scoreCountUp > displayScore) this.scoreCountUp = displayScore;
        if (Math.floor(this.scoreCountUp / 5) !== Math.floor(prevCount / 5)) {
            SB.audio.playScoreTick();
        }
        if (this.scoreCountUp >= displayScore && !this._countUpDone) {
            this._countUpDone = true;
            this.addPickupRing(cw / 2, ch * 0.10, '255,215,0');
            this.addPickupRing(cw / 2, ch * 0.10, '255,255,255');
        }
    }

    var goPulse = (Math.sin(this.blinkPhase * 0.8) + 1) / 2 * 0.03;
    ctx.fillStyle = 'rgba(0, 0, 0, ' + (this.gameOverAlpha * (0.7 + goPulse)).toFixed(3) + ')';
    ctx.fillRect(0, 0, cw, ch);
    if (this.gameOverAlpha > 0.5) {
        var goTintFrac = (this.gameOverAlpha - 0.5) / 0.5;
        ctx.fillStyle = 'rgba(15,10,35,' + (goTintFrac * 0.08).toFixed(3) + ')';
        ctx.fillRect(0, 0, cw, ch);
    }
    // Vignette overlay (dark corners)
    if (!SB.reducedMotion) {
        var vigR = Math.max(cw, ch) * 0.7;
        var vigGrad = ctx.createRadialGradient(cw / 2, ch / 2, vigR * 0.4, cw / 2, ch / 2, vigR);
        vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vigGrad.addColorStop(1, 'rgba(0,0,0,' + (this.gameOverAlpha * 0.2).toFixed(2) + ')');
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, cw, ch);
    }

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
    var goShakeX = 0, goShakeY = 0;
    if (this.gameOverAlpha < 0.5) {
        var goShakeFrac = (0.5 - this.gameOverAlpha) / 0.5;
        goShakeX = Math.sin(this.gameOverAlpha * 120) * goShakeFrac * 6;
        goShakeY = Math.cos(this.gameOverAlpha * 90) * goShakeFrac * 3;
    }
    ctx.fillText('GAME OVER', cw / 2 + goShakeX, y + goShakeY);
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
        var nbW = ctx.measureText('NEW BEST!').width;
        ctx.fillText('NEW BEST!', cw / 2, y);
        // Procedural trophy icon
        var trX = cw / 2 - nbW / 2 - 14;
        var trS = 6 * pulse;
        ctx.fillStyle = 'rgba(255,215,0,' + alpha + ')';
        ctx.beginPath();
        ctx.moveTo(trX - trS, y - trS); ctx.lineTo(trX + trS, y - trS);
        ctx.lineTo(trX + trS * 0.6, y + trS * 0.3);
        ctx.lineTo(trX - trS * 0.6, y + trS * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(trX - 2, y + trS * 0.3, 4, trS * 0.4);
        ctx.fillRect(trX - trS * 0.5, y + trS * 0.7, trS, 2);
        ctx.restore();
    } else {
        ctx.font = Math.min(cw * 0.04, 16) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255, 215, 0, ' + (alpha * 0.7) + ')';
        ctx.fillText('BEST: ' + SB.formatNum(highScore), cw / 2, y);
    }
    // Comparison to previous run
    if (this.prevRun && this.prevRun.score > 0 && this.scoreCountUp >= displayScore) {
        var diff = displayScore - this.prevRun.score;
        if (diff !== 0) {
            ctx.save();
            ctx.font = Math.min(cw * 0.025, 10) + 'px ' + this.font;
            var cmpArrow = diff > 0 ? '\u25B2 +' + diff : '\u25BC ' + diff;
            if (diff > 0) {
                ctx.shadowColor = 'rgba(46,204,113,0.4)';
                ctx.shadowBlur = 4;
            }
            ctx.fillStyle = diff > 0 ? 'rgba(46,204,113,' + (alpha * 0.6) + ')' : 'rgba(231,76,60,' + (alpha * 0.5) + ')';
            ctx.fillText(cmpArrow + ' vs last run', cw / 2, y);
            ctx.restore();
        }
    }
    y += gap + 4;

    // Run stats
    if (this.runStats) {
        // Death cause
        if (this.runStats.deathCause) {
            var dcIcons = { Platform: '\u25AC', Spike: '\u25B2', Blade: '\u2699', Boomerang: '\u27A0', Laser: '\u26A1', Fell: '\u2193' };
            var dcIcon = dcIcons[this.runStats.deathCause] || '\u2620';
            var dcPulse = (Math.sin(this.blinkPhase * 3) + 1) / 2;
            ctx.save();
            ctx.font = Math.min(cw * 0.025, 10) + 'px ' + this.font;
            ctx.fillStyle = 'rgba(231,76,60,' + (alpha * (0.5 + dcPulse * 0.3)).toFixed(2) + ')';
            ctx.shadowColor = 'rgba(231,76,60,0.4)';
            ctx.shadowBlur = dcPulse * 6;
            ctx.fillText(dcIcon + ' Killed by: ' + this.runStats.deathCause, cw / 2, y);
            ctx.restore();
            y += gap;
            var dcTips = { Platform: 'Tap left or right to steer around platforms', Spike: 'Watch for spike patterns — they have gaps!', Blade: 'Blades spin in place — time your path', Boomerang: 'Boomerangs return — dodge twice!', Laser: 'Lasers flash before firing — move away fast', Fell: 'Keep tapping to stay airborne!' };
            var tip = dcTips[this.runStats.deathCause];
            if (tip) {
                var tipFade = Math.max(0, (this.gameOverAlpha - 0.6) / 0.4);
                ctx.font = Math.min(cw * 0.022, 9) + 'px ' + this.font;
                ctx.fillStyle = 'rgba(255,255,255,' + (tipFade * 0.3).toFixed(2) + ')';
                ctx.fillText(tip, cw / 2, y);
                y += gap;
            }
        }

        var statLine = 0;
        var statDelay = 0.12;
        var slA0 = Math.max(0, (alpha - statLine * statDelay) / (1 - statLine * statDelay));
        var slSlide0 = Math.max(0, 1 - slA0) * -30;
        ctx.save();
        ctx.translate(slSlide0, 0);
        ctx.font = Math.min(cw * 0.028, 11) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,' + (slA0 * 0.45).toFixed(2) + ')';
        var runSec = Math.floor(this.runStats.time);
        var timeStr = runSec >= 60 ? Math.floor(runSec / 60) + ':' + (runSec % 60 < 10 ? '0' : '') + (runSec % 60) : runSec + 's';
        var statsText = timeStr + '  |  ' + this.runStats.stars + ' stars';
        if (this.runStats.bounces) statsText += '  |  ' + this.runStats.bounces + ' bounces';
        ctx.fillText(statsText, cw / 2, y);
        ctx.restore();
        if (this.runStats.maxCombo >= 2) {
            y += gap;
            statLine++;
            var slA1 = Math.max(0, (alpha - statLine * statDelay) / (1 - statLine * statDelay));
            var slSlide1 = Math.max(0, 1 - slA1) * -30;
            var mcColor = this.runStats.maxCombo >= 7 ? '#FF0044' : (this.runStats.maxCombo >= 5 ? '#FF4444' : (this.runStats.maxCombo >= 3 ? '#FF8C42' : '#FFD700'));
            ctx.save();
            ctx.translate(slSlide1, 0);
            ctx.font = 'bold ' + Math.min(cw * 0.03, 12) + 'px ' + this.font;
            ctx.fillStyle = mcColor;
            ctx.globalAlpha = slA1 * 0.7;
            ctx.fillText(this.runStats.maxCombo + 'x MAX COMBO', cw / 2, y);
            ctx.restore();
        }
        y += gap;
        var earnedCoins = this.runStats.coins || 0;
        if (earnedCoins > 0) {
            statLine++;
            var slA2 = Math.max(0, (alpha - statLine * statDelay) / (1 - statLine * statDelay));
            var coinGlow = (Math.sin(this.blinkPhase * 2.5) + 1) / 2;
            ctx.save();
            ctx.shadowColor = 'rgba(255,215,0,' + (slA2 * 0.5 + coinGlow * 0.3).toFixed(2) + ')';
            ctx.shadowBlur = 4 + coinGlow * 6;
            ctx.font = 'bold ' + Math.min(cw * 0.03, 12) + 'px ' + this.font;
            ctx.fillStyle = 'rgba(255,215,0,' + (slA2 * 0.7).toFixed(2) + ')';
            ctx.fillText('+' + earnedCoins + ' coins earned', cw / 2, y);
            ctx.restore();
            y += gap;
        }

        // Zone reached
        if (this.runStats.zone && this.runStats.zone !== 'CALM') {
            var zoneColors = { RISING: '#F39C12', INTENSE: '#E74C3C', EXTREME: '#9B59B6' };
            ctx.font = Math.min(cw * 0.025, 10) + 'px ' + this.font;
            ctx.fillStyle = zoneColors[this.runStats.zone] || 'rgba(255,255,255,0.4)';
            ctx.fillText('Reached ' + this.runStats.zone + ' zone', cw / 2, y);
            y += gap;
        }
    }

    // Rank (inline, with glow for top 3)
    if (this.rank && this.rank <= 10) {
        ctx.save();
        ctx.font = Math.min(cw * 0.028, 11) + 'px ' + this.font;
        if (this.rank <= 3) {
            var rkColors = ['255,215,0', '192,192,192', '205,127,50'];
            var rkColor = rkColors[this.rank - 1];
            var rkPulse = (Math.sin(this.blinkPhase * 2) + 1) / 2;
            ctx.shadowColor = 'rgba(' + rkColor + ',0.6)';
            ctx.shadowBlur = 4 + rkPulse * 6;
            ctx.fillStyle = 'rgba(' + rkColor + ',' + (alpha * 0.8).toFixed(2) + ')';
        } else {
            ctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.4) + ')';
        }
        ctx.fillText('#' + this.rank + ' on leaderboard', cw / 2, y);
        ctx.restore();
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
            if (isLast) {
                ctx.save();
                ctx.shadowColor = 'rgba(255,215,0,0.4)';
                ctx.shadowBlur = 4;
            }
            ctx.fillStyle = isLast ? 'rgba(255,215,0,0.7)' : 'rgba(255,255,255,0.25)';
            this._roundRect(ctx, bx, by, barW2, bh, 2);
            ctx.fill();
            if (isLast) {
                ctx.font = Math.min(cw * 0.015, 6) + 'px ' + this.font;
                ctx.fillStyle = 'rgba(255,215,0,0.8)';
                ctx.textAlign = 'center';
                ctx.fillText('' + this.recentRuns[rj], bx + barW2 / 2, by - 3);
                ctx.restore();
            }
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
        ctx.save();
        ctx.shadowColor = 'rgba(255,215,0,0.6)';
        ctx.shadowBlur = 6 + (Math.sin(this.blinkPhase * 2) + 1) / 2 * 4;
        var xpFillFrac = Math.min(detailAlpha * 2, 1);
        ctx.fillStyle = 'rgba(255,215,0,0.7)';
        ctx.fillRect(xpBarX, y, xpBarW * progress * xpFillFrac, xpBarH);
        ctx.restore();
        ctx.restore();
        y += xpBarH + gap;
    }

    // Achievement count (staggered)
    if (this.achCount !== undefined && detailAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = detailAlpha * 0.5;
        ctx.font = Math.min(cw * 0.022, 9) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,215,0,0.5)';
        ctx.fillText(this.achCount + '/' + SB.ACHIEVEMENTS.length + ' achievements', cw / 2, y);
        ctx.restore();
        y += gap;
    }

    if (this.gameOverAlpha >= 0.8) {
        // Buttons: place from bottom up to guarantee they're always visible
        var btnW = Math.min(cw * 0.45, 180);
        var btnH = 38;
        var btnX = cw / 2 - btnW / 2;
        var playBtnY = ch - btnH - Math.max(ch * 0.06, 20);
        var shareBtnY = playBtnY - btnH - 10;

        // Share button
        if (this.shareTapFlash > 0) this.shareTapFlash = Math.max(0, this.shareTapFlash - 0.016);
        var shareFlash = this.shareTapFlash > 0 ? this.shareTapFlash / 0.3 : 0;
        var shareBright = shareFlash > 0 ? ', ' + (alpha * (0.9 + shareFlash * 0.1)) : ', ' + alpha * 0.9;
        ctx.fillStyle = shareFlash > 0 ? 'rgba(100, 180, 240' + shareBright + ')' : 'rgba(52, 152, 219' + shareBright + ')';
        this._roundRect(ctx, btnX, shareBtnY, btnW, btnH, 10);
        ctx.fill();
        if (shareFlash > 0) {
            ctx.font = 'bold ' + Math.min(cw * 0.035, 14) + 'px ' + this.font;
            ctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.6) + ')';
            ctx.fillText('Sharing...', cw / 2, shareBtnY + btnH / 2 + btnH + 10);
        }
        ctx.font = 'bold ' + Math.min(cw * 0.04, 16) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
        // Share arrow icon
        var siX = cw / 2 - ctx.measureText('SHARE SCORE').width / 2 - 14;
        var siY = shareBtnY + btnH / 2;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,' + alpha + ')';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(siX, siY);
        ctx.lineTo(siX + 6, siY - 5);
        ctx.moveTo(siX, siY);
        ctx.lineTo(siX + 6, siY + 5);
        ctx.moveTo(siX, siY);
        ctx.lineTo(siX + 10, siY);
        ctx.stroke();
        ctx.restore();
        ctx.fillText('SHARE SCORE', cw / 2 + 4, shareBtnY + btnH / 2);
        SB._shareBtn = { x: btnX, y: shareBtnY, w: btnW, h: btnH, score: displayScore };

        // Play Again button (pulses gently with glow ring + scale bounce)
        var paPulse = (Math.sin(this.blinkPhase * 1.5) + 1) / 2 * 0.1;
        var paScale = 1 + paPulse * 0.3;
        ctx.save();
        ctx.translate(cw / 2, playBtnY + btnH / 2);
        ctx.scale(paScale, paScale);
        ctx.translate(-(cw / 2), -(playBtnY + btnH / 2));
        ctx.shadowColor = 'rgba(46,204,113,0.4)';
        ctx.shadowBlur = 6 + paPulse * 30;
        ctx.fillStyle = 'rgba(46, 204, 113, ' + (alpha * (0.85 + paPulse)).toFixed(2) + ')';
        this._roundRect(ctx, btnX, playBtnY, btnW, btnH, 10);
        ctx.fill();
        var paGrad = ctx.createLinearGradient(cw / 2, playBtnY, cw / 2, playBtnY + btnH);
        paGrad.addColorStop(0, 'rgba(255,255,255,' + (paPulse * 2).toFixed(2) + ')');
        paGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
        paGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
        ctx.fillStyle = paGrad;
        this._roundRect(ctx, btnX, playBtnY, btnW, btnH, 10);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = 'rgba(46, 204, 113, ' + (paPulse * 3).toFixed(2) + ')';
        ctx.lineWidth = 1.5;
        this._roundRect(ctx, btnX, playBtnY, btnW, btnH, 10);
        ctx.stroke();
        ctx.font = 'bold ' + Math.min(cw * 0.04, 16) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
        ctx.fillText('PLAY AGAIN', cw / 2, playBtnY + btnH / 2);
        SB._playAgainBtn = { x: btnX, y: playBtnY, w: btnW, h: btnH };
    }
};

SB.UI.prototype.drawPauseScreen = function(ctx, cw, ch) {
    this.pauseFade = Math.min(this.pauseFade + 0.08, 1);
    var pfA = this.pauseFade;
    var pauseOscBg = 0.6 + Math.sin(this.blinkPhase * 0.5) * 0.03;
    ctx.fillStyle = 'rgba(0, 0, 0, ' + (pauseOscBg * pfA).toFixed(3) + ')';
    ctx.fillRect(0, 0, cw, ch);

    if (!SB.reducedMotion) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        for (var sl = 0; sl < ch; sl += 4) {
            ctx.fillRect(0, sl, cw, 2);
        }
    }

    if (!SB.reducedMotion) {
        if (!this._pauseSparkles) {
            this._pauseSparkles = [];
            for (var psi = 0; psi < 8; psi++) {
                this._pauseSparkles.push({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() * 1.5, ph: Math.random() * SB.TAU, sp: 0.01 + Math.random() * 0.02 });
            }
        }
        for (var psi2 = 0; psi2 < this._pauseSparkles.length; psi2++) {
            var ps = this._pauseSparkles[psi2];
            ps.y -= ps.sp * 0.016;
            ps.ph += 0.02;
            if (ps.y < -0.02) { ps.y = 1.02; ps.x = Math.random(); }
            var psA = (Math.sin(ps.ph) + 1) / 2 * 0.25 * pfA;
            ctx.beginPath();
            ctx.arc(ps.x * cw, ps.y * ch, ps.s, 0, SB.TAU);
            ctx.fillStyle = 'rgba(255,255,255,' + psA.toFixed(3) + ')';
            ctx.fill();
        }
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var pauseBreath = 1 + Math.sin(this.blinkPhase * 0.8) * 0.04;
    ctx.save();
    ctx.font = 'bold ' + Math.min(cw * 0.1, 40) * pauseBreath + 'px ' + this.font;
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(255,255,255,0.2)';
    ctx.shadowBlur = 8 + (Math.sin(this.blinkPhase * 0.8) + 1) / 2 * 6;
    ctx.fillText('PAUSED', cw / 2, ch * 0.3);
    ctx.restore();

    // Current run stats
    ctx.font = Math.min(cw * 0.025, 10) + 'px ' + this.font;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    var pauseStats = Math.floor(this.displayScore) + ' pts  |  ' + (this.runBounces || 0) + ' bounces';
    ctx.fillText(pauseStats, cw / 2, ch * 0.38);
    // Zone indicator
    if (this.currentZone) {
        var pzColors = { CALM: '#5DADE2', RISING: '#F39C12', INTENSE: '#E74C3C', EXTREME: '#9B59B6' };
        ctx.font = 'bold ' + Math.min(cw * 0.02, 8) + 'px ' + this.font;
        ctx.fillStyle = pzColors[this.currentZone] || 'rgba(255,255,255,0.3)';
        ctx.fillText(this.currentZone + ' ZONE', cw / 2, ch * 0.42);
    }

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
    var rvUrgency = 1 - countdown / 3.0;
    var rvPulse = (Math.sin((SB.frameTime || 0) * (0.008 + rvUrgency * 0.01)) + 1) / 2;
    var rvTint = rvUrgency * rvPulse * 0.06;
    if (rvTint > 0.005) {
        ctx.fillStyle = 'rgba(180,30,30,' + rvTint.toFixed(3) + ')';
        ctx.fillRect(0, 0, cw, ch);
    }

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

    // Countdown arc with outer glow
    var progress = countdown / 3.0;
    var urgency = 1 - progress;
    var glowPulse = (Math.sin((SB.frameTime || 0) * (0.006 + urgency * 0.012)) + 1) / 2;
    ctx.save();
    ctx.shadowColor = '#E74C3C';
    ctx.shadowBlur = 8 + urgency * 20 + glowPulse * urgency * 15;
    ctx.beginPath();
    ctx.arc(cw / 2, countY, countR, -Math.PI / 2, -Math.PI / 2 + SB.TAU * progress);
    ctx.strokeStyle = '#E74C3C';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.restore();

    // Expanding pulse ring on each second tick
    var secFrac = countdown % 1;
    if (!SB.reducedMotion) {
        var rpR = countR + (1 - secFrac) * 30;
        var rpA = secFrac * 0.2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cw / 2, countY, rpR, 0, SB.TAU);
        ctx.strokeStyle = 'rgba(231,76,60,' + rpA.toFixed(2) + ')';
        ctx.lineWidth = 2 * secFrac;
        ctx.stroke();
        ctx.restore();
    }

    // Number with pulse (more urgent when time low)
    var cpulse = 1 + (1 - secFrac) * 0.15;
    ctx.save();
    var numGlow = urgency > 0.6 ? 15 + glowPulse * 20 : 5;
    ctx.shadowColor = urgency > 0.6 ? '#FF2020' : '#E74C3C';
    ctx.shadowBlur = numGlow + (1 - secFrac) * 10;
    ctx.font = 'bold ' + Math.min(cw * 0.1, 40) * cpulse + 'px ' + this.font;
    ctx.fillStyle = urgency > 0.6 ? 'rgba(255,' + Math.floor(255 - urgency * 150) + ',' + Math.floor(255 - urgency * 150) + ',1)' : '#FFFFFF';
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

    // Achievement list — sort unlocked first
    var startY = ch * 0.14;
    var rowH = Math.min(ch * 0.05, 32);
    var listW = Math.min(cw * 0.85, 300);
    var listX = cw / 2 - listW / 2;

    if (!this._achSorted || this._achSortedStamp !== count) {
        this._achSortedList = [];
        for (var si = 0; si < SB.ACHIEVEMENTS.length; si++) this._achSortedList.push(SB.ACHIEVEMENTS[si]);
        var uRef = achievements.unlocked;
        this._achSortedList.sort(function(a, b) {
            var ua = uRef[a.id] ? 0 : 1;
            var ub = uRef[b.id] ? 0 : 1;
            return ua - ub;
        });
        this._achSorted = true;
        this._achSortedStamp = count;
    }

    for (var i = 0; i < this._achSortedList.length; i++) {
        var ach = this._achSortedList[i];
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

    // Scroll indicator if list overflows
    var lastVisibleY = startY + (i - 1) * rowH;
    if (i < this._achSortedList.length) {
        var moreAlpha = (Math.sin(this.blinkPhase * 2) + 1) / 2 * 0.3 + 0.2;
        ctx.textAlign = 'center';
        ctx.font = Math.min(cw * 0.025, 10) + 'px ' + this.font;
        ctx.fillStyle = 'rgba(255,255,255,' + moreAlpha.toFixed(2) + ')';
        ctx.fillText('\u25BC ' + (this._achSortedList.length - i) + ' more', cw / 2, ch * 0.91);
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

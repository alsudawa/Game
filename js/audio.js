window.SB = window.SB || {};

SB.Audio = function() {
    this.ctx = null;
    this.masterGain = null;
    this.initialized = false;
    this.muted = false;
};

SB.Audio.prototype.toggleMute = function() {
    this.muted = !this.muted;
    if (this.masterGain) {
        this.masterGain.gain.value = this.muted ? 0 : 0.3;
    }
    try {
        localStorage.setItem('skyBounce_muted', this.muted ? '1' : '0');
    } catch (e) {}
    return this.muted;
};

SB.Audio.prototype.loadMuteState = function() {
    try {
        this.muted = localStorage.getItem('skyBounce_muted') === '1';
    } catch (e) {}
};

SB.Audio.prototype.init = function() {
    if (this.initialized) return;
    try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : 0.3;
        this.masterGain.connect(this.ctx.destination);
        this.initialized = true;
    } catch (e) {
        // Audio not supported
    }
};

SB.Audio.prototype._createTone = function(freq, duration, waveType, gainValue) {
    if (!this.initialized) return;
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = waveType || 'sine';
    osc.frequency.value = freq;
    gain.gain.value = gainValue || 0.3;
    osc.connect(gain);
    gain.connect(this.masterGain);
    var now = this.ctx.currentTime;
    gain.gain.setValueAtTime(gainValue || 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.start(now);
    osc.stop(now + duration);
};

SB.Audio.prototype.playBounce = function() {
    if (!this.initialized) return;
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 400;
    var now = this.ctx.currentTime;
    osc.frequency.linearRampToValueAtTime(800, now + 0.08);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
};

SB.Audio.prototype.playCollect = function() {
    if (!this.initialized) return;
    var now = this.ctx.currentTime;

    var osc1 = this.ctx.createOscillator();
    var gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.value = 600;
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + 0.1);

    var osc2 = this.ctx.createOscillator();
    var gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 900;
    gain2.gain.setValueAtTime(0.2, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.15);
};

SB.Audio.prototype.playCoinCollect = function() {
    if (!this.initialized) return;
    var now = this.ctx.currentTime;

    // Metallic clink: two quick high tones
    var osc1 = this.ctx.createOscillator();
    var gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.value = 1200;
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + 0.06);

    var osc2 = this.ctx.createOscillator();
    var gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.value = 1600;
    gain2.gain.setValueAtTime(0.12, now + 0.03);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(now + 0.03);
    osc2.stop(now + 0.1);
};

SB.Audio.prototype.playGameOver = function() {
    if (!this.initialized) return;
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    var now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.linearRampToValueAtTime(150, now + 0.4);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.5);
};

SB.Audio.prototype.playMilestone = function(tier) {
    if (!this.initialized) return;
    var now = this.ctx.currentTime;
    var chords = [
        [523, 659, 784],
        [587, 740, 880],
        [659, 831, 988],
        [784, 988, 1175]
    ];
    var idx = Math.min(tier || 0, chords.length - 1);
    var notes = chords[idx];
    for (var i = 0; i < notes.length; i++) {
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = notes[i];
        var t = now + i * 0.07;
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.15);
    }
};

SB.Audio.prototype.playCombo = function(count) {
    if (!this.initialized) return;
    var now = this.ctx.currentTime;
    // Musical scale: ascending notes per combo count (C major pentatonic)
    var scale = [523, 587, 659, 784, 880, 1047, 1175, 1319];
    var noteIdx = Math.min(count - 2, scale.length - 1);
    var freq = scale[noteIdx];
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.linearRampToValueAtTime(freq * 1.2, now + 0.06);
    var vol = Math.min(0.18 + count * 0.01, 0.25);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
    // Harmony note at high combos (5+)
    if (count >= 5) {
        var osc2 = this.ctx.createOscillator();
        var gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.value = freq * 1.5;
        gain2.gain.setValueAtTime(0.08, now + 0.02);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc2.connect(gain2);
        gain2.connect(this.masterGain);
        osc2.start(now + 0.02);
        osc2.stop(now + 0.1);
    }
};

SB.Audio.prototype.playLevelUp = function() {
    if (!this.initialized) return;
    var now = this.ctx.currentTime;
    var notes = [523, 659, 784, 1047];
    for (var i = 0; i < notes.length; i++) {
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = notes[i];
        var t = now + i * 0.1;
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.25);
    }
};

SB.Audio.prototype.playShieldBreak = function() {
    if (!this.initialized) return;
    var now = this.ctx.currentTime;

    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.linearRampToValueAtTime(200, now + 0.15);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
};

SB.Audio.prototype.playZoneWarning = function(level) {
    if (!this.initialized) return;
    var now = this.ctx.currentTime;
    // Rising urgency: higher level = higher pitch, more notes
    var baseFreqs = [[330, 440], [440, 554, 660], [554, 660, 880, 1047]];
    var notes = baseFreqs[Math.min(level, 2)];
    for (var i = 0; i < notes.length; i++) {
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = level >= 2 ? 'square' : 'triangle';
        osc.frequency.value = notes[i];
        var t = now + i * 0.08;
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.15);
    }
};

SB.Audio.prototype.playWallHit = function() {
    if (!this.initialized) return;
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 180;
    var now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.05);
};

SB.Audio.prototype.playNearMiss = function() {
    if (!this.initialized) return;
    var now = this.ctx.currentTime;
    // Quick whoosh: noise-like sweep downward
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(200, now + 0.08);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
};

SB.Audio.prototype.playPerfectBounce = function() {
    if (!this.initialized) return;
    var now = this.ctx.currentTime;
    // Bright two-note chime: ascending perfect fifth
    var osc1 = this.ctx.createOscillator();
    var gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.value = 880;
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + 0.12);

    var osc2 = this.ctx.createOscillator();
    var gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 1320;
    gain2.gain.setValueAtTime(0.15, now + 0.04);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(now + 0.04);
    osc2.stop(now + 0.18);
};

SB.Audio.prototype.playPowerupShield = function() {
    if (!this.initialized) return;
    var now = this.ctx.currentTime;
    // Bright rising tone with a "shield deploy" feel
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(900, now + 0.12);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
};

SB.Audio.prototype.playPowerupMagnet = function() {
    if (!this.initialized) return;
    var now = this.ctx.currentTime;
    // Deep hum with slight wobble
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(440, now + 0.1);
    osc.frequency.linearRampToValueAtTime(330, now + 0.2);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
};

SB.Audio.prototype.playPowerupSlow = function() {
    if (!this.initialized) return;
    var now = this.ctx.currentTime;
    // Descending tone (slowing down feel)
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.linearRampToValueAtTime(300, now + 0.2);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
};

SB.Audio.prototype.playPowerupExpiring = function() {
    if (!this.initialized) return;
    var now = this.ctx.currentTime;
    // Quick descending warning beep
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.linearRampToValueAtTime(350, now + 0.06);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
};

SB.Audio.prototype.playPowerupScoreMult = function() {
    if (!this.initialized) return;
    var now = this.ctx.currentTime;
    // Double chime (x2 feeling)
    var notes = [660, 880];
    for (var i = 0; i < notes.length; i++) {
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = notes[i];
        var t = now + i * 0.06;
        gain.gain.setValueAtTime(0.16, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.12);
    }
};

SB.Audio.prototype.playRevive = function() {
    if (!this.initialized) return;
    var now = this.ctx.currentTime;
    // Rising hopeful tone: C5 → E5 → G5 (fast ascending)
    var notes = [523, 659, 784];
    for (var i = 0; i < notes.length; i++) {
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = notes[i];
        var t = now + i * 0.06;
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.2);
    }
    // Sustained shimmer at top note
    var shimmer = this.ctx.createOscillator();
    var sGain = this.ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.value = 1047; // C6
    var sStart = now + 0.18;
    sGain.gain.setValueAtTime(0.12, sStart);
    sGain.gain.exponentialRampToValueAtTime(0.001, sStart + 0.4);
    shimmer.connect(sGain);
    sGain.connect(this.masterGain);
    shimmer.start(sStart);
    shimmer.stop(sStart + 0.4);
};

SB.Audio.prototype.playScoreTick = function() {
    if (!this.initialized) return;
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1000;
    var now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.03);
};

SB.Audio.prototype.startBGM = function() {
    if (!this.initialized || this._bgmPlaying) return;
    this._bgmPlaying = true;

    var ctx = this.ctx;
    var now = ctx.currentTime;

    this._bgmGain = ctx.createGain();
    this._bgmGain.gain.setValueAtTime(0, now);
    this._bgmGain.gain.linearRampToValueAtTime(0.07, now + 2.0);
    this._bgmGain.connect(this.masterGain);

    // Pad layer: 3 triangle oscillators for sustained chord
    this._bgmPadOscs = [];
    var padInit = [130.81, 164.81, 196.00];
    var padVols = [0.35, 0.2, 0.12];
    for (var i = 0; i < 3; i++) {
        var osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = padInit[i];
        if (i > 0) osc.detune.value = SB.randRange(-3, 3);
        var g = ctx.createGain();
        g.gain.value = padVols[i];
        osc.connect(g);
        g.connect(this._bgmGain);
        osc.start(now);
        this._bgmPadOscs.push(osc);
    }

    // Arp layer: single oscillator with gain envelope per note
    this._bgmArpOsc = ctx.createOscillator();
    this._bgmArpOsc.type = 'sine';
    this._bgmArpOsc.frequency.value = 261.63;
    this._bgmArpGain = ctx.createGain();
    this._bgmArpGain.gain.value = 0.001;
    this._bgmArpOsc.connect(this._bgmArpGain);
    this._bgmArpGain.connect(this._bgmGain);
    this._bgmArpOsc.start(now);

    // Bass layer: single oscillator with gain envelope
    this._bgmBassOsc = ctx.createOscillator();
    this._bgmBassOsc.type = 'sine';
    this._bgmBassOsc.frequency.value = 130.81;
    this._bgmBassGain = ctx.createGain();
    this._bgmBassGain.gain.value = 0.001;
    this._bgmBassOsc.connect(this._bgmBassGain);
    this._bgmBassGain.connect(this._bgmGain);
    this._bgmBassOsc.start(now);

    // Hi-hat layer: high-freq square wave for rhythmic ticks
    this._bgmHatOsc = ctx.createOscillator();
    this._bgmHatOsc.type = 'square';
    this._bgmHatOsc.frequency.value = 8000;
    this._bgmHatGain = ctx.createGain();
    this._bgmHatGain.gain.value = 0.001;
    this._bgmHatOsc.connect(this._bgmHatGain);
    this._bgmHatGain.connect(this._bgmGain);
    this._bgmHatOsc.start(now);

    // Scheduler state
    this._bgmBPM = 85;
    this._bgmBeat = 0;
    this._bgmNextBeatTime = now + 0.5;
    this._bgmDifficulty = 0;
    this.beatPulse = 0;

    // I-vi-IV-V major progression
    this._bgmChordsMaj = [
        { bass: 130.81, pad: [130.81, 164.81, 196.00], arp: [261.63, 329.63, 392.00, 523.25, 523.25, 392.00, 329.63, 261.63] },
        { bass: 110.00, pad: [110.00, 130.81, 164.81], arp: [220.00, 261.63, 329.63, 440.00, 440.00, 329.63, 261.63, 220.00] },
        { bass: 174.61, pad: [174.61, 220.00, 261.63], arp: [349.23, 440.00, 523.25, 698.46, 698.46, 523.25, 440.00, 349.23] },
        { bass: 98.00,  pad: [196.00, 246.94, 293.66], arp: [392.00, 493.88, 587.33, 783.99, 783.99, 587.33, 493.88, 392.00] }
    ];
    // i-VII-VI-V minor progression (tense)
    this._bgmChordsMin = [
        { bass: 130.81, pad: [130.81, 155.56, 196.00], arp: [261.63, 311.13, 392.00, 523.25, 523.25, 392.00, 311.13, 261.63] },
        { bass: 116.54, pad: [116.54, 146.83, 174.61], arp: [233.08, 293.66, 349.23, 466.16, 466.16, 349.23, 293.66, 233.08] },
        { bass: 103.83, pad: [103.83, 130.81, 155.56], arp: [207.65, 261.63, 311.13, 415.30, 415.30, 311.13, 261.63, 207.65] },
        { bass: 98.00,  pad: [196.00, 246.94, 293.66], arp: [392.00, 493.88, 587.33, 783.99, 783.99, 587.33, 493.88, 392.00] }
    ];

    var self = this;
    this._bgmTimerId = setInterval(function() { self._bgmSchedule(); }, 80);
};

SB.Audio.prototype._bgmSchedule = function() {
    if (!this._bgmPlaying || !this.ctx) return;
    if (this._bgmNextBeatTime < this.ctx.currentTime - 0.5) {
        this._bgmNextBeatTime = this.ctx.currentTime + 0.05;
    }
    while (this._bgmNextBeatTime < this.ctx.currentTime + 0.15) {
        this._bgmPlayBeat(this._bgmNextBeatTime);
        this._bgmNextBeatTime += 60.0 / this._bgmBPM / 2;
        this._bgmBeat = (this._bgmBeat + 1) % 32;
    }
};

SB.Audio.prototype._bgmPlayBeat = function(time) {
    // Crossfade between major and minor based on difficulty (smooth transition zone 0.35-0.65)
    var minorBlend = SB.clamp((this._bgmDifficulty - 0.35) / 0.3, 0, 1);
    var majChord = this._bgmChordsMaj[Math.floor(this._bgmBeat / 8) % 4];
    var minChord = this._bgmChordsMin[Math.floor(this._bgmBeat / 8) % 4];
    var pos = this._bgmBeat % 8;
    var eighthDur = 60.0 / this._bgmBPM / 2;

    // Beat pulse for visual sync (1.0 on downbeat, 0.6 on beat 3)
    if (pos === 0) this.beatPulse = 1.0;
    else if (pos === 4) this.beatPulse = 0.6;

    // Blend arp frequency between major and minor
    var arpFreq = SB.lerp(majChord.arp[pos], minChord.arp[pos], minorBlend);
    var arpVol = SB.lerp(0.04, 0.09, this._bgmDifficulty);
    if (pos % 2 === 1) arpVol *= SB.lerp(0.15, 1.0, this._bgmDifficulty);
    var arpDur = eighthDur * 0.7;
    this._bgmArpGain.gain.cancelScheduledValues(time);
    this._bgmArpOsc.frequency.setValueAtTime(arpFreq, time);
    this._bgmArpGain.gain.setValueAtTime(0.001, time);
    this._bgmArpGain.gain.linearRampToValueAtTime(arpVol, time + 0.005);
    this._bgmArpGain.gain.exponentialRampToValueAtTime(0.001, time + arpDur);

    // Bass on beats 1 and 3 (positions 0, 4) — blended root
    if (pos === 0 || pos === 4) {
        var bassFreq = SB.lerp(majChord.bass, minChord.bass, minorBlend);
        var bassVol = SB.lerp(0.06, 0.13, this._bgmDifficulty);
        var bassDur = eighthDur * 2 * 0.7;
        this._bgmBassGain.gain.cancelScheduledValues(time);
        this._bgmBassOsc.frequency.setValueAtTime(bassFreq, time);
        this._bgmBassGain.gain.setValueAtTime(0.001, time);
        this._bgmBassGain.gain.linearRampToValueAtTime(bassVol, time + 0.008);
        this._bgmBassGain.gain.exponentialRampToValueAtTime(0.001, time + bassDur);
    }

    // Hi-hat — appears at medium+ difficulty, every 8th note with accent on beats
    if (this._bgmDifficulty > 0.25) {
        var hatVol = SB.lerp(0, 0.02, (this._bgmDifficulty - 0.25) / 0.75);
        if (pos % 2 === 0) hatVol *= 1.5;
        var hatDur = 0.02;
        this._bgmHatGain.gain.cancelScheduledValues(time);
        this._bgmHatOsc.frequency.setValueAtTime(pos % 2 === 0 ? 8000 : 10000, time);
        this._bgmHatGain.gain.setValueAtTime(0.001, time);
        this._bgmHatGain.gain.linearRampToValueAtTime(hatVol, time + 0.002);
        this._bgmHatGain.gain.exponentialRampToValueAtTime(0.001, time + hatDur);
    }

    // Pad chord transitions on bar boundaries — blended
    if (pos === 0) {
        for (var i = 0; i < 3; i++) {
            var padFreq = SB.lerp(majChord.pad[i], minChord.pad[i], minorBlend);
            this._bgmPadOscs[i].frequency.linearRampToValueAtTime(padFreq, time + 0.4);
        }
    }
};

SB.Audio.prototype.updateBGMIntensity = function(difficulty) {
    if (!this._bgmPlaying) return;
    this._bgmDifficulty = difficulty;
    this._bgmBPM = SB.lerp(85, 110, difficulty);
    var vol = SB.lerp(0.06, 0.09, difficulty);
    this._bgmGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.5);
    if (this.beatPulse > 0) this.beatPulse = Math.max(0, this.beatPulse - 0.08);
};

SB.Audio.prototype.stopBGM = function() {
    if (!this._bgmPlaying) return;
    this._bgmPlaying = false;
    if (this._bgmTimerId) { clearInterval(this._bgmTimerId); this._bgmTimerId = null; }

    var now = this.ctx.currentTime;
    this._bgmGain.gain.cancelScheduledValues(now);
    this._bgmGain.gain.setValueAtTime(this._bgmGain.gain.value, now);
    this._bgmGain.gain.linearRampToValueAtTime(0.001, now + 1.0);

    for (var i = 0; i < this._bgmPadOscs.length; i++) this._bgmPadOscs[i].stop(now + 1.1);
    this._bgmArpOsc.stop(now + 1.1);
    this._bgmBassOsc.stop(now + 1.1);
    this._bgmHatOsc.stop(now + 1.1);
};

SB.Audio.prototype.startAmbient = function() {
    if (!this.initialized || this._ambPlaying) return;
    this._ambPlaying = true;
    var ctx = this.ctx;
    var now = ctx.currentTime;
    this._ambGain = ctx.createGain();
    this._ambGain.gain.setValueAtTime(0, now);
    this._ambGain.gain.linearRampToValueAtTime(0.03, now + 1.5);
    this._ambGain.connect(this.masterGain);
    this._ambOscs = [];
    var notes = [130.81, 196.00, 261.63];
    for (var i = 0; i < 3; i++) {
        var osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = notes[i];
        osc.detune.value = SB.randRange(-5, 5);
        var g = ctx.createGain();
        g.gain.value = [0.4, 0.25, 0.15][i];
        osc.connect(g);
        g.connect(this._ambGain);
        osc.start(now);
        this._ambOscs.push(osc);
    }
};

SB.Audio.prototype.stopAmbient = function() {
    if (!this._ambPlaying) return;
    this._ambPlaying = false;
    var now = this.ctx.currentTime;
    this._ambGain.gain.cancelScheduledValues(now);
    this._ambGain.gain.setValueAtTime(this._ambGain.gain.value, now);
    this._ambGain.gain.linearRampToValueAtTime(0.001, now + 0.5);
    for (var i = 0; i < this._ambOscs.length; i++) this._ambOscs[i].stop(now + 0.6);
};

SB.Audio.prototype.playMagnetCollect = function() {
    if (!this.initialized) return;
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = 'sine';
    var now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.linearRampToValueAtTime(1200, now + 0.06);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
};

SB.Audio.prototype.playComboBreak = function() {
    if (!this.initialized) return;
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = 'sine';
    var now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.linearRampToValueAtTime(250, now + 0.12);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
};

SB.Audio.prototype.playLaserFire = function() {
    if (!this.initialized) return;
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = 'square';
    var now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
};

SB.Audio.prototype.playLaserCharge = function() {
    if (!this.initialized) return;
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    var now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.25);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
};

SB.Audio.prototype.playAchievement = function() {
    if (!this.initialized) return;
    var now = this.ctx.currentTime;
    var notes = [659, 880, 1047, 1319];
    for (var i = 0; i < notes.length; i++) {
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = notes[i];
        var t = now + i * 0.08;
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.2);
    }
};

SB.Audio.prototype.playZoneTransition = function(threshold) {
    if (!this.initialized) return;
    var now = this.ctx.currentTime;
    var chords = {
        15: [329.63, 440.00, 523.25],
        25: [349.23, 440.00, 587.33],
        50: [392.00, 493.88, 659.25]
    };
    var notes = chords[threshold] || [329.63, 440.00, 523.25];
    for (var i = 0; i < notes.length; i++) {
        var osc = this.ctx.createOscillator();
        var gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = notes[i];
        var t = now + i * 0.04;
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.3);
    }
};

SB.Audio.prototype.playObstacleWarn = function() {
    if (!this.initialized) return;
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = 'sine';
    var now = this.ctx.currentTime;
    osc.frequency.value = 200;
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.05);
};

SB.audio = new SB.Audio();
SB.audio.loadMuteState();

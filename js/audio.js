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

SB.Audio.prototype.playMilestone = function() {
    if (!this.initialized) return;
    var now = this.ctx.currentTime;
    var notes = [523, 659, 784];
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
    var baseFreq = 500 + Math.min(count, 8) * 120;
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.linearRampToValueAtTime(baseFreq * 1.4, now + 0.08);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
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
    this._bgmGain.gain.linearRampToValueAtTime(0.05, now + 2.0);
    this._bgmGain.connect(this.masterGain);

    // Slow LFO for gentle volume pulsing
    this._bgmLfo = ctx.createOscillator();
    this._bgmLfo.type = 'sine';
    this._bgmLfo.frequency.value = 0.12;
    var lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.012;
    this._bgmLfo.connect(lfoGain);
    lfoGain.connect(this._bgmGain.gain);
    this._bgmLfo.start(now);

    // Ambient pad: three triangle waves for warm chord
    var notes = [130.81, 196.00, 261.63]; // C3, G3, C4
    var volumes = [0.5, 0.3, 0.15];
    this._bgmOscs = [];

    for (var i = 0; i < notes.length; i++) {
        var osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = notes[i];
        if (i > 0) osc.detune.value = SB.randRange(-4, 4);
        var g = ctx.createGain();
        g.gain.value = volumes[i];
        osc.connect(g);
        g.connect(this._bgmGain);
        osc.start(now);
        this._bgmOscs.push(osc);
    }
};

SB.Audio.prototype.updateBGMIntensity = function(difficulty) {
    if (!this._bgmPlaying || !this._bgmLfo) return;
    // Speed up LFO pulsing with difficulty (0.12 → 0.5 Hz)
    var targetFreq = SB.lerp(0.12, 0.5, difficulty);
    this._bgmLfo.frequency.value = targetFreq;

    // Chord progression based on difficulty zone
    // CALM: C major (C3, G3, C4)
    // RISING: A minor (A2, E3, A3)
    // INTENSE: D minor (D3, A3, D4)
    // EXTREME: B diminished (B2, F3, B3)
    if (this._bgmOscs && this._bgmOscs.length === 3) {
        var now = this.ctx.currentTime;
        var chords = [
            [130.81, 196.00, 261.63],  // C3, G3, C4
            [110.00, 164.81, 220.00],  // A2, E3, A3
            [146.83, 220.00, 293.66],  // D3, A3, D4
            [123.47, 174.61, 246.94]   // B2, F3, B3
        ];
        var ci = difficulty < 0.3 ? 0 : (difficulty < 0.5 ? 1 : (difficulty < 0.8 ? 2 : 3));
        var chord = chords[ci];
        for (var i = 0; i < 3; i++) {
            this._bgmOscs[i].frequency.linearRampToValueAtTime(chord[i], now + 0.5);
        }
    }
};

SB.Audio.prototype.stopBGM = function() {
    if (!this._bgmPlaying) return;
    this._bgmPlaying = false;

    var now = this.ctx.currentTime;
    this._bgmGain.gain.cancelScheduledValues(now);
    this._bgmGain.gain.setValueAtTime(this._bgmGain.gain.value, now);
    this._bgmGain.gain.linearRampToValueAtTime(0.001, now + 1.0);

    for (var i = 0; i < this._bgmOscs.length; i++) {
        this._bgmOscs[i].stop(now + 1.1);
    }
    this._bgmLfo.stop(now + 1.1);
};

SB.audio = new SB.Audio();
SB.audio.loadMuteState();

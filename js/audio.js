window.SB = window.SB || {};

SB.Audio = function() {
    this.ctx = null;
    this.masterGain = null;
    this.initialized = false;
};

SB.Audio.prototype.init = function() {
    if (this.initialized) return;
    try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3;
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

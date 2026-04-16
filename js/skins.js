window.SB = window.SB || {};

SB.SKINS = [
    { id: 'default',  name: 'Classic',  core: '#FFFFFF', glow: '#FFD700', trail: 'rgba(255,215,0,',   unlockLevel: 0 },
    { id: 'fire',     name: 'Fire',     core: '#FFEB3B', glow: '#FF5722', trail: 'rgba(255,87,34,',   unlockLevel: 3 },
    { id: 'ice',      name: 'Ice',      core: '#E0F7FA', glow: '#00BCD4', trail: 'rgba(0,188,212,',   unlockLevel: 5 },
    { id: 'neon',     name: 'Neon',     core: '#E8F5E9', glow: '#76FF03', trail: 'rgba(118,255,3,',   unlockLevel: 8 },
    { id: 'phantom',  name: 'Phantom',  core: '#E1BEE7', glow: '#9C27B0', trail: 'rgba(156,39,176,',  unlockLevel: 12 },
    { id: 'solar',    name: 'Solar',    core: '#FFF9C4', glow: '#FF9800', trail: 'rgba(255,152,0,',   unlockLevel: 15 },
    { id: 'ocean',    name: 'Ocean',    core: '#E0F7FA', glow: '#006064', trail: 'rgba(0,96,100,',    unlockLevel: 20 },
    { id: 'galaxy',   name: 'Galaxy',   core: '#F3E5F5', glow: '#E91E63', trail: 'rgba(233,30,99,',   unlockLevel: 25 }
];

SB.SkinManager = function() {
    this.currentSkinId = 'default';
    this._load();
};

SB.SkinManager.prototype._load = function() {
    try {
        var saved = localStorage.getItem('skyBounce_skin');
        if (saved) this.currentSkinId = saved;
    } catch (e) {}
};

SB.SkinManager.prototype._save = function() {
    try {
        localStorage.setItem('skyBounce_skin', this.currentSkinId);
    } catch (e) {}
};

SB.SkinManager.prototype.selectSkin = function(id) {
    this.currentSkinId = id;
    this._save();
};

SB.SkinManager.prototype.getCurrentSkin = function() {
    for (var i = 0; i < SB.SKINS.length; i++) {
        if (SB.SKINS[i].id === this.currentSkinId) return SB.SKINS[i];
    }
    return SB.SKINS[0];
};

SB.SkinManager.prototype.getAvailableSkins = function(level) {
    var available = [];
    for (var i = 0; i < SB.SKINS.length; i++) {
        available.push({
            skin: SB.SKINS[i],
            unlocked: level >= SB.SKINS[i].unlockLevel,
            selected: SB.SKINS[i].id === this.currentSkinId
        });
    }
    return available;
};

// XP / Level system
SB.Progression = function() {
    this.xp = 0;
    this.level = 1;
    this._load();
};

SB.Progression.prototype._load = function() {
    try {
        var data = localStorage.getItem('skyBounce_progression');
        if (data) {
            var parsed = JSON.parse(data);
            this.xp = parsed.xp || 0;
            this.level = parsed.level || 1;
        }
    } catch (e) {}
};

SB.Progression.prototype._save = function() {
    try {
        localStorage.setItem('skyBounce_progression', JSON.stringify({
            xp: this.xp,
            level: this.level
        }));
    } catch (e) {}
};

SB.Progression.prototype.addRunXP = function(score, starsCollected) {
    var earned = Math.floor(score / 5) + starsCollected * 2;
    this.xp += earned;

    // Level thresholds: 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3250, ...
    var oldLevel = this.level;
    this.level = this._calcLevel(this.xp);
    this._save();

    return {
        xpEarned: earned,
        leveledUp: this.level > oldLevel,
        newLevel: this.level,
        oldLevel: oldLevel
    };
};

SB.Progression.prototype._calcLevel = function(xp) {
    var level = 1;
    var required = 100;
    var remaining = xp;
    while (remaining >= required && level < 50) {
        remaining -= required;
        level++;
        required = Math.floor(100 + (level - 1) * 50 * 1.2);
    }
    return level;
};

SB.Progression.prototype.getXPForCurrentLevel = function() {
    var xp = this.xp;
    var level = 1;
    var required = 100;
    while (level < this.level && level < 50) {
        xp -= required;
        level++;
        required = Math.floor(100 + (level - 1) * 50 * 1.2);
    }
    return { current: xp, required: required };
};

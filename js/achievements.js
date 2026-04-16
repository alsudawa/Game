window.SB = window.SB || {};

// Achievement definitions
SB.ACHIEVEMENTS = [
    { id: 'first_bounce',  name: 'First Bounce',     desc: 'Score 1 point',              icon: '🏐', check: function(s) { return s.totalScore >= 1; } },
    { id: 'sky_walker',    name: 'Sky Walker',        desc: 'Score 50 in one run',        icon: '🚀', check: function(s) { return s.bestScore >= 50; } },
    { id: 'astronaut',     name: 'Astronaut',         desc: 'Score 100 in one run',       icon: '🧑‍🚀', check: function(s) { return s.bestScore >= 100; } },
    { id: 'star_hunter',   name: 'Star Hunter',       desc: 'Collect 10 stars in one run', icon: '⭐', check: function(s) { return s.runStars >= 10; } },
    { id: 'star_master',   name: 'Star Master',       desc: 'Collect 50 stars total',     icon: '🌟', check: function(s) { return s.totalStars >= 50; } },
    { id: 'combo_king',    name: 'Combo King',        desc: 'Get a 3x combo',             icon: '🔥', check: function(s) { return s.bestCombo >= 3; } },
    { id: 'survivor',      name: 'Survivor',          desc: 'Survive 30 seconds',         icon: '⏱️', check: function(s) { return s.runTime >= 30; } },
    { id: 'shield_save',   name: 'Close Call',        desc: 'Use a shield to survive',    icon: '🛡️', check: function(s) { return s.shieldUsed >= 1; } },
    { id: 'power_player',  name: 'Power Player',      desc: 'Collect 10 powerups total',  icon: '⚡', check: function(s) { return s.totalPowerups >= 10; } },
    { id: 'dedicated',     name: 'Dedicated',         desc: 'Play 20 games',              icon: '🎮', check: function(s) { return s.totalGames >= 20; } }
];

SB.AchievementManager = function() {
    this.unlocked = {};
    this.stats = {
        totalScore: 0,
        bestScore: 0,
        totalStars: 0,
        runStars: 0,
        bestCombo: 0,
        runTime: 0,
        shieldUsed: 0,
        totalPowerups: 0,
        totalGames: 0
    };
    this.pendingNotifications = [];
    this._load();
};

SB.AchievementManager.prototype._load = function() {
    try {
        var data = localStorage.getItem('skyBounce_achievements');
        if (data) {
            var parsed = JSON.parse(data);
            this.unlocked = parsed.unlocked || {};
            // Merge stats (keep existing keys)
            var saved = parsed.stats || {};
            for (var key in saved) {
                if (this.stats.hasOwnProperty(key)) {
                    this.stats[key] = saved[key];
                }
            }
        }
    } catch (e) {}
};

SB.AchievementManager.prototype._save = function() {
    try {
        localStorage.setItem('skyBounce_achievements', JSON.stringify({
            unlocked: this.unlocked,
            stats: this.stats
        }));
    } catch (e) {}
};

SB.AchievementManager.prototype.onRunStart = function() {
    this.stats.runStars = 0;
    this.stats.runTime = 0;
    this.stats.totalGames++;
    this._save();
};

SB.AchievementManager.prototype.onRunEnd = function(score) {
    this.stats.totalScore += Math.floor(score);
    if (score > this.stats.bestScore) {
        this.stats.bestScore = Math.floor(score);
    }
    this._save();
    this.checkAll();
};

SB.AchievementManager.prototype.onStarCollect = function() {
    this.stats.runStars++;
    this.stats.totalStars++;
    this._save();
};

SB.AchievementManager.prototype.onCombo = function(count) {
    if (count > this.stats.bestCombo) {
        this.stats.bestCombo = count;
        this._save();
    }
};

SB.AchievementManager.prototype.onShieldUse = function() {
    this.stats.shieldUsed++;
    this._save();
};

SB.AchievementManager.prototype.onPowerupCollect = function() {
    this.stats.totalPowerups++;
    this._save();
};

SB.AchievementManager.prototype.updateRunTime = function(dt) {
    this.stats.runTime += dt;
};

SB.AchievementManager.prototype.checkAll = function() {
    for (var i = 0; i < SB.ACHIEVEMENTS.length; i++) {
        var ach = SB.ACHIEVEMENTS[i];
        if (!this.unlocked[ach.id] && ach.check(this.stats)) {
            this.unlocked[ach.id] = true;
            this.pendingNotifications.push(ach);
        }
    }
    this._save();
};

SB.AchievementManager.prototype.getUnlockedCount = function() {
    var count = 0;
    for (var key in this.unlocked) {
        if (this.unlocked[key]) count++;
    }
    return count;
};

SB.AchievementManager.prototype.popNotification = function() {
    if (this.pendingNotifications.length > 0) {
        return this.pendingNotifications.shift();
    }
    return null;
};

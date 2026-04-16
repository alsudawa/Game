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
    { id: 'dedicated',     name: 'Dedicated',         desc: 'Play 20 games',              icon: '🎮', check: function(s) { return s.totalGames >= 20; } },
    { id: 'legend',        name: 'Legend',            desc: 'Score 200 in one run',       icon: '👑', check: function(s) { return s.bestScore >= 200; } },
    { id: 'long_run',      name: 'Endurance',         desc: 'Survive 60 seconds',         icon: '⏰', check: function(s) { return s.runTime >= 60; } },
    { id: 'star_collector', name: 'Star Collector',   desc: 'Collect 200 stars total',    icon: '✨', check: function(s) { return s.totalStars >= 200; } },
    { id: 'combo_master',  name: 'Combo Master',      desc: 'Get a 5x combo',             icon: '💥', check: function(s) { return s.bestCombo >= 5; } },
    { id: 'veteran',       name: 'Veteran',           desc: 'Play 50 games',              icon: '🏆', check: function(s) { return s.totalGames >= 50; } },
    { id: 'bouncy',        name: 'Bouncy',            desc: 'Bounce 500 times total',     icon: '🏀', check: function(s) { return s.totalBounces >= 500; } },
    { id: 'near_miss_pro', name: 'Daredevil',         desc: 'Get 10 near-misses total',   icon: '😎', check: function(s) { return s.totalNearMisses >= 10; } },
    { id: 'coin_hoard',    name: 'Coin Hoarder',      desc: 'Earn 100 coins total',       icon: '💰', check: function(s) { return s.totalCoinsEarned >= 100; } },
    { id: 'marathon',      name: 'Marathon',           desc: 'Survive 90 seconds',         icon: '🏃', check: function(s) { return s.runTime >= 90; } },
    { id: 'perfectionist', name: 'Perfectionist',      desc: 'Score 300 in one run',       icon: '💎', check: function(s) { return s.bestScore >= 300; } }
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
        totalGames: 0,
        totalBounces: 0,
        totalNearMisses: 0,
        totalCoinsEarned: 0
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

SB.AchievementManager.prototype.onBounce = function() {
    this.stats.totalBounces++;
};

SB.AchievementManager.prototype.onNearMiss = function() {
    this.stats.totalNearMisses++;
    this._save();
};

SB.AchievementManager.prototype.onCoinEarn = function(amount) {
    this.stats.totalCoinsEarned += (amount || 1);
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

SB.AchievementManager.prototype.getProgress = function(ach) {
    // Returns { current, target } for displayable progress
    var s = this.stats;
    switch (ach.id) {
        case 'first_bounce': return { current: Math.min(s.totalScore, 1), target: 1 };
        case 'sky_walker': return { current: Math.min(s.bestScore, 50), target: 50 };
        case 'astronaut': return { current: Math.min(s.bestScore, 100), target: 100 };
        case 'legend': return { current: Math.min(s.bestScore, 200), target: 200 };
        case 'star_hunter': return { current: Math.min(s.runStars, 10), target: 10 };
        case 'star_master': return { current: Math.min(s.totalStars, 50), target: 50 };
        case 'star_collector': return { current: Math.min(s.totalStars, 200), target: 200 };
        case 'combo_king': return { current: Math.min(s.bestCombo, 3), target: 3 };
        case 'combo_master': return { current: Math.min(s.bestCombo, 5), target: 5 };
        case 'survivor': return { current: Math.floor(Math.min(s.runTime, 30)), target: 30 };
        case 'long_run': return { current: Math.floor(Math.min(s.runTime, 60)), target: 60 };
        case 'shield_save': return { current: Math.min(s.shieldUsed, 1), target: 1 };
        case 'power_player': return { current: Math.min(s.totalPowerups, 10), target: 10 };
        case 'dedicated': return { current: Math.min(s.totalGames, 20), target: 20 };
        case 'veteran': return { current: Math.min(s.totalGames, 50), target: 50 };
        case 'bouncy': return { current: Math.min(s.totalBounces, 500), target: 500 };
        case 'near_miss_pro': return { current: Math.min(s.totalNearMisses, 10), target: 10 };
        case 'coin_hoard': return { current: Math.min(s.totalCoinsEarned, 100), target: 100 };
        case 'marathon': return { current: Math.floor(Math.min(s.runTime, 90)), target: 90 };
        case 'perfectionist': return { current: Math.min(s.bestScore, 300), target: 300 };
        default: return null;
    }
};

SB.AchievementManager.prototype.popNotification = function() {
    if (this.pendingNotifications.length > 0) {
        return this.pendingNotifications.shift();
    }
    return null;
};

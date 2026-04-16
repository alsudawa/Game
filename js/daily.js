window.SB = window.SB || {};

SB.DAILY_CHALLENGES = [
    { id: 'speed',    name: 'Speed Demon',    desc: 'Obstacles 1.5x faster',     mods: { obstacleSpeed: 1.5 }, target: 30 },
    { id: 'feather',  name: 'Featherweight',  desc: 'Reduced gravity',           mods: { gravity: 0.7 },       target: 40 },
    { id: 'giant',    name: 'Giant Hazards',  desc: 'Obstacles 30% larger',      mods: { obstacleSize: 1.3 },  target: 25 },
    { id: 'star',     name: 'Star Rush',      desc: 'Stars worth double',        mods: { starValue: 2 },       target: 50 },
    { id: 'heavy',    name: 'Iron Ball',      desc: 'Heavy gravity',             mods: { gravity: 1.35 },      target: 30 },
    { id: 'tiny',     name: 'Tiny Ball',      desc: 'Smaller ball',              mods: { ballSize: 0.7 },      target: 25 },
    { id: 'marathon', name: 'Marathon',        desc: 'Survive to 60!',           mods: {},                      target: 60 }
];

SB.DailyChallenge = function() {
    this.todayKey = this._dateKey();
    this.challenge = this._pick();
    this.completed = false;
    this.bestScore = 0;
    this._load();
};

SB.DailyChallenge.prototype._dateKey = function() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
};

SB.DailyChallenge.prototype._pick = function() {
    var key = this.todayKey;
    var hash = 0;
    for (var i = 0; i < key.length; i++) {
        hash = ((hash << 5) - hash) + key.charCodeAt(i);
        hash = hash & hash;
    }
    return SB.DAILY_CHALLENGES[Math.abs(hash) % SB.DAILY_CHALLENGES.length];
};

SB.DailyChallenge.prototype._load = function() {
    try {
        var data = localStorage.getItem('skyBounce_daily');
        if (data) {
            var p = JSON.parse(data);
            if (p.key === this.todayKey) {
                this.completed = p.completed || false;
                this.bestScore = p.bestScore || 0;
            }
        }
    } catch (e) {}
};

SB.DailyChallenge.prototype._save = function() {
    try {
        localStorage.setItem('skyBounce_daily', JSON.stringify({
            key: this.todayKey,
            completed: this.completed,
            bestScore: this.bestScore
        }));
    } catch (e) {}
};

SB.DailyChallenge.prototype.onRunEnd = function(score) {
    var wasCompleted = this.completed;
    if (score > this.bestScore) this.bestScore = Math.floor(score);
    if (!this.completed && score >= this.challenge.target) this.completed = true;
    this._save();
    return !wasCompleted && this.completed;
};

SB.DailyChallenge.prototype.getBonusXP = function() {
    return this.completed ? 25 : 0;
};

SB.DailyChallenge.prototype.getMods = function() {
    return this.challenge.mods || {};
};

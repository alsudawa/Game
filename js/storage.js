window.SB = window.SB || {};

SB.Storage = {
    getHighScore: function() {
        try {
            var val = localStorage.getItem('skyBounce_highScore');
            return val ? parseInt(val, 10) : 0;
        } catch (e) {
            return 0;
        }
    },

    setHighScore: function(score) {
        try {
            var current = this.getHighScore();
            if (score > current) {
                localStorage.setItem('skyBounce_highScore', score.toString());
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    },

    isNewHighScore: function(score) {
        return score > this.getHighScore();
    },

    getLeaderboard: function() {
        try {
            var data = localStorage.getItem('skyBounce_leaderboard');
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    },

    addToLeaderboard: function(score) {
        var board = this.getLeaderboard();
        board.push({ score: Math.floor(score), time: Date.now() });
        board.sort(function(a, b) { return b.score - a.score; });
        if (board.length > 10) board.length = 10;
        try {
            localStorage.setItem('skyBounce_leaderboard', JSON.stringify(board));
        } catch (e) {}
        return board;
    },

    getCoins: function() {
        try {
            var val = localStorage.getItem('skyBounce_coins');
            return val ? parseInt(val, 10) : 0;
        } catch (e) { return 0; }
    },

    addCoins: function(amount) {
        try {
            var current = this.getCoins();
            localStorage.setItem('skyBounce_coins', (current + amount).toString());
        } catch (e) {}
    },

    spendCoins: function(amount) {
        var current = this.getCoins();
        if (current >= amount) {
            try {
                localStorage.setItem('skyBounce_coins', (current - amount).toString());
            } catch (e) {}
            return true;
        }
        return false;
    },

    getRank: function(score) {
        var board = this.getLeaderboard();
        var s = Math.floor(score);
        for (var i = 0; i < board.length; i++) {
            if (s >= board[i].score) return i + 1;
        }
        return board.length + 1;
    },

    getStreak: function() {
        try {
            var data = localStorage.getItem('skyBounce_streak');
            return data ? JSON.parse(data) : { current: 0, best: 0, lastDay: '' };
        } catch (e) { return { current: 0, best: 0, lastDay: '' }; }
    },

    updateStreak: function() {
        var streak = this.getStreak();
        var today = new Date().toISOString().slice(0, 10);
        if (streak.lastDay === today) return streak; // Already played today

        var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        if (streak.lastDay === yesterday) {
            streak.current++;
        } else {
            streak.current = 1;
        }
        if (streak.current > streak.best) streak.best = streak.current;
        streak.lastDay = today;
        try {
            localStorage.setItem('skyBounce_streak', JSON.stringify(streak));
        } catch (e) {}
        return streak;
    },

    getRecentRuns: function() {
        try {
            var data = localStorage.getItem('skyBounce_recentRuns');
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    },

    addRecentRun: function(score) {
        var runs = this.getRecentRuns();
        runs.push(Math.floor(score));
        if (runs.length > 5) runs.shift();
        try {
            localStorage.setItem('skyBounce_recentRuns', JSON.stringify(runs));
        } catch (e) {}
        return runs;
    },

    getLifetimeStats: function() {
        try {
            var data = localStorage.getItem('skyBounce_lifetime');
            return data ? JSON.parse(data) : { totalGames: 0, totalCoins: 0, totalScore: 0 };
        } catch (e) { return { totalGames: 0, totalCoins: 0, totalScore: 0 }; }
    },

    updateLifetimeStats: function(score, coins) {
        var stats = this.getLifetimeStats();
        stats.totalGames++;
        stats.totalCoins += (coins || 0);
        stats.totalScore += Math.floor(score || 0);
        try {
            localStorage.setItem('skyBounce_lifetime', JSON.stringify(stats));
        } catch (e) {}
        return stats;
    },

    getLastRun: function() {
        try {
            var data = localStorage.getItem('skyBounce_lastRun');
            return data ? JSON.parse(data) : null;
        } catch (e) { return null; }
    },

    saveLastRun: function(runData) {
        try {
            localStorage.setItem('skyBounce_lastRun', JSON.stringify(runData));
        } catch (e) {}
    },

    getHighContrast: function() {
        try {
            return localStorage.getItem('skyBounce_hc') === '1';
        } catch (e) { return false; }
    },

    setHighContrast: function(on) {
        try {
            localStorage.setItem('skyBounce_hc', on ? '1' : '0');
        } catch (e) {}
    }
};

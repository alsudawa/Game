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

    getRank: function(score) {
        var board = this.getLeaderboard();
        var s = Math.floor(score);
        for (var i = 0; i < board.length; i++) {
            if (s >= board[i].score) return i + 1;
        }
        return board.length + 1;
    }
};

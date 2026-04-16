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
    }
};

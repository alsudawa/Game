window.SB = window.SB || {};

SB.Input = function(canvas) {
    this.canvas = canvas;
    this.tapped = false;
    this.tapX = 0;
    this.tapY = 0;
    this._firstInteraction = false;

    var self = this;

    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (e.touches.length > 1) return;
        var touch = e.touches[0];
        self.tapX = touch.clientX;
        self.tapY = touch.clientY;
        self._checkShareButton(touch.clientX, touch.clientY);
        self._checkSkinButton(touch.clientX, touch.clientY);
        self._checkAchButton(touch.clientX, touch.clientY);
        self._checkReviveButton(touch.clientX, touch.clientY);
        self.tapped = true;
        self._handleFirstInteraction();
    }, { passive: false });

    canvas.addEventListener('mousedown', function(e) {
        self.tapX = e.clientX;
        self.tapY = e.clientY;
        self._checkShareButton(e.clientX, e.clientY);
        self._checkSkinButton(e.clientX, e.clientY);
        self._checkAchButton(e.clientX, e.clientY);
        self._checkReviveButton(e.clientX, e.clientY);
        self.tapped = true;
        self._handleFirstInteraction();
    });
};

SB.Input.prototype._handleFirstInteraction = function() {
    if (!this._firstInteraction) {
        this._firstInteraction = true;
        if (SB.audio) {
            SB.audio.init();
        }
    }
};

SB.Input.prototype._checkShareButton = function(x, y) {
    if (SB._shareBtn) {
        var btn = SB._shareBtn;
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
            SB.shareScore(btn.score);
            this.tapped = false; // Don't treat share tap as game tap
        }
    }
};

SB.Input.prototype._checkSkinButton = function(x, y) {
    if (SB._skinBtns) {
        for (var i = 0; i < SB._skinBtns.length; i++) {
            var btn = SB._skinBtns[i];
            var dx = x - btn.x;
            var dy = y - btn.y;
            if (dx * dx + dy * dy < btn.r * btn.r) {
                if (btn.unlocked) {
                    SB._skinTapped = btn.skinId;
                } else {
                    SB._skinLocked = btn.unlockLevel;
                }
                this.tapped = false;
                return;
            }
        }
    }
};

SB.Input.prototype._checkAchButton = function(x, y) {
    if (SB._achBtn) {
        var btn = SB._achBtn;
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
            SB._achBtnTapped = true;
            this.tapped = false;
            return;
        }
    }
};

SB.Input.prototype._checkReviveButton = function(x, y) {
    if (SB._reviveBtn) {
        var btn = SB._reviveBtn;
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
            SB._reviveBtnTapped = true;
            this.tapped = false;
            return;
        }
    }
};

SB.Input.prototype.consumeTap = function() {
    if (this.tapped) {
        this.tapped = false;
        return true;
    }
    return false;
};

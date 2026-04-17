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
        self._checkPlayAgainButton(touch.clientX, touch.clientY);
        self._checkShareButton(touch.clientX, touch.clientY);
        self._checkSkinButton(touch.clientX, touch.clientY);
        self._checkAchButton(touch.clientX, touch.clientY);
        self._checkReviveButton(touch.clientX, touch.clientY);
        self._checkMuteButton(touch.clientX, touch.clientY);
        self._checkHCButton(touch.clientX, touch.clientY);
        self._checkPauseButton(touch.clientX, touch.clientY);
        self._checkResumeQuitButtons(touch.clientX, touch.clientY);
        self.tapped = true;
        self._handleFirstInteraction();
    }, { passive: false });

    // Prevent context menu on long-press (mobile)
    canvas.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });

    // Prevent double-tap zoom
    canvas.addEventListener('touchend', function(e) {
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('mousedown', function(e) {
        self.tapX = e.clientX;
        self.tapY = e.clientY;
        self._checkPlayAgainButton(e.clientX, e.clientY);
        self._checkShareButton(e.clientX, e.clientY);
        self._checkSkinButton(e.clientX, e.clientY);
        self._checkAchButton(e.clientX, e.clientY);
        self._checkReviveButton(e.clientX, e.clientY);
        self._checkMuteButton(e.clientX, e.clientY);
        self._checkHCButton(e.clientX, e.clientY);
        self._checkPauseButton(e.clientX, e.clientY);
        self._checkResumeQuitButtons(e.clientX, e.clientY);
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

SB.Input.prototype._checkPlayAgainButton = function(x, y) {
    if (SB._playAgainBtn) {
        var btn = SB._playAgainBtn;
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
            SB._playAgainTapped = true;
            this.tapped = false;
            return;
        }
    }
};

SB.Input.prototype._checkShareButton = function(x, y) {
    if (SB._shareBtn) {
        var btn = SB._shareBtn;
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
            SB._shareTapped = true;
            SB.shareScore(btn.score);
            this.tapped = false;
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

SB.Input.prototype._checkPauseButton = function(x, y) {
    if (SB._pauseBtn) {
        var btn = SB._pauseBtn;
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
            SB._pauseBtnTapped = true;
            this.tapped = false;
            return;
        }
    }
};

SB.Input.prototype._checkResumeQuitButtons = function(x, y) {
    if (SB._resumeBtn) {
        var btn = SB._resumeBtn;
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
            SB._resumeBtnTapped = true;
            this.tapped = false;
            return;
        }
    }
    if (SB._quitBtn) {
        var btn = SB._quitBtn;
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
            SB._quitBtnTapped = true;
            this.tapped = false;
            return;
        }
    }
};

SB.Input.prototype._checkMuteButton = function(x, y) {
    if (SB._muteBtn) {
        var btn = SB._muteBtn;
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
            SB.audio.toggleMute();
            this.tapped = false;
            return;
        }
    }
};

SB.Input.prototype._checkHCButton = function(x, y) {
    if (SB._hcBtn) {
        var btn = SB._hcBtn;
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
            SB.highContrast = !SB.highContrast;
            SB.Storage.setHighContrast(SB.highContrast);
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

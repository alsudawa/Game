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
        var touch = e.touches[0];
        self.tapX = touch.clientX;
        self.tapY = touch.clientY;
        self.tapped = true;
        self._handleFirstInteraction();
    }, { passive: false });

    canvas.addEventListener('mousedown', function(e) {
        self.tapX = e.clientX;
        self.tapY = e.clientY;
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

SB.Input.prototype.consumeTap = function() {
    if (this.tapped) {
        this.tapped = false;
        return true;
    }
    return false;
};

window.SB = window.SB || {};

(function() {
    var canvas, ctx, game;
    var lastTime = 0;
    var accumulator = 0;
    var TICK_RATE = 1000 / 60;

    function resizeCanvas() {
        var dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';

        SB.canvasWidth = window.innerWidth;
        SB.canvasHeight = window.innerHeight;

        if (game) {
            game.onResize(SB.canvasWidth, SB.canvasHeight);
        }
    }

    function gameLoop(timestamp) {
        if (lastTime === 0) {
            lastTime = timestamp;
        }

        var deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        var cappedDelta = Math.min(deltaTime, 100);
        accumulator += cappedDelta;

        SB.frameTime = timestamp;

        try {
            while (accumulator >= TICK_RATE) {
                game.update(TICK_RATE / 1000);
                accumulator -= TICK_RATE;
            }
            game.render(ctx, SB.canvasWidth, SB.canvasHeight);

            // Landscape orientation hint (mobile only: screen width > height and < 900px)
            if (SB.canvasWidth > SB.canvasHeight && SB.canvasHeight < 500) {
                ctx.save();
                ctx.fillStyle = 'rgba(0,0,0,0.85)';
                ctx.fillRect(0, 0, SB.canvasWidth, SB.canvasHeight);
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = 'bold ' + Math.min(SB.canvasWidth * 0.05, 24) + 'px sans-serif';
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText('Please rotate to portrait', SB.canvasWidth / 2, SB.canvasHeight / 2 - 15);
                ctx.font = Math.min(SB.canvasWidth * 0.08, 36) + 'px sans-serif';
                ctx.fillText('\u21BB', SB.canvasWidth / 2, SB.canvasHeight / 2 + 25);
                ctx.restore();
            }
        } catch (e) {
            // Recover by resetting to start state
            if (window.console) console.error('Game error:', e);
            game.state = SB.STATES.START;
            accumulator = 0;
        }

        requestAnimationFrame(gameLoop);
    }

    document.addEventListener('DOMContentLoaded', function() {
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('orientationchange', function() {
            setTimeout(resizeCanvas, 100);
        });

        SB.highContrast = SB.Storage.getHighContrast();
        SB.reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        game = new SB.Game(canvas);
        game.init();

        requestAnimationFrame(gameLoop);
    });
})();

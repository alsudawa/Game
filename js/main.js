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
        ctx.scale(dpr, dpr);
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

        while (accumulator >= TICK_RATE) {
            game.update(TICK_RATE / 1000);
            accumulator -= TICK_RATE;
        }

        game.render(ctx, SB.canvasWidth, SB.canvasHeight);
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

        game = new SB.Game(canvas);
        game.init();

        requestAnimationFrame(gameLoop);
    });
})();

window.SB = window.SB || {};

SB.TAU = Math.PI * 2;

SB.clamp = function(value, min, max) {
    return Math.max(min, Math.min(max, value));
};

SB.lerp = function(a, b, t) {
    return a + (b - a) * t;
};

SB.randRange = function(min, max) {
    return Math.random() * (max - min) + min;
};

SB.randInt = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

SB.easeOutCubic = function(t) {
    return 1 - Math.pow(1 - t, 3);
};

SB.easeInOutQuad = function(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

SB.circleRectCollision = function(circle, rect) {
    var closestX = SB.clamp(circle.x, rect.x, rect.x + rect.width);
    var closestY = SB.clamp(circle.y, rect.y, rect.y + rect.height);
    var dx = circle.x - closestX;
    var dy = circle.y - closestY;
    return (dx * dx + dy * dy) < (circle.radius * circle.radius);
};

SB.circleCircleCollision = function(c1, c2) {
    var dx = c1.x - c2.x;
    var dy = c1.y - c2.y;
    var dist = c1.radius + c2.radius;
    return (dx * dx + dy * dy) < (dist * dist);
};

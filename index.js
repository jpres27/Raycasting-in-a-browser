"use strict";
const ROWS = 10;
const COLS = 10;
class v2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    Array() {
        return [this.x, this.y];
    }
}
function DrawLine(context, p1, p2) {
    context.beginPath();
    context.moveTo(...p1.Array());
    context.lineTo(...p2.Array());
    context.stroke();
}
function DrawFilledCircle(context, center, radius) {
    context.beginPath();
    context.arc(...center.Array(), radius, 0, 2 * Math.PI);
    context.fill();
}
function RayStep(p1, p2) {
}
(() => {
    const game = document.getElementById("game");
    if (game === null) {
        throw new Error("Null game canvas");
    }
    game.width = 800;
    game.height = 800;
    const context = game.getContext("2d");
    if (context === null) {
        throw new Error("2d context is null");
    }
    context.fillStyle = "#181818";
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    context.scale(context.canvas.width / COLS, context.canvas.height / ROWS);
    context.lineWidth = 0.01;
    context.strokeStyle = "#303030";
    for (let x = 0; x <= COLS; ++x) {
        DrawLine(context, new v2(x, 0), new v2(x, ROWS));
    }
    for (let y = 0; y <= ROWS; ++y) {
        DrawLine(context, new v2(0, y), new v2(COLS, y));
    }
    const p1 = new v2(COLS * 0.43, ROWS * 0.33);
    const p2 = new v2(COLS * 0.33, ROWS * 0.43);
    context.fillStyle = "magenta";
    DrawFilledCircle(context, p1, 0.2);
    DrawFilledCircle(context, p2, 0.2);
    context.strokeStyle = "magenta";
    DrawLine(context, p1, p2);
})();

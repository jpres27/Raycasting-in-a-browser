"use strict";
const EPSILON = 1e-3;
const NEAR_PLANE = 1.0;
const FOV = Math.PI * 0.5;
const RAYS = 100;
class v2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    static Zero() {
        return new v2(0, 0);
    }
    static FromAngle(angle) {
        return new v2(Math.cos(angle), Math.sin(angle));
    }
    Add(that) {
        return new v2(this.x + that.x, this.y + that.y);
    }
    Subtract(that) {
        return new v2(this.x - that.x, this.y - that.y);
    }
    Divide(that) {
        return new v2(this.x / that.x, this.y / that.y);
    }
    Multiply(that) {
        return new v2(this.x * that.x, this.y * that.y);
    }
    Length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    Normalize() {
        if (this.Length() == 0)
            return new v2(0.0, 0.0);
        return new v2(this.x / this.Length(), this.y / this.Length());
    }
    Scale(val) {
        return new v2(this.x * val, this.y * val);
    }
    Rot90() {
        return new v2(-this.y, this.x);
    }
    Lerp(that, t) {
        return that.Subtract(this).Scale(t).Add(this);
    }
    DistanceTo(that) {
        return that.Subtract(this).Length();
    }
    Array() {
        return [this.x, this.y];
    }
}
class player {
    constructor(position, direction) {
        this.position = position;
        this.direction = direction;
    }
}
function GetFOV(Player) {
    const p = Player.position.Add(v2.FromAngle(Player.direction).Scale(NEAR_PLANE));
    const l = Math.tan(FOV * 0.5) * NEAR_PLANE;
    const p1 = p.Add(p.Subtract(Player.position).Rot90().Normalize().Scale(l));
    const p2 = p.Subtract(p.Subtract(Player.position).Rot90().Normalize().Scale(l));
    return [p1, p2];
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
function GetCanvasSize(context) {
    return new v2(context.canvas.width, context.canvas.height);
}
function SnapFloorCeiling(x, dx) {
    if (dx > 0)
        return Math.ceil(x + Math.sign(dx) * EPSILON);
    if (dx < 0)
        return Math.floor(x + Math.sign(dx) * EPSILON);
    return x;
}
function GetCell(p1, p2) {
    const d = p2.Subtract(p1);
    return new v2(Math.floor(p2.x + Math.sign(d.x) * EPSILON), Math.floor(p2.y + Math.sign(d.y) * EPSILON));
}
function RayStep(p1, p2) {
    let p3 = p2;
    const d = p2.Subtract(p1);
    if (d.x !== 0) {
        const m = d.y / d.x;
        const c = p1.y - m * p1.x;
        {
            const x3 = SnapFloorCeiling(p2.x, d.x);
            const y3 = x3 * m + c;
            p3 = new v2(x3, y3);
        }
        if (m !== 0) {
            const y3 = SnapFloorCeiling(p2.y, d.y);
            const x3 = (y3 - c) / m;
            const p3t = new v2(x3, y3);
            if (p2.DistanceTo(p3t) < p2.DistanceTo(p3)) {
                p3 = p3t;
            }
        }
    }
    else {
        const y3 = SnapFloorCeiling(p2.y, d.y);
        const x3 = p2.x;
        p3 = new v2(x3, y3);
    }
    return p3;
}
function CheckIfWithinLevel(Level_Map, p) {
    const size = GetLevelSize(Level_Map);
    return 0 <= p.x && p.x < size.x && 0 <= p.y && p.y < size.y;
}
function CastRay(Level_Map, p1, p2) {
    while (CheckIfWithinLevel(Level_Map, p2) && Level_Map[p2.y][p2.x] === 0) {
        const p3 = RayStep(p1, p2);
        p1 = p2;
        p2 = p3;
    }
    return p2;
}
function GetLevelSize(Level_Map) {
    const y = Level_Map.length;
    let x = Number.MIN_VALUE;
    for (let row of Level_Map) {
        x = Math.max(x, row.length);
    }
    return new v2(x, y);
}
function RenderMinimap(context, Player, position, size, level_map) {
    context.save();
    context.fillStyle = "#181818";
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    const grid_size = GetLevelSize(level_map);
    context.translate(...position.Array());
    context.scale(...size.Divide(grid_size).Array());
    context.lineWidth = 0.04;
    for (let y = 0; y < grid_size.y; ++y) {
        for (let x = 0; x < grid_size.x; ++x) {
            if (level_map[y][x] !== 0) {
                context.fillStyle = "#0000A8";
                context.fillRect(x, y, 1, 1);
            }
        }
    }
    context.strokeStyle = "#303030";
    for (let x = 0; x <= grid_size.x; ++x) {
        DrawLine(context, new v2(x, 0), new v2(x, grid_size.y));
    }
    for (let y = 0; y <= grid_size.y; ++y) {
        DrawLine(context, new v2(0, y), new v2(grid_size.x, y));
    }
    context.fillStyle = "yellow";
    DrawFilledCircle(context, Player.position, 0.2);
    const [p1, p2] = GetFOV(Player);
    context.strokeStyle = "yellow";
    //DrawLine(context, Player.position, p);
    DrawLine(context, Player.position, p1);
    DrawLine(context, Player.position, p2);
    context.restore();
}
function RenderGame(Context, Player, Level_Map) {
    const Strip_Width = Context.canvas.width / RAYS;
    const [p1, p2] = GetFOV(Player);
    Context.fillStyle = "green";
    for (let x = 0; x < RAYS; ++x) {
        const Ray_Collision_Point = CastRay(Level_Map, Player.position, p1.Lerp(p2, x / RAYS));
        const Cell = GetCell(Player.position, Ray_Collision_Point);
        if (CheckIfWithinLevel(Level_Map, Cell) && Level_Map[Cell.y][Cell.x] == 0) {
            Context.fillRect(x * Strip_Width, 0, Strip_Width, Context.canvas.height);
        }
    }
}
(() => {
    let Level_Data = [
        [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ];
    const Game = document.getElementById("game");
    if (Game === null) {
        throw new Error("Null game canvas");
    }
    let resolution_factor = 80;
    Game.width = 16 * resolution_factor;
    Game.height = 9 * resolution_factor;
    const Context = Game.getContext("2d");
    if (Context === null) {
        throw new Error("2d context is null");
    }
    const grid_size = GetCanvasSize(Context);
    let Player = new player(GetLevelSize(Level_Data).Multiply(new v2(0.93, 0.93)), 0);
    let Minimap_Pos = v2.Zero().Add(GetCanvasSize(Context).Scale(0.03));
    let Cell_Size = Context.canvas.width * 0.02;
    let Minimap_Size = GetLevelSize(Level_Data).Scale(Cell_Size);
    RenderGame(Context, Player, Level_Data);
    RenderMinimap(Context, Player, Minimap_Pos, Minimap_Size, Level_Data);
})();

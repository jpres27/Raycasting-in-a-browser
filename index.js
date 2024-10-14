"use strict";
const EPSILON = 1e-6;
const NEAR_PLANE = 0.25;
const FAR_PLANE = 10.0;
const FOV = Math.PI * 0.5;
const RAYS = 200;
const STEP_LENGTH = 0.3;
const SPEED = 3.6;
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
    Dot(that) {
        return this.x * that.x + this.y * that.y;
    }
    DistanceTo(that) {
        return that.Subtract(this).Length();
    }
    SqrLength() {
        return this.x * this.x + this.y * this.y;
    }
    SqrDistanceTo(that) {
        return that.Subtract(this).SqrLength();
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
    const p1 = p.Subtract(p.Subtract(Player.position).Rot90().Normalize().Scale(l));
    const p2 = p.Add(p.Subtract(Player.position).Rot90().Normalize().Scale(l));
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
            if (p2.SqrDistanceTo(p3t) < p2.SqrDistanceTo(p3)) {
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
function CastRay(Context, Level_Map, p1, p2) {
    let Start = p1;
    while (Start.SqrDistanceTo(p1) < Context.canvas.height * Context.canvas.height) {
        const cell = GetCell(p1, p2);
        if (CheckIfWithinLevel(Level_Map, cell) && Level_Map[cell.y][cell.x] !== 0) {
            break;
        }
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
    const grid_size = GetLevelSize(level_map);
    context.translate(...position.Array());
    context.scale(...size.Divide(grid_size).Array());
    context.lineWidth = 0.04;
    context.fillStyle = "#181818";
    context.fillRect(0, 0, ...grid_size.Array());
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
    const Strip_Width = Math.ceil(Context.canvas.width / RAYS);
    const [r1, r2] = GetFOV(Player);
    for (let x = 0; x < RAYS; ++x) {
        const Ray_Collision_Point = CastRay(Context, Level_Map, Player.position, r1.Lerp(r2, x / RAYS));
        const Cell = GetCell(Player.position, Ray_Collision_Point);
        if (CheckIfWithinLevel(Level_Map, Cell) && Level_Map[Cell.y][Cell.x] !== 0) {
            const v = Ray_Collision_Point.Subtract(Player.position);
            const d = v2.FromAngle(Player.direction);
            const PerpWallDist = v.Dot(d);
            const Wall_Height = Context.canvas.height / PerpWallDist;
            switch (Level_Map[Cell.y][Cell.x]) {
                case 1:
                    {
                        Context.fillStyle = `rgba(3, 99, 52, 1)`;
                    }
                    break;
                case 2:
                    {
                        Context.fillStyle = "blue";
                    }
                    break;
                case 3:
                    {
                        Context.fillStyle = "yellow";
                    }
                    break;
                case 4:
                    {
                        Context.fillStyle = "cyan";
                    }
                    break;
            }
            Context.fillRect(x * Strip_Width, (Context.canvas.height - Wall_Height) * 0.5, Strip_Width, Wall_Height);
        }
    }
}
function Render(Context, Player, Level_Data) {
    const Minimap_Pos = v2.Zero().Add(GetCanvasSize(Context).Scale(0.03));
    const Cell_Size = Context.canvas.width * 0.02;
    const Minimap_Size = GetLevelSize(Level_Data).Scale(Cell_Size);
    Context.fillStyle = "#181818";
    Context.fillRect(0, 0, Context.canvas.width, Context.canvas.height);
    RenderGame(Context, Player, Level_Data);
    RenderMinimap(Context, Player, Minimap_Pos, Minimap_Size, Level_Data);
}
(() => {
    let Level_Data = [
        [1, 4, 4, 4, 4, 1, 1, 1, 1, 1, 2],
        [2, 0, 0, 0, 0, 0, 0, 1, 0, 0, 2],
        [3, 0, 0, 0, 0, 0, 0, 1, 0, 0, 2],
        [4, 0, 0, 0, 0, 0, 0, 1, 0, 0, 2],
        [3, 0, 0, 0, 0, 0, 1, 1, 0, 0, 2],
        [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
        [2, 4, 3, 2, 3, 1, 4, 3, 2, 3, 4],
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
    let Player = new player(GetLevelSize(Level_Data).Multiply(new v2(0.83, 0.73)), Math.PI * 1.25);
    let MovingFwd = false;
    let MovingBwd = false;
    let TurnLeft = false;
    let TurnRight = false;
    window.addEventListener("keydown", (e) => {
        switch (e.code) {
            case 'KeyW':
                {
                    MovingFwd = true;
                }
                break;
            case 'KeyS':
                {
                    MovingBwd = true;
                }
                break;
            case 'KeyD':
                {
                    TurnRight = true;
                }
                break;
            case 'KeyA':
                {
                    TurnLeft = true;
                }
                break;
        }
    });
    window.addEventListener("keyup", (e) => {
        switch (e.code) {
            case 'KeyW':
                {
                    MovingFwd = false;
                }
                break;
            case 'KeyS':
                {
                    MovingBwd = false;
                }
                break;
            case 'KeyD':
                {
                    TurnRight = false;
                }
                break;
            case 'KeyA':
                {
                    TurnLeft = false;
                }
                break;
        }
    });
    const grid_size = GetCanvasSize(Context);
    let PrevTime = 0;
    const frame = function (Time) {
        const DeltaTime = (Time - PrevTime) / 1000;
        PrevTime = Time;
        let Velocity = v2.Zero();
        let AngularVelocity = 0.0;
        if (MovingFwd) {
            Velocity = Velocity.Add(v2.FromAngle(Player.direction).Scale(SPEED));
        }
        if (MovingBwd) {
            Velocity = Velocity.Subtract(v2.FromAngle(Player.direction).Scale(SPEED));
        }
        if (TurnRight) {
            AngularVelocity += Math.PI * 0.9;
        }
        if (TurnLeft) {
            AngularVelocity -= Math.PI * 0.9;
        }
        Player.direction = Player.direction + AngularVelocity * DeltaTime;
        Player.position = Player.position.Add(Velocity.Scale(DeltaTime));
        Render(Context, Player, Level_Data);
        window.requestAnimationFrame(frame);
    };
    window.requestAnimationFrame((Time) => {
        PrevTime = Time;
        window.requestAnimationFrame(frame);
    });
})();
//# sourceMappingURL=index.js.map
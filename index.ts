const EPSILON = 1e-3;
const NEAR_PLANE = 1.0;
const FAR_PLANE = 10.0;
const FOV = Math.PI*0.5;
const RAYS = 200;
const STEP_LENGTH = 0.3;

class v2 {
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    static Zero(): v2 {
        return new v2(0, 0);
    }

    static FromAngle(angle: number): v2 {
        return new v2(Math.cos(angle), Math.sin(angle));
    }

    Add(that: v2): v2 {
        return new v2(this.x + that.x, this.y + that.y);
    }

    Subtract(that: v2): v2 {
        return new v2(this.x - that.x, this.y - that.y);
    }

    Divide(that: v2): v2 {
        return new v2(this.x/that.x, this.y/that.y);
    }

    Multiply(that: v2): v2 {
        return new v2(this.x*that.x, this.y*that.y);
    }

    Length(): number {
        return Math.sqrt(this.x*this.x + this.y*this.y);
    }

    Normalize(): v2 {
        if(this.Length() == 0) return new v2(0.0, 0.0);
        return new v2(this.x/this.Length(), this.y/this.Length());
    }

    Scale(val: number): v2 {
        return new v2(this.x*val, this.y*val);
    }

    Rot90(): v2 {
        return new v2(-this.y, this.x);
    }

    Lerp(that: v2, t: number): v2 {
       return that.Subtract(this).Scale(t).Add(this);
    }

    Dot(that: v2): number {
        return this.x*that.x + this.y*that.y;
    }

    DistanceTo(that: v2): number {
        return that.Subtract(this).Length();
    }

    Array(): [number, number] {
        return [this.x, this.y];
    }
}

class player {
    position: v2;
    direction: number;
    constructor(position: v2, direction: number) {
        this.position = position;
        this.direction = direction;
    }
}

function GetFOV(Player : player): [v2, v2] {
    const p = Player.position.Add(v2.FromAngle(Player.direction).Scale(NEAR_PLANE));
    const l = Math.tan(FOV*0.5)*NEAR_PLANE;    
    const p1 = p.Subtract(p.Subtract(Player.position).Rot90().Normalize().Scale(l));
    const p2 = p.Add(p.Subtract(Player.position).Rot90().Normalize().Scale(l));
    return [p1, p2];
}

function DrawLine(context: CanvasRenderingContext2D, p1: v2, p2: v2) {
    context.beginPath();
    context.moveTo(...p1.Array());
    context.lineTo(...p2.Array());
    context.stroke();
}

function DrawFilledCircle(context: CanvasRenderingContext2D, center: v2, radius: number) {
    context.beginPath();
    context.arc(...center.Array(), radius, 0, 2*Math.PI);
    context.fill();
}

function GetCanvasSize(context: CanvasRenderingContext2D): v2 {
    return new v2(context.canvas.width, context.canvas.height);
}

function SnapFloorCeiling(x: number, dx: number): number {
    if(dx > 0) return Math.ceil(x + Math.sign(dx)*EPSILON);
    if(dx < 0) return Math.floor(x + Math.sign(dx)*EPSILON);
    return x;
}

function GetCell(p1: v2, p2: v2): v2 {
    const d = p2.Subtract(p1);

    return new v2(Math.floor(p2.x + Math.sign(d.x)*EPSILON),
                  Math.floor(p2.y + Math.sign(d.y)*EPSILON));
}

function RayStep(p1: v2, p2: v2): v2 {
    let p3 = p2;
    const d = p2.Subtract(p1);

    if(d.x !== 0) {
        const m = d.y/d.x;
        const c = p1.y - m*p1.x;
        {
            const x3 = SnapFloorCeiling(p2.x, d.x);
            const y3 = x3*m + c;
            p3 = new v2(x3, y3);
        }

        if(m !== 0) {
            const y3 = SnapFloorCeiling(p2.y, d.y);
            const x3 = (y3 - c)/m;
            const p3t = new v2(x3, y3);
            if(p2.DistanceTo(p3t) < p2.DistanceTo(p3)) {
                p3 = p3t;
            }
        }
    } else {
        const y3 = SnapFloorCeiling(p2.y, d.y);
        const x3 = p2.x;
        p3 = new v2(x3, y3);
    }

    return p3;
}

type level_map = Array<Array<number>>;

function CheckIfWithinLevel(Level_Map: level_map, p: v2): boolean {
    const size = GetLevelSize(Level_Map);
    return 0 <= p.x && p.x < size.x && 0 <= p.y && p.y < size.y;
}

function CastRay(Level_Map : level_map, p1: v2, p2: v2): v2 {
    for(;;) {
        const cell = GetCell(p1, p2);
        if(!CheckIfWithinLevel(Level_Map, cell) || Level_Map[cell.y][cell.x] !== 0) {
            break;
        }
        const p3 = RayStep(p1, p2);
        p1 = p2;
        p2 = p3;
    }
    return p2;
}

function GetLevelSize(Level_Map: level_map): v2 {
    const y = Level_Map.length;
    let x = Number.MIN_VALUE;
    for(let row of Level_Map) {
        x = Math.max(x, row.length);
    }
    return new v2(x, y);
}

function RenderMinimap(context: CanvasRenderingContext2D, Player: player, 
                       position: v2, size: v2, level_map: Array<Array<number>>) {    
    context.save();

    const grid_size = GetLevelSize(level_map);
    context.translate(...position.Array());
    context.scale(...size.Divide(grid_size).Array());
    context.lineWidth = 0.04;

    context.fillStyle = "#181818";
    context.fillRect(0, 0, ...grid_size.Array());

    for(let y = 0; y < grid_size.y; ++y)
    {
        for(let x = 0; x < grid_size.x; ++x) {
            if(level_map[y][x] !== 0) {
                context.fillStyle = "#0000A8";
                context.fillRect(x, y, 1, 1);
            }
        }
    }

    context.strokeStyle = "#303030"
    for(let x = 0; x <= grid_size.x; ++x) {
        DrawLine(context, new v2(x, 0), new v2(x, grid_size.y));
    }

    for(let y = 0; y <= grid_size.y; ++y) {
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

function RenderGame(Context: CanvasRenderingContext2D, Player: player, Level_Map: level_map) {
    const Strip_Width = Math.ceil(Context.canvas.width/RAYS);
    
    const [r1, r2] = GetFOV(Player);

    for(let x = 0; x < RAYS; ++x) {
        const Ray_Collision_Point = CastRay(Level_Map, Player.position, r1.Lerp(r2, x/RAYS));
        const Cell = GetCell(Player.position, Ray_Collision_Point);
        if(CheckIfWithinLevel(Level_Map, Cell) && Level_Map[Cell.y][Cell.x] !== 0) {
            const v = Ray_Collision_Point.Subtract(Player.position);
            const d = v2.FromAngle(Player.direction);
            const PerpWallDist = v.Dot(d);
            const Wall_Height = Context.canvas.height / PerpWallDist;
            Context.fillStyle = `rgba(3, 99, 52, 1)`;
            Context.fillRect(x*Strip_Width, (Context.canvas.height - Wall_Height)*0.5, Strip_Width, Wall_Height);
        }
    }
}

function Render(Context: CanvasRenderingContext2D, Player: player, Level_Data: level_map) {
    const Minimap_Pos = v2.Zero().Add(GetCanvasSize(Context).Scale(0.03));
    const Cell_Size = Context.canvas.width*0.02;
    const Minimap_Size = GetLevelSize(Level_Data).Scale(Cell_Size);
    Context.fillStyle = "#181818";
    Context.fillRect(0, 0, Context.canvas.width, Context.canvas.height);
    RenderGame(Context, Player, Level_Data)
    RenderMinimap(Context, Player, Minimap_Pos, Minimap_Size, Level_Data);
}

(() => {
    let Level_Data = [
        [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ];
    const Game = document.getElementById("game") as (HTMLCanvasElement | null);
    if(Game === null) {
            throw new Error("Null game canvas");
    }

    let resolution_factor = 80;
    Game.width = 16*resolution_factor;
    Game.height = 9*resolution_factor;

    const Context = Game.getContext("2d");
    if(Context === null) {
            throw new Error("2d context is null");
    }

    let Player = new player(GetLevelSize(Level_Data).Multiply(new v2(0.83, 0.73)), Math.PI*1.25);

    window.addEventListener("keydown", (e) => {
            switch (e.code) {
                case 'KeyW': {
                    Player.position = Player.position.Add(v2.FromAngle(Player.direction).Scale(STEP_LENGTH));
                    Render(Context, Player, Level_Data);
                } break;
                case 'KeyS': {
                    Player.position = Player.position.Subtract(v2.FromAngle(Player.direction).Scale(STEP_LENGTH));
                    Render(Context, Player, Level_Data);
                } break;
                case 'KeyD': {
                    Player.direction += Math.PI*0.03;
                    Render(Context, Player, Level_Data);
                } break;
                case 'KeyA': {
                    Player.direction -= Math.PI*0.03;
                    Render(Context, Player, Level_Data);
                } break;
            }
    })

    const grid_size = GetCanvasSize(Context);

    Render(Context, Player, Level_Data);
})()

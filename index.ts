const EPSILON = 1e-6;
const NEAR_PLANE = 0.1;
const FAR_PLANE = 10.0;
const FOV = Math.PI*0.5;
const RAYS = 500;
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

    SqrLength(): number {
        return this.x*this.x + this.y*this.y;
    }

    SqrDistanceTo(that: v2): number {
        return that.Subtract(this).SqrLength();
    }

    Array(): [number, number] {
        return [this.x, this.y];
    }
}

class rgba {
    r: number;
    g: number;
    b: number;
    a: number;

    constructor(r: number, g: number, b: number, a: number) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    Brightness(factor: number): rgba {
        return new rgba(factor*this.r, factor*this.g, factor*this.b, this.a);
    }

    StringNormalized(): string {
        return `rgba(${Math.floor(this.r*255)}, ${Math.floor(this.g*255)}, ${Math.floor(this.b*255)}, ${this.a})`;
    }

    String(): string{
        return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
    }
}

class player {
    position: v2;
    direction: number;
    dPlayerP: v2;
    width: number;
    height: number;
    constructor(position: v2, direction: number, dPlayerP: v2, width: number, height: number) {
        this.position = position;
        this.direction = direction;
        this.dPlayerP = dPlayerP;
        this.width = width;
        this.height = height;
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

function HittingCell(p1: v2, p2: v2): v2 {
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
            if(p2.SqrDistanceTo(p3t) < p2.SqrDistanceTo(p3)) {
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

class Level_Data {
    cells: Array<number>;
    width: number;
    height: number;
    wh: v2;
    constructor(LevelArray: Array<Array<number>>) {
        this.height = LevelArray.length;
        let x = Number.MIN_VALUE;
        for(let row of LevelArray) {
            x = Math.max(x, row.length);
        }
        this.width = x;
        this.wh = new v2(this.width, this.height);
        this.cells = [];
        for(let row of LevelArray) {
            this.cells = this.cells.concat(row);
            // NOTE: If rows are not of even length we will them out by adding 0 to pad
            for(let i = 0; i < this.width - row.length; ++i) {
                this.cells.push(0);
            }
        }
    }

    Contains(p: v2): boolean {
        return (0 <= p.x) && (p.x < this.width) && (0 <= p.y) && (p.y < this.height);
    }

    GetCell(p: v2): number | undefined {
        if(!this.Contains(p)) {
            return undefined;
        } else {
            const floored_p = new v2(Math.floor(p.x), Math.floor(p.y));
            return this.cells[(floored_p.y*this.width) + floored_p.x];
        }
    }

    IsWall(p: v2): boolean {
        const Cell = this.GetCell(p);
        return Cell!== 0 && Cell!== undefined; 
    }
}

function CastRay(Context: CanvasRenderingContext2D, LevelData : Level_Data, p1: v2, p2: v2): v2 {
    let Start = p1;
    while(Start.SqrDistanceTo(p1) < Context.canvas.height*Context.canvas.height) {
        const cell = HittingCell(p1, p2);
        if(LevelData.GetCell(cell) !== undefined && LevelData.GetCell(cell) !== 0) {
            break;
        }
        const p3 = RayStep(p1, p2);
        p1 = p2;
        p2 = p3;
    }
    return p2;
}

function RenderMinimap(context: CanvasRenderingContext2D, Player: player, 
                       position: v2, size: v2, LevelData: Level_Data) {    
    context.save();

    const grid_size = LevelData.wh;
    context.translate(...position.Array());
    context.scale(...size.Divide(grid_size).Array());
    context.lineWidth = 0.04;

    context.fillStyle = "#181818";
    context.fillRect(0, 0, ...grid_size.Array());

    for(let y = 0; y < grid_size.y; ++y)
    {
        for(let x = 0; x < grid_size.x; ++x) {
            const p = new v2(x, y);
            if(LevelData.GetCell(p) !== 0) {
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
    // DrawFilledCircle(context, Player.position, 0.2);
    context.fillRect(Player.position.x - 0.5*Player.width, 
                     Player.position.y - 0.5*Player.height,
                     Player.width,
                     Player.height)

    const [p1, p2] = GetFOV(Player);
    
    context.strokeStyle = "yellow";    
    //DrawLine(context, Player.position, p);
    DrawLine(context, Player.position, p1);
    DrawLine(context, Player.position, p2);

    context.restore();
}

function RenderGame(Context: CanvasRenderingContext2D, Player: player, LevelData: Level_Data, Textures: HTMLImageElement[]) {
    const Strip_Width = Math.ceil(Context.canvas.width / RAYS);
    const [r1, r2] = GetFOV(Player);

    for (let x = 0; x < RAYS; ++x) {
        const CollisionPoint = CastRay(Context, LevelData, Player.position, r1.Lerp(r2, x / RAYS));
        const CollisionCell = HittingCell(Player.position, CollisionPoint);
        const Cell = LevelData.GetCell(CollisionCell);
        if (Cell !== 0 && Cell != undefined) {
            const v = CollisionPoint.Subtract(Player.position);
            const d = v2.FromAngle(Player.direction);
            const PerpWallDist = v.Dot(d);
            const Wall_Height = Context.canvas.height / PerpWallDist;

            const t = CollisionPoint.Subtract(CollisionCell);
            let u = 0;
            if ((Math.abs(t.x) < EPSILON || Math.abs(t.x - 1) < EPSILON) && t.y > 0) {
                u = t.y;
            } else {
                u = t.x;
            }

            switch (Cell) {
                case 1: {
                    // Context.fillStyle = new rgba(3, 99, 52, 1).Brightness(1/PerpWallDist).String();
                    Context.drawImage(Textures[0], u * Textures[0].width, 0, 1, Textures[0].height,
                        x * Strip_Width, (Context.canvas.height - Wall_Height) * 0.5, Strip_Width, Wall_Height);
                } break;
                case 2: {
                    // Context.fillStyle = new rgba(34, 102,195, 1).Brightness(1/PerpWallDist).String();
                    Context.drawImage(Textures[1], u * Textures[1].width, 0, 1, Textures[1].height,
                        x * Strip_Width, (Context.canvas.height - Wall_Height) * 0.5, Strip_Width, Wall_Height);
                } break;
                case 3: {
                    // Context.fillStyle = new rgba(221, 149, 68, 1).Brightness(1/PerpWallDist).String();
                    Context.drawImage(Textures[2], u * Textures[2].width, 0, 1, Textures[2].height,
                        x * Strip_Width, (Context.canvas.height - Wall_Height) * 0.5, Strip_Width, Wall_Height);
                } break;
                case 4: {
                    // Context.fillStyle = new rgba(0, 12, 101, 1).Brightness(1/PerpWallDist).String();
                    Context.drawImage(Textures[3], u * Textures[3].width, 0, 1, Textures[3].height,
                        x * Strip_Width, (Context.canvas.height - Wall_Height) * 0.5, Strip_Width, Wall_Height);
                } break;
            }
            // NOTE: Code that was being used to draw plain colors
            // Context.fillRect(x*Strip_Width, (Context.canvas.height - Wall_Height)*0.5, Strip_Width, Wall_Height);
        }
    }
}

function Render(Context: CanvasRenderingContext2D, Player: player, LevelData: Level_Data, Textures: HTMLImageElement[]) {
    const Minimap_Pos = v2.Zero().Add(GetCanvasSize(Context).Scale(0.03));
    const Cell_Size = Context.canvas.width*0.02;
    const Minimap_Size = LevelData.wh.Scale(Cell_Size);
    Context.fillStyle = "#181818";
    Context.fillRect(0, 0, Context.canvas.width, Context.canvas.height);
    RenderGame(Context, Player, LevelData, Textures)
    RenderMinimap(Context, Player, Minimap_Pos, Minimap_Size, LevelData);
}

async function LoadImg(url: string): Promise<HTMLImageElement> {
    const Img = new Image();
    Img.src = url;
    Img.crossOrigin = "anonymous";
    return new Promise((resolve, reject) => {
        Img.onload = () => resolve(Img);
        Img.onerror = reject;
    });

}

(async () => {
    
    const tex01 = await LoadImg("./textures/brick25.png");
    const tex02 = await LoadImg("./textures/tile15.png");
    const tex03 = await LoadImg("./textures/tile16.png");
    const tex04 = await LoadImg("./textures/tile24.png");
    let Textures = [tex01, tex02, tex03, tex04];

    let Cells = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 2, 0, 0, 0, 2, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 3, 0, 0, 0, 4, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];

    let LevelData = new Level_Data(Cells);

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

    let Player = new player(LevelData.wh.Multiply(new v2(0.83, 0.73)), Math.PI*1.25, v2.Zero(), 0.2, 0.2);

    let MovingFwd = false;
    let MovingBwd = false;
    let TurnLeft = false;
    let TurnRight = false;

    window.addEventListener("keydown", (e) => {
        switch (e.code) {
            case 'KeyW': {
                MovingFwd = true;
            } break;
            case 'KeyS': {
                MovingBwd = true;
            } break;
            case 'KeyD': {
                TurnRight = true;
            } break;
            case 'KeyA': {
                TurnLeft = true;
            } break;
        }
    })

    window.addEventListener("keyup", (e) => {
        switch (e.code) {
            case 'KeyW': {
                MovingFwd = false;
            } break;
            case 'KeyS': {
                MovingBwd = false;
            } break;
            case 'KeyD': {
                TurnRight = false;
            } break;
            case 'KeyA': {
                TurnLeft = false;
            } break;
        }
})

    const grid_size = GetCanvasSize(Context);
    
    let PrevTime = 0;
    const frame = function (Time: number) {
        const dtForFrame = (Time - PrevTime)/1000;
        PrevTime = Time;
        // let dPlayerP = v2.Zero();
        let AngularVelocity = 0.0;
        let ddPlayerP = v2.Zero();
        const PlayerSpeed = 20.0;

        if(MovingFwd) {
            // Player.dPlayerP = Player.dPlayerP.Add(v2.FromAngle(Player.direction).Scale(PlayerSpeed));
            ddPlayerP = ddPlayerP.Add(v2.FromAngle(Player.direction).Scale(PlayerSpeed));
        }
        if(MovingBwd) {
            // Player.dPlayerP = Player.dPlayerP.Subtract(v2.FromAngle(Player.direction).Scale(PlayerSpeed));
            ddPlayerP = ddPlayerP.Subtract(v2.FromAngle(Player.direction).Scale(PlayerSpeed));
        }
        if(TurnRight) {
            AngularVelocity += Math.PI*0.9;
        }
        if(TurnLeft) {
            AngularVelocity -= Math.PI*0.9;
        }

        // NOTE: Adding in some of last frame's acceleration scaled down to mimic real friction. Eventually use
        // ODEs here.
        ddPlayerP = ddPlayerP.Add(Player.dPlayerP.Scale(-6.0));

        const OldPlayerP = Player.position;
        const PlayerDelta = ddPlayerP.Scale(0.5).Scale(dtForFrame*dtForFrame).Add(Player.dPlayerP.Scale(dtForFrame));
        Player.dPlayerP = Player.dPlayerP.Add(ddPlayerP.Scale(dtForFrame));
        const NewPlayerP = OldPlayerP.Add(PlayerDelta);

        Player.direction = Player.direction + AngularVelocity*dtForFrame;
        
        if(LevelData.GetCell(NewPlayerP) === 0){
            Player.position = NewPlayerP;
        }
        Render(Context, Player, LevelData, Textures);
        window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame((Time) => {
        PrevTime = Time;
        window.requestAnimationFrame(frame);
        })

    
})()

const EPSILON = 1e-3;

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

    DistanceTo(that: v2): number {
        return that.Subtract(this).Length();
    }

    Array(): [number, number] {
        return [this.x, this.y];
    }
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

function GetCurrentCell(p1: v2, p2: v2): v2 {
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

function GetLevelSize(Level_Map: level_map): v2 {
    const y = Level_Map.length;
    let x = Number.MIN_VALUE;
    for(let row of Level_Map) {
        x = Math.max(x, row.length);
    }
    return new v2(x, y);
}

function RenderMinimap(context: CanvasRenderingContext2D, p1: v2, p2: v2 | undefined, 
                       position: v2, size: v2, level_map: Array<Array<number>>) {    
    context.reset();   
    context.fillStyle = "#181818";
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    const grid_size = GetLevelSize(level_map);
    context.translate(...position.Array());
    context.scale(...size.Divide(grid_size).Array());
    context.lineWidth = 0.01;

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
    DrawFilledCircle(context, p1, 0.2);
    if(p2 !== undefined) {
        for(;;) {
            DrawFilledCircle(context, p2, 0.2);
            context.strokeStyle = "yellow";
            DrawLine(context, p1, p2);

            const c = GetCurrentCell(p1, p2);
            if(c.x < 0 || c.x >= grid_size.x || 
               c.y < 0 || c.y >= grid_size.y || 
               level_map[c.y][c.x] == 1) {
                break;
            }

            const p3 = RayStep(p1, p2);
            p1 = p2;
            p2 = p3;
        }
    }
}

(() => {
    let level = [
        [0, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 1, 1, 1, 1],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
    ];
    const game = document.getElementById("game") as (HTMLCanvasElement | null);
    if(game === null) {
            throw new Error("Null game canvas");
    }

    game.width = 800;
    game.height = 800;

    const context = game.getContext("2d");
    if(context === null) {
            throw new Error("2d context is null");
    }

    const grid_size = GetCanvasSize(context);
    let p1 = GetLevelSize(level).Multiply(new v2(0.93, 0.93));
    let p2: v2 | undefined = undefined;
    let minimap_pos = v2.Zero().Add(GetCanvasSize(context).Scale(0.05));
    let minimap_size = GetCanvasSize(context).Scale(0.3);
    game.addEventListener("mousemove", (event) => {

        p2 = new v2(event.offsetX, event.offsetY)
             .Subtract(minimap_pos)
             .Divide(minimap_size)
             .Multiply(GetLevelSize(level));
        let size = GetLevelSize(level);
        // console.log(p2);
        RenderMinimap(context, p1, p2, minimap_pos, minimap_size, level);
    })
    RenderMinimap(context, p1, p2, minimap_pos, minimap_size, level);
})()

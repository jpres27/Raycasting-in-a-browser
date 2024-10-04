class v2 {
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
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

    Array(): [number, number] {
        return [this.x, this.y];
    }
}

const ROWS = 10;
const COLS = 10;
const GRID_SIZE = new v2(COLS, ROWS);

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

function RayStep(p1: v2, p2: v2): v2 {
    return p2.Subtract(p1).Normalize().Add(p2);
}

function RenderGrid(context: CanvasRenderingContext2D, p2: v2 | undefined) {
    context.reset();

    context.fillStyle = "#181818";
    context.fillRect(0, 0, context.canvas.width, context.canvas.height)

    context.scale(context.canvas.width / COLS, context.canvas.height / ROWS);
    context.lineWidth = 0.01;

    context.strokeStyle = "#303030"
    for(let x = 0; x <= COLS; ++x) {
        DrawLine(context, new v2(x, 0), new v2(x, ROWS));
    }

    for(let y = 0; y <= ROWS; ++y) {
        DrawLine(context, new v2(0, y), new v2(COLS, y));
    }

    let p1 = new v2(COLS*0.43, ROWS*0.33);
    context.fillStyle = "magenta";
    DrawFilledCircle(context, p1, 0.2);
    if(p2 !== undefined) {
        DrawFilledCircle(context, p2, 0.2);
        context.strokeStyle = "magenta";
        DrawLine(context, p1, p2);

        const p3 = RayStep(p1, p2);
        DrawFilledCircle(context, p3, 0.2);
        DrawLine(context, p2, p3);
    }
}

(() => {
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

    let p2: v2 | undefined = undefined;
    game.addEventListener("mousemove", (event) => {
        p2 = new v2(event.offsetX, event.offsetY).Divide(GetCanvasSize(context).Multiply(new v2(0.1, 0.1)));
        console.log(p2);
        RenderGrid(context, p2);
    })
    RenderGrid(context, p2);
})()

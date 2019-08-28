import { Display } from "./display";
import { Story } from "./scrollytell";

export class App {
    private readonly context2d: CanvasRenderingContext2D;
    private frame = 0;
    private readonly height: number;
    private readonly story: Story;
    private readonly tick: () => void;
    private readonly width: number;

    public constructor() {
        this.story = new Story({
            chartSelector: ".chart",
            containerSelector: ".container",
            fullsizeChart: true,
            panelSelector: ".panel",
        });

        this.tick = this.render.bind(this) as (() => void);

        const checkbox = document.getElementById("show_hud") as HTMLInputElement;
        const canvas2d = document.getElementById("canvas2d") as HTMLCanvasElement;
        const canvas3d = document.getElementById("canvas3d") as HTMLCanvasElement;

        checkbox.addEventListener("click", () => {
            this.story.showDeveloperHud(checkbox.checked);
        });

        const dpr = window.devicePixelRatio;
        const width = canvas2d.clientWidth * dpr;
        const height = canvas2d.clientHeight * dpr;

        this.width = canvas3d.width = canvas2d.width = width;
        this.height = canvas3d.height = canvas2d.height = height;

        this.context2d = canvas2d.getContext("2d");
        this.context2d.lineWidth = 3;

        window.requestAnimationFrame(this.tick);
    }

    private render() {
        const t = this.frame * 0.05;
        const x0 = this.width / 2 - Math.sin(t) * this.width / 2;
        const x1 = this.width / 2 + Math.sin(t) * this.width / 2;
        this.context2d.clearRect(0, 0, this.width, this.height);
        this.context2d.beginPath();
        this.context2d.moveTo(x1, 0);
        this.context2d.lineTo(x0, this.height);
        this.context2d.moveTo(x1, this.height);
        this.context2d.lineTo(x0, 0);
        this.context2d.stroke();
        this.frame += 1;
        window.requestAnimationFrame(this.tick);
    }
}

window.onload = () => {
    // tslint:disable-next-line: no-string-literal
    window["app"] = new App();
};

import * as d3 from "d3";
import * as Filament from "filament";
import { glMatrix } from "gl-matrix";

import { Display } from "./display";
import { Timeline } from "./timeline";
import * as urls from "./urls";

Filament.init(urls.initialAssets, () => {
    glMatrix.setMatrixArrayType(Array);
    window["app"] = new App();  // tslint:disable-line
});

class App {
    private readonly canvas: HTMLCanvasElement;
    private debugging = false;
    private readonly display: Display;
    private readonly scrollable: HTMLElement;
    private readonly steps: d3.Selection<HTMLElement, number, d3.BaseType, unknown>;
    private readonly tick: () => void;
    private time: number;
    private readonly timeline: Timeline;

    public constructor() {
        this.tick = this.doTick.bind(this) as (() => void);
        this.canvas = document.getElementsByTagName("canvas")[0];
        this.scrollable = document.getElementById("scrollable-content");
        this.display = new Display(this.canvas, () => { /* no-op */ });
        this.timeline = new Timeline(this.display.getAnimation());
        this.time = Date.now();
        const main = d3.select("main");
        const scrolly = main.select("#scrolly");
        const canvas = scrolly.select("canvas");
        const article = scrolly.select("article");
        this.steps = article.selectAll(".step");

        canvas.style("height", `${window.innerHeight}px`);

        this.display.resize();

        window.addEventListener("resize", () => {
            this.display.resize();
        });

        window.requestAnimationFrame(this.tick);
    }

    public debug() {
        this.debugging = true;
        const print = (label: string, el: HTMLElement) => {
            const rect = el.getBoundingClientRect();
            console.info(`${label} top = ${rect.top}`);
        };
        d3.select("#debug-guide").style("border-top", "dashed 2px black");
        print("    canvas", document.getElementsByTagName("canvas")[0]);
        print("   scrolly", document.getElementById("scrolly"));
        print("      main", document.getElementsByTagName("main")[0]);
        print("scrollable", document.getElementById("scrollable-content"));
    }

    private doTick() {
        const time = Date.now();
        const dt = (time - this.time) * 0.1;
        this.time = time;

        this.display.render();

        if (this.scrollable.getBoundingClientRect().top < 0) {
            this.scrollable.scrollIntoView();
            window.requestAnimationFrame(this.tick);
            return;
        }

        const app = this;
        const canvasBox = app.canvas.getBoundingClientRect();
        const midway = (canvasBox.top + canvasBox.bottom) / 2;

        const getStepProgress = (el: HTMLElement) => {
            const bbox = el.getBoundingClientRect();
            const outside = bbox.top > midway || bbox.bottom < midway;
            const ratio = (midway - bbox.top) / bbox.height;
            return {
                active: !outside,
                percentage: Math.max(Math.min(1.0, ratio), 0.0),
            };
        };

        if (this.debugging) {
            d3.select("#debug-guide").style("top", `${midway}px`);
        }

        let currentStep = 0;
        let currentProgress = 0;

        this.steps.style("border", function() {
            const progress = getStepProgress(this);
            if (progress.active) {
                currentProgress = progress.percentage;
            }
            if (!app.debugging) {
                return "none";
            }
            if (this.classList.contains("final")) {
                return "solid 2px black";
            }
            if (this.classList.contains("blank")) {
                return "none";
            }
            if (!progress.active) {
                return "solid 3px rgba(0,0,0,0)";
            }
            const gray = progress.percentage * 255;
            return `solid 3px rgba(${gray}, ${gray}, ${gray}, 1.0)`;
        });

        this.steps.classed("is-active", function(datum, index): boolean {
            const stepBox = this.getBoundingClientRect();
            if (stepBox.top > midway) {
                return false;
            }
            if (stepBox.bottom < midway) {
                return false;
            }
            currentStep = index;
            return true;
        });

        this.display.update(currentStep);
        this.timeline.update(currentStep, currentProgress);
        document.title = currentProgress.toFixed(2); // TODO: remove

        window.requestAnimationFrame(this.tick);
    }
}

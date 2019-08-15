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

const SCROLL_INVALID = 9999;

class App {
    private readonly canvas2d: HTMLCanvasElement;
    private readonly canvas3d: HTMLCanvasElement;
    private readonly display: Display;
    private frameCount = 0;
    private readonly scrollable: HTMLElement;
    private scrollTop = SCROLL_INVALID;
    private readonly steps: d3.Selection<HTMLElement, number, d3.BaseType, unknown>;
    private readonly tick: () => void;
    private readonly timeline: Timeline;

    public constructor() {
        this.tick = this.doTick.bind(this) as (() => void);
        this.canvas2d = document.getElementById("canvas2d") as HTMLCanvasElement;
        this.canvas3d = document.getElementById("canvas3d") as HTMLCanvasElement;
        this.scrollable = document.getElementById("scrollable-content");
        this.display = new Display(this.canvas2d, this.canvas3d, () => { /* no-op */ });
        this.timeline = new Timeline(this.display.getAnimation());
        const main = d3.select("main");
        const scrolly = main.select("#scrolly");
        const article = scrolly.select("article");
        this.steps = article.selectAll(".step");

        const container = document.getElementsByClassName("sticky-container")[0] as HTMLElement;
        container.style.height = `${window.innerHeight}px`;

        this.timeline.update(0, 0);
        this.display.update(0);
        this.display.resize();

        window.addEventListener("resize", () => {
            this.requestRedraw();
            this.display.resize();
        });

        window.requestAnimationFrame(this.tick);
    }

    private doTick() {
        const scrollTop = document.getElementById("scrolly").getBoundingClientRect().top;
        if (scrollTop === this.scrollTop) {
            window.requestAnimationFrame(this.tick);
            return;
        }

        this.scrollTop = scrollTop;
        this.display.render();
        this.frameCount += 1;
        document.getElementById("frameCount").innerText = this.frameCount.toString();

        if (this.scrollable.getBoundingClientRect().top < 0) {
            this.scrollable.scrollIntoView();
            window.requestAnimationFrame(this.tick);
            return;
        }

        const canvasBox = this.canvas3d.getBoundingClientRect();
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

        let currentProgress = 0;
        this.steps.style("border", function() {
            const progress = getStepProgress(this);
            if (progress.active) {
                currentProgress = progress.percentage;
            }
            return "none";
        });
        document.getElementById("progress").innerText = (100 * currentProgress).toFixed(0);

        let currentStep = 0;
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
        document.getElementById("step").innerText = currentStep.toString();

        // Force a re-draw if the timeline requests it.
        if (this.timeline.update(currentStep, currentProgress)) {
            this.requestRedraw();
        }

        this.display.update(currentStep);

        window.requestAnimationFrame(this.tick);
    }

    private requestRedraw() {
        this.scrollTop = SCROLL_INVALID;
    }
}

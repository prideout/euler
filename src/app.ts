import * as d3 from "d3";
import * as Filament from "filament";
import { glMatrix, vec3 } from "gl-matrix";

import { Display } from "./display";
import { Scene } from "./scene";
import { Timeline } from "./timeline";
import * as urls from "./urls";

Filament.init(urls.initialAssets, () => {
    glMatrix.setMatrixArrayType(Array);
    window["vec3"] = vec3;      // tslint:disable-line
    window["app"] = new App();  // tslint:disable-line
});

declare const BUILD_COMMAND: string;

const SCROLL_INVALID = 9999;

class App {
    private readonly container: HTMLElement;
    private readonly display: Display;
    private frameCount = 0;
    private readonly production: boolean;
    private readonly scene = new Scene();
    private readonly scrollable: HTMLElement;
    private scrollTop = SCROLL_INVALID;
    private readonly steps: d3.Selection<HTMLElement, number, d3.BaseType, unknown>;
    private readonly tick: () => void;
    private readonly timeline: Timeline;

    public constructor() {

        this.production = BUILD_COMMAND.indexOf("release") > -1;
        console.info(this.production ? "Production mode" : "Development mode");

        this.tick = this.doTick.bind(this) as (() => void);
        this.scrollable = document.getElementById("scrollable-content");
        this.display = new Display(this.production, this.scene);
        this.timeline = new Timeline(this.scene);
        const main = d3.select("main");
        const scrolly = main.select("#scrolly");
        const article = scrolly.select("article");
        this.steps = article.selectAll(".step");

        this.container = document.getElementsByClassName("sticky-container")[0] as HTMLElement;
        this.container.style.height = `${window.innerHeight}px`;

        this.timeline.update(0, 0);
        this.display.update(0);
        this.display.resize();

        window.addEventListener("resize", () => {
            this.requestRedraw();
            this.display.resize();
        });

        if (!this.production) {
            document.getElementById("hud").style.display = "block";
            document.getElementById("textSpansHud").addEventListener("input", (ev) => {
                const el = ev.target as HTMLInputElement;
                const spanindex = parseInt(el.dataset.spanindex, 10);
                const value = parseFloat(el.value);
                const field = el.dataset.field;
                this.scene.textSpans[spanindex][field] = value;
                this.requestRedraw();
            });
        }

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

        if (this.scrollable.getBoundingClientRect().top < 0) {
            this.scrollable.scrollIntoView();
            window.requestAnimationFrame(this.tick);
            return;
        }

        const canvasBox = this.container.getBoundingClientRect();
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

        if (!this.production) {
            document.getElementById("step").innerText = currentStep.toString();
            document.getElementById("progress").innerText = (100 * currentProgress).toFixed(0);
            document.getElementById("frameCount").innerText = this.frameCount.toString();
            const hud = document.getElementById("textSpansHud") as HTMLDivElement;
            if (hud.childElementCount !== 3 * this.scene.textSpans.length) {
                hud.innerHTML = "";
                let index = 0;
                const inputAttribs = 'type="number" min="-1" max="+1" step=".01"';
                for (const span of this.scene.textSpans) {
                    const dataAttribs = `data-spanindex="${index}"`;
                    hud.innerHTML += span.text;
                    hud.innerHTML += `<input ${inputAttribs} ${dataAttribs} data-field="x" value="${span.x}">`;
                    hud.innerHTML += `<input ${inputAttribs} ${dataAttribs} data-field="y" value="${span.y}">`;
                    hud.innerHTML += "<br>";
                    index += 1;
                }
            }
        }

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

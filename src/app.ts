import * as Filament from "filament";

import { Display } from "./display";
import { Scene } from "./scene";
import { Story } from "./scrollytell";
import { Timeline } from "./timeline";
import * as urls from "./urls";

declare const BUILD_COMMAND: string;

export class App {
    public readonly scene = new Scene();
    public readonly story: Story;

    private display: Display;
    private readonly production: boolean;
    private timeline: Timeline;

    public constructor() {
        this.production = BUILD_COMMAND.indexOf("release") > -1;
        console.info(this.production ? "Production mode" : "Development mode");

        document.addEventListener("keypress", (key) => {
            if (key.key === "s") {
                const canvas3d = document.getElementById("canvas3d") as HTMLCanvasElement;
                const canvas2d = document.getElementById("canvas2d") as HTMLCanvasElement;
                const data3d = canvas3d.toDataURL("image/png");
                const data2d = canvas2d.toDataURL("image/png");

                const download3d: HTMLAnchorElement = document.getElementById("download3d") as HTMLAnchorElement;
                const download2d: HTMLAnchorElement = document.getElementById("download2d") as HTMLAnchorElement;

                download3d.href = data3d;
                download2d.href = data2d;

                const step = this.story.getActivePanelIndex();
                const progress = this.story.getProgressValue();
                const prog = progress.toFixed(2);

                download3d.download = `screenshot_3d_${step}_${prog}.png`;
                download2d.download = `screenshot_2d_${step}_${prog}.png`;

                download3d.click();
                download2d.click();
            }
        });

        this.story = new Story({
            chartSelector: ".chart",
            containerSelector: ".container",
            panelSelector: ".panel",
            segmentSelector: "segment",
            developerHud: !this.production,
            fullsizeChart: true,
            progressHandler: (story) => {
                if (this.display) {
                    const panel = story.getActivePanelIndex();
                    const progress = story.getProgressValue();
                    this.render(panel, progress);
                }
            },
        });

        Filament.init(urls.initialAssets, () => {
            this.display = new Display(this.production, this.scene);
            this.timeline = new Timeline(this.scene);
            this.timeline.update(0, 0);
            this.display.update(0);
            this.display.resize();
            this.story.refresh();
        });

        // Ideally this would allow up/down arrows to work but it doesn't seem reliable:
        const el: HTMLElement = document.querySelector(".container");
        el.focus();
    }

    private render(panel: number, progress: number) {
        if (panel > -1) {
            this.timeline.update(panel, progress);
            this.display.update(panel);
        }
        this.display.render();
    }
}

/* tslint:disable */

window.onload = () => {
    window["app"] = new App();
};

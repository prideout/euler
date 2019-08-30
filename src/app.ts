import * as Filament from "filament";

import { Display } from "./display";
import { Scene } from "./scene";
import { Story } from "./scrollytell";
import { Timeline } from "./timeline";
import * as urls from "./urls";

declare const BUILD_COMMAND: string;

export class App {
    public readonly story: Story;

    private display: Display;
    private readonly production: boolean;
    private readonly scene = new Scene();
    private timeline: Timeline;

    public constructor() {
        this.production = BUILD_COMMAND.indexOf("release") > -1;
        console.info(this.production ? "Production mode" : "Development mode");

        const el: HTMLElement = document.querySelector(".container");
        el.focus();

        this.story = new Story({
            chartSelector: ".chart",
            containerSelector: ".container",
            panelSelector: ".panel",
            segmentSelector: "segment,segment:last-child>*",
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
            this.display.render();
        });
    }

    private render(panel: number, progress: number) {
        if (panel > -1) {
            this.timeline.update(panel, progress);
            this.display.update(panel);
        }
        this.display.render();
    }
}

window.onload = () => {
    // tslint:disable-next-line: no-string-literal
    const app = window["app"] = new App();
};

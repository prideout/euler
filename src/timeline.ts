import * as d3 from "d3";
import * as Filament from "filament";
import * as glm from "gl-matrix";

import { Animation } from "./animation";

const clamp = (val: number, lower: number, upper: number): number => Math.max(Math.min(val, upper), lower);
const mix = (a: number, b: number, t: number): number => a * (1 - t) + b * t;

const smoothstep = (edge0: number, edge1: number, x: number): number => {
    const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - t * 2.0);
};

export class Timeline {
    private readonly animation: Animation;

    public constructor(animation: Animation) {
        this.animation = animation;
    }

    public update(step: number, progress: number) {
        switch (step) {
            case 0: this.updateStep1(progress); break;
            case 1: this.updateStep2(progress); break;
            default:
                this.animation.step1Material.setFloatParameter("gridlines", 0.0);
                this.updateStep1(0);
        }
    }

    private updateStep1(progress: number) {
        const sRGBA = Filament.RgbaType.sRGB;
        const tcm = this.animation.transformManager;
        const fadeIn = smoothstep(.2, .3, progress);
        const fadeOut = 1.0 - smoothstep(.7, .8, progress);
        const cylinderPresence = fadeIn * fadeOut;
        let cylinderZ = -0.5 + (1.0 - cylinderPresence);

        const cameraFn = d3.interpolate([0, 0, 3], [0, 1.5, 3.5]);
        glm.vec3.copy(this.animation.viewpoint.eye, cameraFn(cylinderPresence));

        cylinderZ = mix(cylinderZ, -4.0, smoothstep(0.9, 1.0, progress));

        const m1 = glm.mat4.fromRotation(glm.mat4.create(), Math.PI / 2, [1, 0, 0]);
        const m2 = glm.mat4.fromTranslation(glm.mat4.create(), [0, 0, cylinderZ]);
        const m3 = glm.mat4.fromScaling(glm.mat4.create(), [1, 1, 2]);
        glm.mat4.multiply(m1, m1, m3);
        glm.mat4.multiply(m1, m1, m2);

        const front = tcm.getInstance(this.animation.frontCylinderEntity);
        tcm.setTransform(front, m1);
        front.delete();
        const back = tcm.getInstance(this.animation.backCylinderEntity);
        tcm.setTransform(back, m1);
        back.delete();

        const sphereGridlines = smoothstep(.5, .7, progress) * smoothstep(1., .9, progress);
        const cylinderGridlines = smoothstep(.4, .5, progress) * smoothstep(.7, .5, progress);

        this.animation.step1Material.setFloatParameter("gridlines", sphereGridlines);
        this.animation.step1CylinderFrontMaterial.setFloatParameter("gridlines", cylinderGridlines);
        this.animation.step1CylinderFrontMaterial.setColor4Parameter("baseColor", sRGBA, [0.0, 0.0, 0.0, 0.0]);
        this.animation.step1CylinderBackMaterial.setColor4Parameter("baseColor",  sRGBA, [0.0, 0.0, 0.0, 0.0]);
    }

    private updateStep2(progress: number) {
        // 0.00 to 0.18 Fade in the great circle and change the camera
        // 0.18 to 0.41 Fade in the second great circle and lune
        // 0.41 to 0.57 Widen lune to entire sphere
        // 0.57 to 0.72 Narrow lune back down
        // 0.72 to 0.88 Fade in antipode
        // 0.88 to 1.00 Fade out the double-lune and change the camera
        const fadeInLune = smoothstep(0.0, 0.2, progress);
        const fadeOutLune = 1.0 - smoothstep(0.8, 1.0, progress);
        const lunePresence = fadeInLune * fadeOutLune;
        const cameraFn = d3.interpolate([0, 0, 3], [0, 1, 3]);
        glm.vec3.copy(this.animation.viewpoint.eye, cameraFn(lunePresence));
        this.animation.step2Material.setFloatParameter("progress", lunePresence);
    }
}

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

    public update(step: number, progress: number): boolean {
        switch (step) {
            case 0: return this.updateStep1(progress);
            case 1: return this.updateStep2(progress);
            case 2: return this.updateStep3(progress);
            default:
                this.animation.step1Material.setFloatParameter("gridlines", 0.0);
                return this.updateStep1(0);
        }
    }

    private updateStep1(progress: number): boolean {
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

        return false;
    }

    private updateStep2(progress: number) {
        const A = smoothstep(0.00, 0.18, progress); // Fade in the great circle and change the camera
        const B = smoothstep(0.18, 0.41, progress); // Fade in the second great circle and lune
        const C = smoothstep(0.41, 0.57, progress); // Widen lune to entire sphere
        const D = smoothstep(0.57, 0.72, progress); // Narrow lune back down
        const E = smoothstep(0.72, 0.88, progress); // Fade in antipode
        const F = smoothstep(0.88, 1.00, progress); // Fade out the double-lune and change the camera

        const cameraFn = d3.interpolate([0, 0, 3], [0, 1, 3]);
        glm.vec3.copy(this.animation.viewpoint.eye, cameraFn(A * (1 - F)));

        this.animation.step2Material.setFloatParameter("greatCircle", A * (1 - F));
        this.animation.step2Material.setFloatParameter("luneAlpha", B * (1 - F));
        this.animation.step2Material.setFloatParameter("luneExpansion", C * (1 - D));
        this.animation.step2Material.setFloatParameter("antipodeAlpha", E * (1 - F));
        return false;
    }

    private updateStep3(progress: number) {

        this.animation.step1Material.setFloatParameter("gridlines", 0.0);
        this.updateStep1(0);

        const A = smoothstep(0.00, 0.18, progress); // Draw the geodesic triangle and change the camera
        const B2 = smoothstep(0.30, 0.35, progress); // Expand triangle to 90-90-90
        const B1 = smoothstep(0.35, 0.42, progress); // Change the camera to see polar triangle
        const C = smoothstep(0.50, 0.55, progress); // Shrink triangle back and revert the cam
        const D = smoothstep(0.55, 0.65, progress); // Fade in letters A B C
        const E = smoothstep(0.65, 0.88, progress); // Fade in three double lunes
        const F = smoothstep(0.88, 1.00, progress); // Fade everything out and change the camera

        const cam0 = (d3.interpolate([0, 0, 3], [0, 1, 3]))(A * (1 - F));
        const cam =  (d3.interpolate(cam0, [2, 2, 2]))(B1 * (1 - C));
        glm.vec3.copy(this.animation.viewpoint.eye, cam);

        this.animation.step3Material.setFloatParameter("fadeInTriangle", A * (1 - F));
        this.animation.step3Material.setFloatParameter("triangleExpansion", B2 * (1 - C));

        return false;
    }
}
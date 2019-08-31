import * as glm from "gl-matrix";

import { Scene } from "./scene";

const clamp = (val: number, lower: number, upper: number): number => Math.max(Math.min(val, upper), lower);
const mix = (a: number, b: number, t: number): number => a * (1 - t) + b * t;

const smoothstep = (edge0: number, edge1: number, x: number): number => {
    const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - t * 2.0);
};

export class Timeline {
    private previousStep = -1;
    private readonly scene: Scene;

    public constructor(scene: Scene) {
        this.scene = scene;
    }

    public enterStep3() {
        this.scene.textSpans.length = 3;
        this.scene.textSpans[0] = { opacity: 1.0, text: "a", x: -0.61, y: -0.20 };
        this.scene.textSpans[1] = { opacity: 1.0, text: "b", x: +0.48, y: -0.13 };
        this.scene.textSpans[2] = { opacity: 1.0, text: "c", x: -0.13, y: +0.54 };
    }

    public exitStep3() {
        this.scene.textSpans.length = 0;
    }

    // Returns true to force a redraw.
    public update(step: number, progress: number): boolean {
        const updateFn = this[`updateStep${step + 1}`] as (progress: number) => boolean;
        const exitFn = this[`exitStep${this.previousStep + 1}`] as () => void;
        const enterFn = this[`enterStep${step + 1}`] as () => void;
        if (step !== this.previousStep) {
            if (exitFn) {
                exitFn.apply(this);
            }
            if (enterFn) {
                enterFn.apply(this);
            }
            this.previousStep = step;
        }
        if (updateFn) {
            return updateFn.apply(this, [progress]) as boolean;
        }
        return this.updateStep1(0);
    }

    public updateStep1(progress: number): boolean {
        const A = smoothstep(0.16, 0.29, progress); // Move cylinder up and camera out.
        const B = smoothstep(0.28, 0.42, progress); // Fade in cylinder gridlines.
        const C = smoothstep(0.42, 0.66, progress); // Crossfade gridlines from cylinder to sphere.
        const D = smoothstep(0.66, 0.90, progress); // Move cylinder down and camera in.
        const E = smoothstep(0.95, 1.00, progress); // Fade out gridlines, move cylinder up & out.

        glm.vec3.lerp(this.scene.viewpoint.eye, [0, 0, 3], [0, 1.5, 3.5], A * (1 - D));

        const cylinderZ = mix(-0.5 + (1.0 - A * (1 - D)), -4.0, E);
        const m1 = glm.mat4.fromRotation(glm.mat4.create(), Math.PI / 2, [1, 0, 0]);
        const m2 = glm.mat4.fromTranslation(glm.mat4.create(), [0, 0, cylinderZ]);
        const m3 = glm.mat4.fromScaling(glm.mat4.create(), [1, 1, 2]);
        glm.mat4.multiply(m1, m1, m3);
        glm.mat4.multiply(m1, m1, m2);
        glm.mat4.copy(this.scene.cylinderTransform, m1);

        this.scene.sphereGridlines = C * (1 - E);
        this.scene.cylinderGridlines = B * (1 - C);
        this.scene.baseColor = [0.0, 0.0, 0.0, 0.0];
        return false;
    }

    public updateStep2(progress: number) {
        const A = smoothstep(0.00, 0.11, progress); // Fade in the great circle and change the camera
        const B = smoothstep(0.18, 0.22, progress); // Fade in the second great circle and lune
        const C = smoothstep(0.31, 0.51, progress); // Widen lune to entire sphere
        const D = smoothstep(0.61, 0.71, progress); // Narrow lune back down
        const E = smoothstep(0.72, 0.81, progress); // Fade in antipode
        const F = smoothstep(0.90, 1.00, progress); // Fade out the double-lune and change the camera

        glm.vec3.lerp(this.scene.viewpoint.eye, [0, 0, 3], [0, 1, 3], A * (1 - F));

        this.scene.greatCircle = A * (1 - F);
        this.scene.luneAlpha = B * (1 - F);
        this.scene.luneExpansion = C * (1 - D);
        this.scene.antipodeAlpha = E * (1 - F);
        return false;
    }

    public updateStep3(progress: number) {
        const A =  smoothstep(0.00, 0.08, progress); // Draw the geodesic triangle and change the camera
        const B2 = smoothstep(0.17, 0.23, progress); // Expand triangle to 90-90-90
        const B1 = smoothstep(0.23, 0.26, progress); // Change the camera to see polar triangle
        const C =  smoothstep(0.35, 0.40, progress); // Shrink triangle back and revert the cam
        const D =  smoothstep(0.40, 0.42, progress); // Fade in letters A B C
        const E =  smoothstep(0.52, 0.63, progress); // Fade in and out three double lunes sequentially
        const F =  smoothstep(0.63, 0.69, progress); // Fade in three double lunes simultaneously
        const G =  smoothstep(0.69, 0.75, progress); // Rotate to see antipode
        const H =  smoothstep(0.75, 0.77, progress); // Rotate back to normal
        const H2 = smoothstep(0.77, 0.92, progress); // Fade in letters A B C again
        const I =  smoothstep(0.92, 1.00, progress); // Fade everything out and change the camera

        const cam0 = glm.vec3.create();
        const cam1 = glm.vec3.create();

        glm.vec3.lerp(cam0, [0, 0, 3], [0, 1, 3], A * (1 - I));
        glm.vec3.lerp(cam1, cam0, [2, 2, 2], B1 * (1 - C));
        glm.vec3.lerp(this.scene.viewpoint.eye, cam1, [0, -1, 3], G * (1 - H));

        this.scene.rotation = G * (1 - H) * Math.PI;
        this.scene.fadeInTriangle = A * (1 - I);
        this.scene.triangleExpansion = B2 * (1 - C);

        const EA = Math.sin(clamp(E  * 3 - 0, 0, 1) * Math.PI);
        const EB = Math.sin(clamp(E  * 3 - 1, 0, 1) * Math.PI);
        const EC = Math.sin(clamp(E  * 3 - 2, 0, 1) * Math.PI);

        this.scene.fadeInLuneA = EA;
        this.scene.fadeInLuneB = EB;
        this.scene.fadeInLuneC = EC;

        if (F > 0 && F <= 1) {
            this.scene.fadeInLuneA = F * (1 - I);
            this.scene.fadeInLuneB = F * (1 - I);
            this.scene.fadeInLuneC = F * (1 - I);
        }

        const textOpacity = D * (1 - F) + H2 * (1 - I);
        this.scene.textSpans[0].opacity = textOpacity;
        this.scene.textSpans[1].opacity = textOpacity;
        this.scene.textSpans[2].opacity = textOpacity;

        return false;
    }

    public updateStep4(progress: number) {
        const A = smoothstep(0.00, 0.14, progress); // Draw the geodesic polygon and change the camera
        const I = smoothstep(0.93, 1.00, progress); // Revert camera and undraw the polygon.

        glm.vec3.lerp(this.scene.viewpoint.eye, [0, 0, 3], [0, 1, 3], A * (1 - I));
        this.scene.fadeInPolygon = A * (1 - I);

        return false;
    }
}

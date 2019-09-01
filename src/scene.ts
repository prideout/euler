import * as glm from "gl-matrix";

export class Viewpoint {
    public center: glm.vec3 = glm.vec3.fromValues(0, 0, 0);
    public eye: glm.vec3 = glm.vec3.fromValues(0, 1, 3);
    public up: glm.vec3 = glm.vec3.fromValues(0, 1, 0);
}

export class TextSpan {
    public opacity: number;
    public text: string;
    public x: number;
    public y: number;
}

export class Scene {
    public antipodeAlpha = 0;
    public baseColor = [0, 0, 0, 0];
    public cylinderGridlines = 0;
    public readonly cylinderTransform = glm.mat4.create();
    public fadeInLuneA = 0;
    public fadeInLuneB = 0;
    public fadeInLuneC = 0;
    public fadeInPolygon = 0;
    public fadeInTriangle = 0;
    public greatCircle = 0;
    public inflation = 0;
    public luneAlpha = 0;
    public luneExpansion = 0;
    public opacity = 0;
    public rotation = 0;
    public sphereGridlines = 0;
    public readonly textSpans: TextSpan[] = [];
    public triangleExpansion = 0;
    public readonly viewpoint = new Viewpoint();
}

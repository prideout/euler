import * as Filament from "filament";
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
    public backCylinderEntity: Filament.Entity;
    public frontCylinderEntity: Filament.Entity;
    public rotation = 0;
    public sphereEntity: Filament.Entity;
    public step1CylinderBackMaterial: Filament.MaterialInstance;
    public step1CylinderFrontMaterial: Filament.MaterialInstance;
    public step1Material: Filament.MaterialInstance;
    public step2Material: Filament.MaterialInstance;
    public step3Material: Filament.MaterialInstance;
    public readonly textSpans: TextSpan[] = [];
    public transformManager: Filament.TransformManager;
    public readonly viewpoint = new Viewpoint();
}

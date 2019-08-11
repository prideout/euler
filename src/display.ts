import * as d3 from "d3";
import * as Filament from "filament";
import * as glm from "gl-matrix";

import * as urls from "./urls";

class Viewpoint {
    public center: glm.vec3 = glm.vec3.fromValues(0, 0, 0);
    public eye: glm.vec3 = glm.vec3.fromValues(0, 1, 3);
    public up: glm.vec3 = glm.vec3.fromValues(0, 1, 0);
}

const clamp = (val: number, lower: number, upper: number): number => Math.max(Math.min(val, upper), lower);
const mix = (a: number, b: number, t: number): number => a * (1 - t) + b * t;

const smoothstep = (edge0: number, edge1: number, x: number): number => {
    const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return t * t * (3.0 - t * 2.0);
};

export class Display {
    private backCylinderEntity: Filament.Entity;
    private readonly camera: Filament.Camera;
    private readonly canvas: HTMLCanvasElement;
    private currentMaterial: Filament.MaterialInstance;
    private currentProgress = 0;
    private currentStep = 0;
    private readonly engine: Filament.Engine;
    private frontCylinderEntity: Filament.Entity;
    private readonly indirectLight: Filament.IndirectLight;
    private readonly renderer: Filament.Renderer;
    private readonly scene: Filament.Scene;
    private readonly skybox: Filament.Skybox;
    private readonly sphereEntity: Filament.Entity;
    private readonly step1CylinderBackMaterial: Filament.MaterialInstance;
    private readonly step1CylinderFrontMaterial: Filament.MaterialInstance;
    private readonly step1Material: Filament.MaterialInstance;
    private readonly step2Material: Filament.MaterialInstance;
    private readonly swapChain: Filament.SwapChain;
    private readonly view: Filament.View;
    private readonly viewpoint = new Viewpoint();

    public constructor(canvas: HTMLCanvasElement, onFinishedLoading: () => void) {
        window["vec3"] = glm.vec3; // tslint:disable-line

        this.canvas = canvas;
        this.engine = Filament.Engine.create(canvas);
        this.scene = this.engine.createScene();
        this.swapChain = this.engine.createSwapChain();
        this.renderer = this.engine.createRenderer();
        this.camera = this.engine.createCamera();
        this.view = this.engine.createView();
        this.view.setCamera(this.camera);
        this.view.setScene(this.scene);

        const step1Material = this.engine.createMaterial(urls.step1Material);
        const step1CylinderBackMaterial = this.engine.createMaterial(urls.step1CylinderBackMaterial);
        const step1CylinderFrontMaterial = this.engine.createMaterial(urls.step1CylinderFrontMaterial);
        const step2Material = this.engine.createMaterial(urls.step2Material);

        this.step1Material = step1Material.createInstance();
        this.step1CylinderBackMaterial = step1CylinderBackMaterial.createInstance();
        this.step1CylinderFrontMaterial = step1CylinderFrontMaterial.createInstance();
        this.step2Material = step2Material.createInstance();
        this.currentMaterial = this.step1Material;

        this.step1Material.setColor3Parameter("baseColor", Filament.RgbType.sRGB, [0.0, 0.4, 0.8]);
        this.step1Material.setFloatParameter("roughness", 0.5);
        this.step1Material.setFloatParameter("clearCoat", 0.0);
        this.step1Material.setFloatParameter("clearCoatRoughness", 0.8);

        this.step1CylinderBackMaterial.setColor4Parameter("baseColor", Filament.RgbaType.sRGB, [0.0, 0.8, 0.4, 1.0]);
        this.step1CylinderBackMaterial.setFloatParameter("roughness", 0.5);
        this.step1CylinderBackMaterial.setFloatParameter("clearCoat", 0.0);
        this.step1CylinderBackMaterial.setFloatParameter("clearCoatRoughness", 0.8);

        this.step1CylinderFrontMaterial.setColor4Parameter("baseColor", Filament.RgbaType.sRGB, [0.0, 0.8, 0.4, 1.0]);
        this.step1CylinderFrontMaterial.setFloatParameter("roughness", 0.5);
        this.step1CylinderFrontMaterial.setFloatParameter("clearCoat", 0.0);
        this.step1CylinderFrontMaterial.setFloatParameter("clearCoatRoughness", 0.8);

        this.step2Material.setColor3Parameter("baseColor", Filament.RgbType.sRGB, [0.0, 0.4, 0.8]);
        this.step2Material.setFloatParameter("roughness", 0.5);
        this.step2Material.setFloatParameter("clearCoat", 0.0);
        this.step2Material.setFloatParameter("clearCoatRoughness", 0.8);

        this.createCylinders();

        this.sphereEntity = this.createSphere();
        this.scene.addEntity(this.sphereEntity);

        this.skybox = this.engine.createSkyFromKtx(urls.sky);
        this.indirectLight = this.engine.createIblFromKtx(urls.ibl);
        this.indirectLight.setIntensity(50000);

        const iblDirection = this.indirectLight.getDirectionEstimate();
        const iblColor = this.indirectLight.getColorEstimate(iblDirection);

        this.scene.setSkybox(this.skybox);
        this.scene.setIndirectLight(this.indirectLight);

        const sunlight: Filament.Entity = Filament.EntityManager.get().create();
        Filament.LightManager.Builder(Filament.LightManager$Type.SUN)
            .color(iblColor.slice(0, 3) as number[])
            .castShadows(false)
            .intensity(iblColor[3])
            .direction([0.5, -1, 0])
            .build(this.engine, sunlight);
        this.scene.addEntity(sunlight);

        this.currentStep = -1;
        this.setAnimation(0, 0);
    }

    public render() {
        this.camera.lookAt(this.viewpoint.eye, this.viewpoint.center, this.viewpoint.up);
        this.renderer.render(this.swapChain, this.view);
    }

    public resize() {
        const Fov = Filament.Camera$Fov;

        const dpr: number = window.devicePixelRatio;
        const width: number = this.canvas.width = this.canvas.clientWidth * dpr;
        const height: number = this.canvas.height = this.canvas.clientHeight * dpr;
        this.view.setViewport([0, 0, width, height]);

        const aspect: number = width / height;
        const fov: number = aspect < 1 ? Fov.HORIZONTAL : Fov.VERTICAL;
        this.camera.setProjectionFov(45, aspect, 1.0, 20000.0, fov);
    }

    public setAnimation(step: number, progress: number) {
        const sRGB = Filament.RgbaType.sRGB;
        if (this.currentStep !== step) {
            const rm = this.engine.getRenderableManager();
            const sphere = rm.getInstance(this.sphereEntity);
            this.scene.remove(this.frontCylinderEntity);
            this.scene.remove(this.backCylinderEntity);
            switch (step) {
                case 0:
                    this.scene.addEntity(this.backCylinderEntity);
                    this.scene.addEntity(this.frontCylinderEntity);
                    this.currentMaterial = this.step1Material;
                    glm.vec3.copy(this.viewpoint.eye, [0, 0, 3]);
                    break;
                case 1:
                    this.currentMaterial = this.step2Material;
                    glm.vec3.copy(this.viewpoint.eye, [0, 0, 3]);
                    break;
                default:
                    this.currentMaterial = this.step1Material;
                    glm.vec3.copy(this.viewpoint.eye, [0, 0, 3]);
            }
            rm.setMaterialInstanceAt(sphere, 0, this.currentMaterial);
            this.currentStep = step;
            this.currentProgress = progress;
        } else if (this.currentProgress !== progress) {
            this.currentProgress = progress;
        }

        switch (step) {
            case 0: {
                const fadeIn = smoothstep(.2, .3, progress);
                const fadeOut = 1.0 - smoothstep(.6, .7, progress);
                const cylinderPresence = fadeIn * fadeOut;
                let cylinderZ = -0.5 + (1.0 - cylinderPresence);

                const cameraFn = d3.interpolate([0, 0, 3], [0, 3, 7]);
                glm.vec3.copy(this.viewpoint.eye, cameraFn(cylinderPresence));

                cylinderZ = mix(cylinderZ, -10.0, smoothstep(0.8, 1.0, progress));


                const m1 = glm.mat4.fromRotation(glm.mat4.create(), Math.PI / 2, [1, 0, 0]);
                const m2 = glm.mat4.fromTranslation(glm.mat4.create(), [0, 0, cylinderZ]);
                const m3 = glm.mat4.fromScaling(glm.mat4.create(), [1, 1, 2]);
                glm.mat4.multiply(m1, m1, m3);
                glm.mat4.multiply(m1, m1, m2);

                const tcm = this.engine.getTransformManager();
                const front = tcm.getInstance(this.frontCylinderEntity);
                tcm.setTransform(front, m1);
                front.delete();
                const back = tcm.getInstance(this.backCylinderEntity);
                tcm.setTransform(back, m1);
                back.delete();

                this.step1CylinderFrontMaterial.setColor4Parameter("baseColor", sRGB, [0.0, 0.0, 0.0, 0.0]);
                this.step1CylinderBackMaterial.setColor4Parameter("baseColor",  sRGB, [0.0, 0.0, 0.0, 0.0]);

                break;
            }
            case 1: {

                const fadeInLune = smoothstep(0.0, 0.2, progress);
                const fadeOutLune = 1.0 - smoothstep(0.8, 1.0, progress);
                const lunePresence = fadeInLune * fadeOutLune;

                const cameraFn = d3.interpolate([0, 0, 3], [0, 1, 3]);
                glm.vec3.copy(this.viewpoint.eye, cameraFn(lunePresence));

                this.currentMaterial.setFloatParameter("progress", lunePresence);

                break;
            }
            default:
        }
}

    private createCylinders() {
        const AttributeType = Filament.VertexBuffer$AttributeType;
        const IndexType = Filament.IndexBuffer$IndexType;
        const PrimitiveType = Filament.RenderableManager$PrimitiveType;
        const VertexAttribute = Filament.VertexAttribute;

        const kSlicesCount = 50.;
        const kVertCount = kSlicesCount * 2;
        const kThetaInc = Math.PI * 2 / kSlicesCount;

        const cylinder = {
            normals: new Float32Array(kVertCount * 3),
            tangents: undefined,
            triangles: new Uint16Array(kSlicesCount * 6),
            vertices: new Float32Array(kVertCount * 3),
        };

        let theta = 0;
        let v = -1;
        let n = -1;
        let t = -1;
        for (let i = 0; i < kSlicesCount; i += 1, theta += kThetaInc) {

            cylinder.triangles[t += 1] = ((v / 3) + 3) % kVertCount;
            cylinder.triangles[t += 1] = ((v / 3) + 2) % kVertCount;
            cylinder.triangles[t += 1] = ((v / 3) + 1) % kVertCount;
            cylinder.triangles[t += 1] = ((v / 3) + 3) % kVertCount;
            cylinder.triangles[t += 1] = ((v / 3) + 4) % kVertCount;
            cylinder.triangles[t += 1] = ((v / 3) + 2) % kVertCount;

            cylinder.vertices[v += 1] = Math.cos(theta);
            cylinder.vertices[v += 1] = Math.sin(theta);
            cylinder.vertices[v += 1] = 0;
            cylinder.vertices[v += 1] = Math.cos(theta);
            cylinder.vertices[v += 1] = Math.sin(theta);
            cylinder.vertices[v += 1] = 1;

            cylinder.normals[n += 1] = Math.cos(theta);
            cylinder.normals[n += 1] = Math.sin(theta);
            cylinder.normals[n += 1] = 0;
            cylinder.normals[n += 1] = Math.cos(theta);
            cylinder.normals[n += 1] = Math.sin(theta);
            cylinder.normals[n += 1] = 0;
        }

        const normals = Filament._malloc(cylinder.normals.length * cylinder.normals.BYTES_PER_ELEMENT);
        Filament.HEAPU8.set(new Uint8Array(cylinder.normals.buffer), normals);

        /* tslint:disable */
        const sob = new Filament.SurfaceOrientation$Builder();
        sob.vertexCount(kVertCount);
        sob.normals(normals, 0);
        const orientation = sob.build();
        Filament._free(normals);
        const quatsBufferSize = kVertCount * 8;
        const quatsBuffer = Filament._malloc(quatsBufferSize);
        orientation.getQuats(quatsBuffer, kVertCount, Filament.VertexBuffer$AttributeType.SHORT4);
        const tangentsMemory = Filament.HEAPU8.subarray(quatsBuffer, quatsBuffer + quatsBufferSize).slice().buffer;
        Filament._free(quatsBuffer);
        cylinder.tangents = new Int16Array(tangentsMemory);
        /* tslint:enable */

        const vb = Filament.VertexBuffer.Builder()
            .vertexCount(kVertCount)
            .bufferCount(2)
            .attribute(VertexAttribute.POSITION, 0, AttributeType.FLOAT3, 0, 0)
            .attribute(VertexAttribute.TANGENTS, 1, AttributeType.SHORT4, 0, 0)
            .normalized(VertexAttribute.TANGENTS)
            .build(this.engine);

        const ib = Filament.IndexBuffer.Builder()
            .indexCount(cylinder.triangles.length)
            .bufferType(IndexType.USHORT)
            .build(this.engine);

        vb.setBufferAt(this.engine, 0, cylinder.vertices);
        vb.setBufferAt(this.engine, 1, cylinder.tangents);
        ib.setBuffer(this.engine, cylinder.triangles);

        const m1 = glm.mat4.fromRotation(glm.mat4.create(), Math.PI / 2, [1, 0, 0]);
        const m2 = glm.mat4.fromTranslation(glm.mat4.create(), [0, 0, -0.5]);
        const m3 = glm.mat4.fromScaling(glm.mat4.create(), [1, 1, 2]);
        glm.mat4.multiply(m1, m1, m3);
        glm.mat4.multiply(m1, m1, m2);

        this.frontCylinderEntity = Filament.EntityManager.get().create();
        Filament.RenderableManager.Builder(1)
            .boundingBox({ center: [-1, -1, -1], halfExtent: [1, 1, 1] })
            .material(0, this.step1CylinderFrontMaterial)
            .geometry(0, PrimitiveType.TRIANGLES, vb, ib)
            .culling(false)
            .build(this.engine, this.frontCylinderEntity);

        this.backCylinderEntity = Filament.EntityManager.get().create();
        Filament.RenderableManager.Builder(1)
            .boundingBox({ center: [-1, -1, -1], halfExtent: [1, 1, 1] })
            .material(0, this.step1CylinderBackMaterial)
            .geometry(0, PrimitiveType.TRIANGLES, vb, ib)
            .culling(false)
            .build(this.engine, this.backCylinderEntity);

        const tcm = this.engine.getTransformManager();
        tcm.create(this.frontCylinderEntity);
        let inst = tcm.getInstance(this.frontCylinderEntity);
        tcm.setTransform(inst, m1);
        inst.delete();

        tcm.create(this.backCylinderEntity);
        inst = tcm.getInstance(this.backCylinderEntity);
        tcm.setTransform(inst, m1);
        inst.delete();
    }

    private createSphere(): Filament.Entity {
        const AttributeType = Filament.VertexBuffer$AttributeType;
        const IndexType = Filament.IndexBuffer$IndexType;
        const PrimitiveType = Filament.RenderableManager$PrimitiveType;
        const VertexAttribute = Filament.VertexAttribute;

        const icosphere = new Filament.IcoSphere(5);

        const vb: Filament.VertexBuffer = Filament.VertexBuffer.Builder()
            .vertexCount(icosphere.vertices.length / 3)
            .bufferCount(2)
            .attribute(VertexAttribute.POSITION, 0, AttributeType.FLOAT3, 0, 0)
            .attribute(VertexAttribute.TANGENTS, 1, AttributeType.SHORT4, 0, 0)
            .normalized(VertexAttribute.TANGENTS)
            .build(this.engine);

        const ib: Filament.IndexBuffer = Filament.IndexBuffer.Builder()
            .indexCount(icosphere.triangles.length)
            .bufferType(IndexType.USHORT)
            .build(this.engine);

        vb.setBufferAt(this.engine, 0, icosphere.vertices);
        vb.setBufferAt(this.engine, 1, icosphere.tangents);
        ib.setBuffer(this.engine, icosphere.triangles);

        const renderable = Filament.EntityManager.get().create();
        Filament.RenderableManager.Builder(1)
            .boundingBox({ center: [-1, -1, -1], halfExtent: [1, 1, 1] })
            .material(0, this.step1Material)
            .geometry(0, PrimitiveType.TRIANGLES, vb, ib)
            .build(this.engine, renderable);

        return renderable;
    }
}

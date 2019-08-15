import * as Filament from "filament";
import * as glm from "gl-matrix";

import { Animation } from "./animation";
import * as urls from "./urls";

export class Display {
    private readonly animation: Animation = new Animation();
    private readonly camera: Filament.Camera;
    private readonly canvas2d: HTMLCanvasElement;
    private readonly canvas3d: HTMLCanvasElement;
    private currentStep = 0;
    private readonly engine: Filament.Engine;
    private readonly indirectLight: Filament.IndirectLight;
    private readonly renderer: Filament.Renderer;
    private readonly scene: Filament.Scene;
    private readonly skybox: Filament.Skybox;
    private readonly swapChain: Filament.SwapChain;
    private readonly view: Filament.View;

    public constructor(canvas2d: HTMLCanvasElement, canvas3d: HTMLCanvasElement, onFinishedLoading: () => void) {
        const sRGB = Filament.RgbType.sRGB;
        window["vec3"] = glm.vec3; // tslint:disable-line

        this.canvas2d = canvas2d;
        this.canvas3d = canvas3d;

        // this.canvas2d.getContext("2d"); // TODO: use this

        this.engine = Filament.Engine.create(canvas3d);
        this.scene = this.engine.createScene();
        this.swapChain = this.engine.createSwapChain();
        this.renderer = this.engine.createRenderer();
        this.camera = this.engine.createCamera();
        this.view = this.engine.createView();
        this.view.setCamera(this.camera);
        this.view.setScene(this.scene);

        this.animation.transformManager = this.engine.getTransformManager();

        const step1Material = this.engine.createMaterial(urls.step1Material);
        const step1CylinderBackMaterial = this.engine.createMaterial(urls.step1CylinderBackMaterial);
        const step1CylinderFrontMaterial = this.engine.createMaterial(urls.step1CylinderFrontMaterial);
        const step2Material = this.engine.createMaterial(urls.step2Material);
        const step3Material = this.engine.createMaterial(urls.step3Material);

        const mats: Filament.MaterialInstance[] = [];

        mats[0] = this.animation.step1Material = step1Material.createInstance();
        mats[1] = this.animation.step1CylinderBackMaterial = step1CylinderBackMaterial.createInstance();
        mats[2] = this.animation.step1CylinderFrontMaterial = step1CylinderFrontMaterial.createInstance();
        mats[3] = this.animation.step2Material = step2Material.createInstance();
        mats[4] = this.animation.step3Material = step3Material.createInstance();

        for (const mat of mats) {
            mat.setColor3Parameter("baseColor", sRGB, [0.0, 0.4, 0.8]);
            mat.setFloatParameter("roughness", 0.5);
            mat.setFloatParameter("clearCoat", 0.0);
            mat.setFloatParameter("clearCoatRoughness", 0.8);
        }

        this.createCylinders();

        this.animation.sphereEntity = this.createSphere();
        this.scene.addEntity(this.animation.sphereEntity);

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
        this.update(0);
    }

    public getAnimation() {
        return this.animation;
    }

    public render() {
        const vp = this.animation.viewpoint;
        this.camera.lookAt(vp.eye, vp.center, vp.up);
        this.renderer.render(this.swapChain, this.view);
    }

    public resize() {
        const Fov = Filament.Camera$Fov;

        const dpr: number = window.devicePixelRatio;
        const width: number = this.canvas3d.width = this.canvas3d.clientWidth * dpr;
        const height: number = this.canvas3d.height = this.canvas3d.clientHeight * dpr;
        this.view.setViewport([0, 0, width, height]);

        const aspect: number = width / height;
        const fov: number = aspect < 1 ? Fov.HORIZONTAL : Fov.VERTICAL;
        this.camera.setProjectionFov(45, aspect, 1.0, 20000.0, fov);
    }

    public update(step: number) {
        if (this.currentStep !== step) {
            const rm = this.engine.getRenderableManager();
            const sphere = rm.getInstance(this.animation.sphereEntity);
            this.scene.remove(this.animation.frontCylinderEntity);
            this.scene.remove(this.animation.backCylinderEntity);
            let currentMaterial: Filament.MaterialInstance;
            switch (step) {
                case 0:
                    this.scene.addEntity(this.animation.backCylinderEntity);
                    this.scene.addEntity(this.animation.frontCylinderEntity);
                    currentMaterial = this.animation.step1Material;
                    break;
                case 1:
                    currentMaterial = this.animation.step2Material;
                    break;
                case 2:
                    currentMaterial = this.animation.step3Material;
                    break;
                default:
                    currentMaterial = this.animation.step1Material;
            }
            glm.vec3.copy(this.animation.viewpoint.eye, [0, 0, 3]);
            rm.setMaterialInstanceAt(sphere, 0, currentMaterial);
            this.currentStep = step;
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

        this.animation.frontCylinderEntity = Filament.EntityManager.get().create();
        Filament.RenderableManager.Builder(1)
            .boundingBox({ center: [-1, -1, -1], halfExtent: [1, 1, 1] })
            .material(0, this.animation.step1CylinderFrontMaterial)
            .geometry(0, PrimitiveType.TRIANGLES, vb, ib)
            .culling(false)
            .build(this.engine, this.animation.frontCylinderEntity);

        this.animation.backCylinderEntity = Filament.EntityManager.get().create();
        Filament.RenderableManager.Builder(1)
            .boundingBox({ center: [-1, -1, -1], halfExtent: [1, 1, 1] })
            .material(0, this.animation.step1CylinderBackMaterial)
            .geometry(0, PrimitiveType.TRIANGLES, vb, ib)
            .culling(false)
            .build(this.engine, this.animation.backCylinderEntity);

        const tcm = this.engine.getTransformManager();
        tcm.create(this.animation.frontCylinderEntity);
        let inst = tcm.getInstance(this.animation.frontCylinderEntity);
        tcm.setTransform(inst, m1);
        inst.delete();

        tcm.create(this.animation.backCylinderEntity);
        inst = tcm.getInstance(this.animation.backCylinderEntity);
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
            .material(0, this.animation.step1Material)
            .geometry(0, PrimitiveType.TRIANGLES, vb, ib)
            .build(this.engine, renderable);

        return renderable;
    }
}

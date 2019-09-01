import * as Filament from "filament";
import * as glm from "gl-matrix";

import { Scene } from "./scene";
import * as urls from "./urls";

export class Display {
    private readonly backCylinderEntity: Filament.Entity;
    private readonly camera: Filament.Camera;
    private readonly canvas2d: HTMLCanvasElement;
    private readonly canvas3d: HTMLCanvasElement;
    private readonly context2d: CanvasRenderingContext2D;
    private currentStep = 0;
    private readonly engine: Filament.Engine;
    private readonly filamentScene: Filament.Scene;
    private readonly frontCylinderEntity: Filament.Entity;
    private readonly indirectLight: Filament.IndirectLight;
    private readonly production: boolean;
    private readonly renderer: Filament.Renderer;
    private readonly scene: Scene;
    private readonly skybox: Filament.Skybox;
    private readonly sphereEntity: Filament.Entity;
    private readonly step1CylinderBackMaterial: Filament.MaterialInstance;
    private readonly step1CylinderFrontMaterial: Filament.MaterialInstance;
    private readonly step1Material: Filament.MaterialInstance;
    private readonly step2Material: Filament.MaterialInstance;
    private readonly step3Material: Filament.MaterialInstance;
    private readonly step4Material: Filament.MaterialInstance;
    private readonly swapChain: Filament.SwapChain;
    private readonly view: Filament.View;

    public constructor(production: boolean, scene: Scene) {

        glm.glMatrix.setMatrixArrayType(Array);

        // tslint:disable-next-line: no-string-literal
        window["vec3"] = glm.vec3;

        this.production = production;
        this.scene = scene;
        this.canvas2d = document.getElementById("canvas2d") as HTMLCanvasElement;
        this.canvas3d = document.getElementById("canvas3d") as HTMLCanvasElement;
        this.context2d = this.canvas2d.getContext("2d");
        this.engine = Filament.Engine.create(this.canvas3d);
        this.filamentScene = this.engine.createScene();
        this.swapChain = this.engine.createSwapChain();
        this.renderer = this.engine.createRenderer();
        this.camera = this.engine.createCamera();
        this.view = this.engine.createView();
        this.view.setCamera(this.camera);
        this.view.setScene(this.filamentScene);

        const step1Material = this.engine.createMaterial(urls.step1Material);
        const step1CylinderBackMaterial = this.engine.createMaterial(urls.step1CylinderBackMaterial);
        const step1CylinderFrontMaterial = this.engine.createMaterial(urls.step1CylinderFrontMaterial);
        const step2Material = this.engine.createMaterial(urls.step2Material);
        const step3Material = this.engine.createMaterial(urls.step3Material);
        const step4Material = this.engine.createMaterial(urls.step4Material);

        const mats: Filament.MaterialInstance[] = [
            this.step1Material = step1Material.createInstance(),
            this.step1CylinderBackMaterial = step1CylinderBackMaterial.createInstance(),
            this.step1CylinderFrontMaterial = step1CylinderFrontMaterial.createInstance(),
            this.step2Material = step2Material.createInstance(),
            this.step3Material = step3Material.createInstance(),
            this.step4Material = step4Material.createInstance(),
        ];

        const sRGB = Filament.RgbType.sRGB;
        for (const mat of mats) {
            mat.setColor3Parameter("baseColor", sRGB, [0.0, 0.4, 0.8]);
            mat.setFloatParameter("roughness", 0.5);
            mat.setFloatParameter("clearCoat", 0.0);
            mat.setFloatParameter("clearCoatRoughness", 0.8);
        }

        this.frontCylinderEntity = Filament.EntityManager.get().create();
        this.backCylinderEntity = Filament.EntityManager.get().create();
        this.sphereEntity = Filament.EntityManager.get().create();

        this.createCylinders();
        this.createSphere();

        this.filamentScene.addEntity(this.sphereEntity);

        this.skybox = this.engine.createSkyFromKtx(urls.sky);
        this.indirectLight = this.engine.createIblFromKtx(urls.ibl);
        this.indirectLight.setIntensity(50000);

        const iblDirection = this.indirectLight.getDirectionEstimate();
        const iblColor = this.indirectLight.getColorEstimate(iblDirection);

        this.filamentScene.setSkybox(this.skybox);
        this.filamentScene.setIndirectLight(this.indirectLight);

        const sunlight: Filament.Entity = Filament.EntityManager.get().create();
        Filament.LightManager.Builder(Filament.LightManager$Type.SUN)
            .color(iblColor.slice(0, 3) as number[])
            .castShadows(false)
            .intensity(iblColor[3])
            .direction([0.5, -1, 0])
            .build(this.engine, sunlight);
        this.filamentScene.addEntity(sunlight);

        this.currentStep = -1;
        this.update(0);
    }

    public render() {
        const vp = this.scene.viewpoint;
        this.camera.lookAt(vp.eye, vp.center, vp.up);
        this.renderer.render(this.swapChain, this.view);

        const width = this.canvas2d.width;
        const height = this.canvas2d.height;
        const fontSize = width / 36;

        this.context2d.setTransform(1, 0, 0, 1, 0, 0);
        this.context2d.clearRect(0, 0, width, height);
        this.context2d.font = `${fontSize}px 'circular-bold', sans-serif`;
        this.context2d.textAlign = "center";

        for (const span of this.scene.textSpans) {
            const x = width / 2 + span.x * width / 2;
            const y = height / 2 + span.y * width / 2;
            this.context2d.fillStyle = `rgba(0, 0, 0, ${span.opacity})`;
            this.context2d.fillText(span.text, x, y);
        }

        this.context2d.fillStyle = "rgba(0, 0, 0, 1)";

        // Draw horizontal guide line for step transitions.
        if (!this.production) {
            this.context2d.translate(width / 2.0, height / 2.0);
            this.context2d.scale(width / 2.0, width / 2.0);
            this.context2d.beginPath();
            this.context2d.moveTo(-1, 0);
            this.context2d.lineTo(+1, 0);
            this.context2d.lineWidth = 0.01;
            this.context2d.setLineDash([0.01, 0.02]);
            this.context2d.stroke();
        }
    }

    public resize() {
        const Fov = Filament.Camera$Fov;

        const dpr = window.devicePixelRatio;
        const width = this.canvas3d.width = this.canvas3d.clientWidth * dpr;
        const height = this.canvas3d.height = this.canvas3d.clientHeight * dpr;
        this.view.setViewport([0, 0, width, height]);

        this.canvas2d.width = width;
        this.canvas2d.height = height;
        this.context2d.setTransform(1, 0, 0, 1, 0, 0);
        this.context2d.translate(width / 2.0, height / 2.0);
        this.context2d.scale(width / 2.0, width / 2.0);

        const aspect: number = width / height;
        const fov = 45;
        const near = 1.0;
        const far = 20000.0;
        this.camera.setProjectionFov(fov, aspect, near, far, Fov.HORIZONTAL);
    }

    public update(step: number) {
        const rm = this.engine.getRenderableManager();
        const tcm = this.engine.getTransformManager();
        if (this.currentStep !== step) {
            const sphere = rm.getInstance(this.sphereEntity);
            this.filamentScene.remove(this.frontCylinderEntity);
            this.filamentScene.remove(this.backCylinderEntity);
            let currentMaterial: Filament.MaterialInstance;
            switch (step) {
                case 0:
                    this.filamentScene.addEntity(this.backCylinderEntity);
                    this.filamentScene.addEntity(this.frontCylinderEntity);
                default:
                    currentMaterial = this.step1Material;
                    break;
                case 1:
                    currentMaterial = this.step2Material;
                    break;
                case 2:
                    currentMaterial = this.step3Material;
                    break;
                case 3:
                    currentMaterial = this.step4Material;
                }
            rm.setMaterialInstanceAt(sphere, 0, currentMaterial);
            this.currentStep = step;
        }

        const sRGBA = Filament.RgbaType.sRGB;

        switch (step) {
            default:
            case 0:
                this.step1Material.setFloatParameter("gridlines", this.scene.sphereGridlines);
                this.step1CylinderFrontMaterial.setFloatParameter("gridlines", this.scene.cylinderGridlines);
                this.step1CylinderFrontMaterial.setColor4Parameter("baseColor", sRGBA, this.scene.baseColor);
                this.step1CylinderBackMaterial.setColor4Parameter("baseColor",  sRGBA, this.scene.baseColor);
                const front = tcm.getInstance(this.frontCylinderEntity);
                tcm.setTransform(front, this.scene.cylinderTransform);
                front.delete();
                const back = tcm.getInstance(this.backCylinderEntity);
                tcm.setTransform(back, this.scene.cylinderTransform);
                back.delete();
                break;
            case 1:
                this.step2Material.setFloatParameter("greatCircle", this.scene.greatCircle);
                this.step2Material.setFloatParameter("luneAlpha", this.scene.luneAlpha);
                this.step2Material.setFloatParameter("luneExpansion", this.scene.luneExpansion);
                this.step2Material.setFloatParameter("antipodeAlpha", this.scene.antipodeAlpha);
                break;
            case 2:
                this.step3Material.setFloatParameter("rotation", this.scene.rotation);
                this.step3Material.setFloatParameter("fadeInTriangle", this.scene.fadeInTriangle);
                this.step3Material.setFloatParameter("triangleExpansion", this.scene.triangleExpansion);
                this.step3Material.setFloatParameter("fadeInLuneA", this.scene.fadeInLuneA);
                this.step3Material.setFloatParameter("fadeInLuneB", this.scene.fadeInLuneB);
                this.step3Material.setFloatParameter("fadeInLuneC", this.scene.fadeInLuneC);
                break;
            case 3:
                this.step4Material.setFloatParameter("fadeInPolygon", this.scene.fadeInPolygon);
                this.step4Material.setFloatParameter("fadeInTriangle", this.scene.fadeInTriangle);
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

        Filament.RenderableManager.Builder(1)
            .boundingBox({ center: [-1, -1, -1], halfExtent: [1, 1, 1] })
            .material(0, this.step1CylinderFrontMaterial)
            .geometry(0, PrimitiveType.TRIANGLES, vb, ib)
            .culling(false)
            .build(this.engine, this.frontCylinderEntity);

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

    private createSphere() {
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

        Filament.RenderableManager.Builder(1)
            .boundingBox({ center: [-1, -1, -1], halfExtent: [1, 1, 1] })
            .material(0, this.step1Material)
            .geometry(0, PrimitiveType.TRIANGLES, vb, ib)
            .build(this.engine, this.sphereEntity);
    }
}

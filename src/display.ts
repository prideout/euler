import * as Filament from "filament";
import * as glm from "gl-matrix";

import * as polyhedron from "./polyhedron";
import { Scene } from "./scene";
import * as urls from "./urls";

export class Display {
    private backCylinderEntity: Filament.Entity;
    private readonly camera: Filament.Camera;
    private readonly canvas2d: HTMLCanvasElement;
    private readonly canvas3d: HTMLCanvasElement;
    private readonly context2d: CanvasRenderingContext2D;
    private currentStep = 0;
    private cylinderIndexBuffer: Filament.IndexBuffer;
    private cylinderVertexBuffer: Filament.VertexBuffer;
    private readonly engine: Filament.Engine;
    private readonly filamentScene: Filament.Scene;
    private frontCylinderEntity: Filament.Entity;
    private readonly indirectLight: Filament.IndirectLight;
    private polyhedronEntities: Filament.Entity[];
    private readonly production: boolean;
    private readonly renderer: Filament.Renderer;
    private readonly scene: Scene;
    private readonly skybox: Filament.Skybox;
    private sphereEntity: Filament.Entity;
    private readonly step1CylinderBackMaterial: Filament.MaterialInstance;
    private readonly step1CylinderFrontMaterial: Filament.MaterialInstance;
    private readonly step1SphereMaterial: Filament.MaterialInstance;
    private readonly step2SphereMaterial: Filament.MaterialInstance;
    private readonly step3SphereMaterial: Filament.MaterialInstance;
    private readonly step4SphereMaterial: Filament.MaterialInstance;
    private readonly step5PolyhedronMaterial: Filament.MaterialInstance;
    private readonly step5SphereMaterial: Filament.MaterialInstance;
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

        const step1SphereMaterial = this.engine.createMaterial(urls.step1SphereMaterial);
        const step1CylinderBackMaterial = this.engine.createMaterial(urls.step1CylinderBackMaterial);
        const step1CylinderFrontMaterial = this.engine.createMaterial(urls.step1CylinderFrontMaterial);
        const step2SphereMaterial = this.engine.createMaterial(urls.step2SphereMaterial);
        const step3SphereMaterial = this.engine.createMaterial(urls.step3SphereMaterial);
        const step4SphereMaterial = this.engine.createMaterial(urls.step4SphereMaterial);
        const step5PolyhedronMaterial = this.engine.createMaterial(urls.step5PolyhedronMaterial);
        const step5SphereMaterial = this.engine.createMaterial(urls.step5SphereMaterial);

        const mats: Filament.MaterialInstance[] = [
            this.step1SphereMaterial = step1SphereMaterial.createInstance(),
            this.step1CylinderBackMaterial = step1CylinderBackMaterial.createInstance(),
            this.step1CylinderFrontMaterial = step1CylinderFrontMaterial.createInstance(),
            this.step2SphereMaterial = step2SphereMaterial.createInstance(),
            this.step3SphereMaterial = step3SphereMaterial.createInstance(),
            this.step4SphereMaterial = step4SphereMaterial.createInstance(),
            this.step5SphereMaterial = step5SphereMaterial.createInstance(),
        ];

        this.step5PolyhedronMaterial = step5PolyhedronMaterial.createInstance();

        const sRGB = Filament.RgbType.sRGB;
        for (const mat of mats) {
            mat.setColor3Parameter("baseColor", sRGB, [0.0, 0.4, 0.8]);
            mat.setFloatParameter("roughness", 0.5);
            mat.setFloatParameter("clearCoat", 0.0);
            mat.setFloatParameter("clearCoatRoughness", 0.8);
        }

        this.createCylinders();
        this.createCentralSphere();
        this.createPolyhedron();

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

            if (this.currentStep === 4) {
                for (const entity of this.polyhedronEntities) {
                    this.filamentScene.remove(entity);
                }
            }

            let currentMaterial: Filament.MaterialInstance;
            switch (step) {
                case 0:
                    this.filamentScene.addEntity(this.backCylinderEntity);
                    this.filamentScene.addEntity(this.frontCylinderEntity);
                default:
                    currentMaterial = this.step1SphereMaterial;
                    break;
                case 1:
                    currentMaterial = this.step2SphereMaterial;
                    break;
                case 2:
                    currentMaterial = this.step3SphereMaterial;
                    break;
                case 3:
                    currentMaterial = this.step4SphereMaterial;
                    break;
                case 4:
                    currentMaterial = this.step5SphereMaterial;
                    for (const entity of this.polyhedronEntities) {
                        this.filamentScene.addEntity(entity);
                    }
            }
            rm.setMaterialInstanceAt(sphere, 0, currentMaterial);
            this.currentStep = step;
        }

        const sRGBA = Filament.RgbaType.sRGB;

        switch (step) {
            default:
            case 0:
                this.step1SphereMaterial.setFloatParameter("gridlines", this.scene.sphereGridlines);
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
                this.step2SphereMaterial.setFloatParameter("greatCircle", this.scene.greatCircle);
                this.step2SphereMaterial.setFloatParameter("luneAlpha", this.scene.luneAlpha);
                this.step2SphereMaterial.setFloatParameter("luneExpansion", this.scene.luneExpansion);
                this.step2SphereMaterial.setFloatParameter("antipodeAlpha", this.scene.antipodeAlpha);
                break;
            case 2:
                this.step3SphereMaterial.setFloatParameter("rotation", this.scene.rotation);
                this.step3SphereMaterial.setFloatParameter("fadeInTriangle", this.scene.fadeInTriangle);
                this.step3SphereMaterial.setFloatParameter("triangleExpansion", this.scene.triangleExpansion);
                this.step3SphereMaterial.setFloatParameter("fadeInLuneA", this.scene.fadeInLuneA);
                this.step3SphereMaterial.setFloatParameter("fadeInLuneB", this.scene.fadeInLuneB);
                this.step3SphereMaterial.setFloatParameter("fadeInLuneC", this.scene.fadeInLuneC);
                break;
            case 3:
                this.step4SphereMaterial.setFloatParameter("fadeInPolygon", this.scene.fadeInPolygon);
                this.step4SphereMaterial.setFloatParameter("fadeInTriangle", this.scene.fadeInTriangle);
                break;
            case 4:
                this.step5SphereMaterial.setFloatParameter("opacity", this.scene.opacity);
                this.step5PolyhedronMaterial.setFloatParameter("inflation", this.scene.inflation);
        }
    }

    private createCentralSphere() {
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

        this.sphereEntity = Filament.EntityManager.get().create();

        Filament.RenderableManager.Builder(1)
            .boundingBox({ center: [-1, -1, -1], halfExtent: [1, 1, 1] })
            .material(0, this.step1SphereMaterial)
            .geometry(0, PrimitiveType.TRIANGLES, vb, ib)
            .build(this.engine, this.sphereEntity);
    }

    private createCylinders() {
        const AttributeType = Filament.VertexBuffer$AttributeType;
        const IndexType = Filament.IndexBuffer$IndexType;
        const PrimitiveType = Filament.RenderableManager$PrimitiveType;
        const VertexAttribute = Filament.VertexAttribute;

        const kSlicesCount = 50;
        const kRingsCount = 12;
        const kVertCount = kSlicesCount * kRingsCount;
        const kThetaInc = Math.PI * 2 / kSlicesCount;

        const cylinder = {
            normals: new Float32Array(kVertCount * 3),
            tangents: undefined,
            triangles: new Uint16Array(kSlicesCount * 3 * 2 * (kRingsCount - 1)),
            vertices: new Float32Array(kVertCount * 3),
        };

        let t = 0;
        let v = 0;
        for (let j = 0; j < kRingsCount - 1; j += 1) {
            for (let i = 0; i < kSlicesCount; i += 1) {
                const k = (i + 1) % kSlicesCount;
                cylinder.triangles[t + 0] = v + i;
                cylinder.triangles[t + 1] = v + k;
                cylinder.triangles[t + 2] = v + i + kSlicesCount;
                cylinder.triangles[t + 3] = v + i + kSlicesCount;
                cylinder.triangles[t + 4] = v + k;
                cylinder.triangles[t + 5] = v + k + kSlicesCount;
                t += 6;
            }
            v += kSlicesCount;
        }

        v = 0;
        let z = 0;
        const deltaz = 1.0 / (kRingsCount - 1);

        for (let j = 0; j < kRingsCount; j += 1, z += deltaz) {
           let theta = 0;
           for (let i = 0; i < kSlicesCount; i += 1, theta += kThetaInc) {
                const c = Math.cos(theta);
                const s = Math.sin(theta);
                cylinder.normals[v + 0] = c;
                cylinder.normals[v + 1] = s;
                cylinder.normals[v + 2] = 0;
                cylinder.vertices[v + 0] = c;
                cylinder.vertices[v + 1] = s;
                cylinder.vertices[v + 2] = z;
                v += 3;
            }
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

        const vb = this.cylinderVertexBuffer = Filament.VertexBuffer.Builder()
            .vertexCount(kVertCount)
            .bufferCount(2)
            .attribute(VertexAttribute.POSITION, 0, AttributeType.FLOAT3, 0, 0)
            .attribute(VertexAttribute.TANGENTS, 1, AttributeType.SHORT4, 0, 0)
            .normalized(VertexAttribute.TANGENTS)
            .build(this.engine);

        const ib = this.cylinderIndexBuffer = Filament.IndexBuffer.Builder()
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

    private createPolyhedron() {
        const PrimitiveType = Filament.RenderableManager$PrimitiveType;

        const faces = polyhedron.truncated_icosahedron.faces;
        const edges = polyhedron.truncated_icosahedron.edges;
        const verts = polyhedron.truncated_icosahedron.verts;

        const vb = this.cylinderVertexBuffer;
        const ib = this.cylinderIndexBuffer;

        this.polyhedronEntities = [];
        this.polyhedronEntities.length = edges.length;

        const zed = glm.vec3.fromValues(0, 0, 1);
        const axis = glm.vec3.create();
        const dir = glm.vec3.create();
        const v0 = glm.vec3.create();
        const v1 = glm.vec3.create();
        const rad = 0.015;

        for (let i = 0; i < edges.length; i += 1) {
            const entity = this.polyhedronEntities[i] = Filament.EntityManager.get().create();

            Filament.RenderableManager.Builder(1)
                .boundingBox({ center: [-1, -1, -1], halfExtent: [1, 1, 1] })
                .material(0, this.step5PolyhedronMaterial)
                .geometry(0, PrimitiveType.TRIANGLES, vb, ib)
                .culling(false)
                .build(this.engine, entity);

            // Each cylinder has radius 1 and stretches from z = 0 to z = +1.

            glm.vec3.scale(v0, verts[edges[i][0]], 0.9);
            glm.vec3.scale(v1, verts[edges[i][1]], 0.9);

            glm.vec3.sub(dir, v1, v0);
            glm.vec3.normalize(dir, dir);
            glm.vec3.cross(axis, zed, dir);
            glm.vec3.normalize(axis, axis);

            const theta = Math.acos(glm.vec3.dot(zed, dir));
            const length = glm.vec3.distance(v0, v1);

            const m1 = glm.mat4.fromTranslation(glm.mat4.create(), v0);
            const m2 = glm.mat4.fromRotation(glm.mat4.create(), theta, axis);
            const m3 = glm.mat4.fromTranslation(glm.mat4.create(), [0, 0, -rad / 2]);
            const m4 = glm.mat4.fromScaling(glm.mat4.create(), [rad, rad, length + rad]);

            glm.mat4.multiply(m1, m1, m2);
            glm.mat4.multiply(m1, m1, m3);
            glm.mat4.multiply(m1, m1, m4);

            const tcm = this.engine.getTransformManager();
            tcm.create(entity);
            const inst = tcm.getInstance(entity);
            tcm.setTransform(inst, m1);
            inst.delete();
        }
    }
}

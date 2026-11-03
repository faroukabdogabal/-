import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Camera, ChevronDown, ChevronUp, Compass, Sparkles, Sun, X } from 'lucide-react';

interface SacredSanctuary3DModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCaptureAsBackground: (imageDataUrl: string) => void;
}

type SanctuaryLightingPreset = 'night' | 'fajr' | 'duha';
type SanctuaryCameraPreset = 'overview' | 'mihrab' | 'lantern' | 'rehal';

function createTileCanvasTexture(maxAniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#111923';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle marble veining + geometric 8-point Islamic star repeat
  ctx.strokeStyle = 'rgba(243, 207, 122, 0.16)';
  ctx.lineWidth = 2;
  const cells = 4;
  const step = 512 / cells;

  for (let gx = 0; gx < cells; gx++) {
    for (let gy = 0; gy < cells; gy++) {
      const cx = gx * step + step * 0.5;
      const cy = gy * step + step * 0.5;
      const r = step * 0.36;

      ctx.strokeRect(gx * step + 4, gy * step + 4, step - 8, step - 8);

      ctx.save();
      ctx.translate(cx, cy);
      for (let rot = 0; rot < 2; rot++) {
        ctx.save();
        ctx.rotate((rot * Math.PI) / 4);
        ctx.strokeRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 7);
  tex.anisotropy = maxAniso;
  return tex;
}

function createRugCanvasTexture(maxAniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 768;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 768);
  grad.addColorStop(0, '#0B3B2E');
  grad.addColorStop(0.5, '#0F4C3A');
  grad.addColorStop(1, '#082A21');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 768);

  // Ornate gold border & pointed prayer arch motif
  ctx.strokeStyle = '#E5BE6B';
  ctx.lineWidth = 10;
  ctx.strokeRect(26, 26, 460, 716);
  ctx.lineWidth = 3;
  ctx.strokeRect(42, 42, 428, 684);

  ctx.beginPath();
  ctx.moveTo(92, 650);
  ctx.lineTo(92, 260);
  ctx.quadraticCurveTo(92, 115, 256, 78);
  ctx.quadraticCurveTo(420, 115, 420, 260);
  ctx.lineTo(420, 650);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(243, 207, 122, 0.72)';
  ctx.lineWidth = 5;
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function createSoftShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  g.addColorStop(0, 'rgba(0, 0, 0, 0.52)');
  g.addColorStop(0.65, 'rgba(0, 0, 0, 0.18)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

function buildMihrabSanctuaryGroup(rugTexture: THREE.CanvasTexture): THREE.Group {
  const group = new THREE.Group();

  const warmLimestone = new THREE.MeshStandardMaterial({
    color: 0xd8cdb8,
    roughness: 0.62,
    metalness: 0.06,
  });
  const deepEmeraldTile = new THREE.MeshStandardMaterial({
    color: 0x0f4d3c,
    roughness: 0.34,
    metalness: 0.18,
  });
  const brushedBrass = new THREE.MeshStandardMaterial({
    color: 0xd9af57,
    roughness: 0.26,
    metalness: 0.86,
  });

  // 1. Two-tier stepped stone platform
  const lowerStep = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.16, 4.4), warmLimestone);
  lowerStep.position.set(0, 0.08, -1.6);
  lowerStep.receiveShadow = true;
  lowerStep.castShadow = true;
  group.add(lowerStep);

  const upperStep = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.14, 3.7), warmLimestone);
  upperStep.position.set(0, 0.23, -1.75);
  upperStep.receiveShadow = true;
  upperStep.castShadow = true;
  group.add(upperStep);

  // 2. Prayer rug flush on upper platform with polygonOffset to avoid z-fighting
  const rugMat = new THREE.MeshStandardMaterial({
    map: rugTexture,
    roughness: 0.84,
    metalness: 0.04,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const rugMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 3.1), rugMat);
  rugMesh.rotation.x = -Math.PI / 2;
  rugMesh.position.set(0, 0.303, -1.55);
  rugMesh.receiveShadow = true;
  group.add(rugMesh);

  // 3. Beveled ExtrudeGeometry Mihrab pointed arch wall
  const outerShape = new THREE.Shape();
  outerShape.moveTo(-2.15, 0);
  outerShape.lineTo(2.15, 0);
  outerShape.lineTo(2.15, 4.35);
  outerShape.lineTo(-2.15, 4.35);
  outerShape.closePath();

  const archHole = new THREE.Path();
  archHole.moveTo(-1.12, 0);
  archHole.lineTo(-1.12, 2.25);
  archHole.quadraticCurveTo(-1.12, 3.35, 0, 3.72);
  archHole.quadraticCurveTo(1.12, 3.35, 1.12, 2.25);
  archHole.lineTo(1.12, 0);
  archHole.closePath();
  outerShape.holes.push(archHole);

  const archGeom = new THREE.ExtrudeGeometry(outerShape, {
    depth: 0.48,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.035,
    bevelThickness: 0.035,
  });
  const archWall = new THREE.Mesh(archGeom, warmLimestone);
  archWall.position.set(0, 0.3, -3.35);
  archWall.castShadow = true;
  archWall.receiveShadow = true;
  group.add(archWall);

  // 4. Recessed emerald ceramic Mihrab niche backdrop & half-dome crown
  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(2.55, 4.1, 0.18), deepEmeraldTile);
  backPanel.position.set(0, 2.35, -3.52);
  backPanel.receiveShadow = true;
  group.add(backPanel);

  const crownFinial = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 24, 16),
    brushedBrass
  );
  crownFinial.position.set(0, 4.92, -3.11);
  crownFinial.castShadow = true;
  group.add(crownFinial);

  const crescentSpire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.06, 0.45, 12),
    brushedBrass
  );
  crescentSpire.position.set(0, 5.2, -3.11);
  group.add(crescentSpire);

  // 5. Twin flanking columns (plinth + shaft + brass collar + capital)
  for (const side of [-1, 1]) {
    const colX = side * 1.38;
    const colZ = -2.82;

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.24, 0.38), brushedBrass);
    plinth.position.set(colX, 0.42, colZ);
    plinth.castShadow = true;
    group.add(plinth);

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.15, 2.25, 20),
      warmLimestone
    );
    shaft.position.set(colX, 1.66, colZ);
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    group.add(shaft);

    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.155, 0.028, 12, 24),
      brushedBrass
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(colX, 2.76, colZ);
    group.add(collar);

    const capital = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.13, 0.26, 8),
      brushedBrass
    );
    capital.position.set(colX, 2.92, colZ);
    capital.castShadow = true;
    group.add(capital);
  }

  return group;
}

function buildMoroccanLanternGroup(): {
  group: THREE.Group;
  light: THREE.PointLight;
} {
  const group = new THREE.Group();

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xe3ba63,
    roughness: 0.24,
    metalness: 0.88,
  });

  const warmGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffdf9a,
    emissive: 0xffb347,
    emissiveIntensity: 1.35,
    roughness: 0.15,
    transmission: 0.55,
    thickness: 0.35,
  });

  // Lathe-turned lantern silhouette
  const points = [
    new THREE.Vector2(0.0, -0.42),
    new THREE.Vector2(0.08, -0.34),
    new THREE.Vector2(0.22, -0.15),
    new THREE.Vector2(0.26, 0.08),
    new THREE.Vector2(0.16, 0.28),
    new THREE.Vector2(0.21, 0.35),
    new THREE.Vector2(0.07, 0.52),
    new THREE.Vector2(0.0, 0.58),
  ];
  const bodyGeom = new THREE.LatheGeometry(points, 8);
  const cageFrame = new THREE.Mesh(
    bodyGeom,
    new THREE.MeshStandardMaterial({
      color: 0xd9af57,
      roughness: 0.3,
      metalness: 0.85,
      wireframe: false,
    })
  );
  cageFrame.scale.set(1.02, 0.32, 1.02);
  cageFrame.position.y = 0.36;
  cageFrame.castShadow = true;
  group.add(cageFrame);

  const glassCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.13, 0.46, 8),
    warmGlassMat
  );
  glassCore.position.y = 0.04;
  group.add(glassCore);

  const bottomCup = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.24, 8),
    brassMat
  );
  bottomCup.rotation.x = Math.PI;
  bottomCup.position.y = -0.31;
  group.add(bottomCup);

  // Vertical brass ribs around glass core
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const rib = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6),
      brassMat
    );
    rib.position.set(Math.cos(angle) * 0.185, 0.04, Math.sin(angle) * 0.185);
    group.add(rib);
  }

  // Suspension rod & top ring
  const chainRod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 1.45, 8),
    brassMat
  );
  chainRod.position.y = 1.22;
  group.add(chainRod);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.014, 8, 18), brassMat);
  ring.position.y = 0.54;
  group.add(ring);

  const light = new THREE.PointLight(0xffc56d, 3.2, 7.5, 1.8);
  light.position.set(0, 0.02, 0);
  group.add(light);

  return { group, light };
}

function buildRehalAndMushafGroup(): THREE.Group {
  const group = new THREE.Group();

  const walnutMat = new THREE.MeshStandardMaterial({
    color: 0x5a3821,
    roughness: 0.52,
    metalness: 0.08,
  });
  const parchmentMat = new THREE.MeshStandardMaterial({
    color: 0xf6eed9,
    roughness: 0.72,
    metalness: 0.02,
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xe0b861,
    roughness: 0.28,
    metalness: 0.82,
  });

  // Low octagonal courtesy table under the Rehal
  const lowTable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.58, 0.26, 8),
    walnutMat
  );
  lowTable.position.y = 0.43;
  lowTable.castShadow = true;
  lowTable.receiveShadow = true;
  group.add(lowTable);

  const brassRim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.54, 0.54, 0.035, 8),
    goldTrimMat
  );
  brassRim.position.y = 0.56;
  group.add(brassRim);

  // Crossed X-shaped wooden Rehal boards
  const leftBoard = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.028, 0.38), walnutMat);
  leftBoard.position.set(-0.11, 0.72, 0);
  leftBoard.rotation.z = -0.46;
  leftBoard.castShadow = true;
  group.add(leftBoard);

  const rightBoard = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.028, 0.38), walnutMat);
  rightBoard.position.set(0.11, 0.72, 0);
  rightBoard.rotation.z = 0.46;
  rightBoard.castShadow = true;
  group.add(rightBoard);

  // Open Mushaf pages resting in the Rehal cradle
  const leftPage = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.024, 0.33), parchmentMat);
  leftPage.position.set(-0.115, 0.775, 0);
  leftPage.rotation.z = 0.34;
  leftPage.castShadow = true;
  group.add(leftPage);

  const rightPage = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.024, 0.33), parchmentMat);
  rightPage.position.set(0.115, 0.775, 0);
  rightPage.rotation.z = -0.34;
  rightPage.castShadow = true;
  group.add(rightPage);

  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 12), goldTrimMat);
  spine.rotation.x = Math.PI / 2;
  spine.position.set(0, 0.735, 0);
  group.add(spine);

  return group;
}

export function SacredSanctuary3DModal({
  isOpen,
  onClose,
  onApplyCaptureAsBackground,
}: SacredSanctuary3DModalProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const captureFnRef = useRef<(() => string | null) | null>(null);
  const applyLightingRef = useRef<((mode: SanctuaryLightingPreset) => void) | null>(null);
  const applyCameraRef = useRef<((preset: SanctuaryCameraPreset) => void) | null>(null);

  const [lightingMode, setLightingMode] = useState<SanctuaryLightingPreset>('night');
  const [cameraPreset, setCameraPreset] = useState<SanctuaryCameraPreset>('overview');
  const [isDockMinimized, setIsDockMinimized] = useState<boolean>(false);
  const [captureNotice, setCaptureNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Detect software GL before instantiating heavy shadow/DPR settings
    const probeCanvas = document.createElement('canvas');
    const probeGl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    const dbg = probeGl?.getExtension('WEBGL_debug_renderer_info');
    const rendererInfo = dbg ? String(probeGl?.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|Software|Microsoft Basic Render/i.test(
      rendererInfo
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070d17);
    scene.fog = new THREE.FogExp2(0x070d17, 0.042);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.55;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 80);
    camera.position.set(0, 2.55, 5.4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.1;
    controls.maxDistance = 11.5;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.target.set(0, 1.75, -1.9);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const floorTex = createTileCanvasTexture(maxAniso);
    const rugTex = createRugCanvasTexture(maxAniso);
    const softShadowTex = createSoftShadowTexture();

    // Courtyard Marble Floor
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.36,
      metalness: 0.14,
    });
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Composite Sanctuary Mihrab + Twin Lanterns + Rehal & Mushaf
    const mihrabGroup = buildMihrabSanctuaryGroup(rugTex);
    scene.add(mihrabGroup);

    const leftLantern = buildMoroccanLanternGroup();
    leftLantern.group.position.set(-1.35, 2.75, -1.55);
    scene.add(leftLantern.group);

    const rightLantern = buildMoroccanLanternGroup();
    rightLantern.group.position.set(1.35, 2.75, -1.55);
    scene.add(rightLantern.group);

    const rehalGroup = buildRehalAndMushafGroup();
    rehalGroup.position.set(0, 0, -1.15);
    scene.add(rehalGroup);

    // Grounding soft contact shadow under Rehal table
    const rehalShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.5),
      new THREE.MeshBasicMaterial({
        map: softShadowTex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      })
    );
    rehalShadow.rotation.x = -Math.PI / 2;
    rehalShadow.position.set(0, 0.306, -1.15);
    scene.add(rehalShadow);

    // Instanced Colonnade Pillars framing the courtyard
    const pillarCount = 10;
    const pillarGeom = new THREE.CylinderGeometry(0.18, 0.21, 4.2, 16);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0xbcb29f,
      roughness: 0.65,
      metalness: 0.08,
    });
    const instancedPillars = new THREE.InstancedMesh(pillarGeom, pillarMat, pillarCount);
    instancedPillars.castShadow = !isSoftwareGl;
    instancedPillars.receiveShadow = true;

    const tempMatrix = new THREE.Matrix4();
    for (let i = 0; i < pillarCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const row = Math.floor(i / 2);
      tempMatrix.makeTranslation(side * 4.3, 2.1, -3.4 + row * 2.2);
      instancedPillars.setMatrixAt(i, tempMatrix);
    }
    instancedPillars.instanceMatrix.needsUpdate = true;
    instancedPillars.computeBoundingSphere();
    scene.add(instancedPillars);

    // Celestial Starfield Points
    const starCount = isSoftwareGl ? 180 : 420;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(0.15 + Math.random() * 0.85);
      const radius = 18 + Math.random() * 14;
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = Math.abs(radius * Math.cos(phi)) + 3.5;
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta) - 4;
    }
    const starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xf8eed1,
      size: 0.085,
      transparent: true,
      opacity: 0.85,
    });
    const stars = new THREE.Points(starGeom, starMat);
    scene.add(stars);

    // Lighting Rig: Hemisphere sky/ground fill + Warm Directional Key Light with shadows
    const hemiLight = new THREE.HemisphereLight(0x6b93d6, 0x1c1712, 0.65);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffdfb0, 2.1);
    keyLight.position.set(4.8, 7.6, 4.2);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(isSoftwareGl ? 512 : 1024, isSoftwareGl ? 512 : 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 22;
    keyLight.shadow.camera.left = -6.5;
    keyLight.shadow.camera.right = 6.5;
    keyLight.shadow.camera.top = 6.5;
    keyLight.shadow.camera.bottom = -6.5;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Smooth camera transition targets (pre-allocated outside animation loop)
    const desiredCamPos = new THREE.Vector3(0, 2.55, 5.4);
    const desiredTarget = new THREE.Vector3(0, 1.75, -1.9);
    let cameraLerpFrames = 0;

    applyLightingRef.current = (mode: SanctuaryLightingPreset) => {
      if (mode === 'night') {
        scene.background = new THREE.Color(0x070d17);
        (scene.fog as THREE.FogExp2).color.setHex(0x070d17);
        hemiLight.color.setHex(0x5b82c9);
        hemiLight.intensity = 0.55;
        keyLight.color.setHex(0xffd699);
        keyLight.intensity = 1.65;
        leftLantern.light.intensity = 3.6;
        rightLantern.light.intensity = 3.6;
        starMat.opacity = 0.9;
      } else if (mode === 'fajr') {
        scene.background = new THREE.Color(0x132238);
        (scene.fog as THREE.FogExp2).color.setHex(0x132238);
        hemiLight.color.setHex(0x93b8eb);
        hemiLight.intensity = 0.95;
        keyLight.color.setHex(0xffcfa3);
        keyLight.intensity = 2.35;
        leftLantern.light.intensity = 2.4;
        rightLantern.light.intensity = 2.4;
        starMat.opacity = 0.42;
      } else {
        scene.background = new THREE.Color(0x1e3246);
        (scene.fog as THREE.FogExp2).color.setHex(0x1e3246);
        hemiLight.color.setHex(0xdcebfa);
        hemiLight.intensity = 1.25;
        keyLight.color.setHex(0xfff1d6);
        keyLight.intensity = 3.1;
        leftLantern.light.intensity = 1.2;
        rightLantern.light.intensity = 1.2;
        starMat.opacity = 0.08;
      }
    };

    applyCameraRef.current = (preset: SanctuaryCameraPreset) => {
      if (preset === 'overview') {
        desiredCamPos.set(0, 2.55, 5.4);
        desiredTarget.set(0, 1.75, -1.9);
      } else if (preset === 'mihrab') {
        desiredCamPos.set(0, 2.15, 2.15);
        desiredTarget.set(0, 2.15, -3.2);
      } else if (preset === 'lantern') {
        desiredCamPos.set(-0.35, 2.85, 0.65);
        desiredTarget.set(-1.32, 2.72, -1.55);
      } else {
        desiredCamPos.set(0.85, 1.55, 0.55);
        desiredTarget.set(0, 0.72, -1.15);
      }
      cameraLerpFrames = 45;
    };

    captureFnRef.current = () => {
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/png');
    };

    const gl = renderer.getContext() as WebGL2RenderingContext;
    const afterDraw = (cb: () => void) => {
      if (!isSoftwareGl || typeof gl.fenceSync !== 'function') {
        requestAnimationFrame(cb);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (!sync) {
          cb();
          return;
        }
        const status = gl.clientWaitSync(sync, 0, 0);
        if (status === gl.TIMEOUT_EXPIRED) {
          setTimeout(poll, 16);
        } else {
          gl.deleteSync(sync);
          cb();
        }
      };
      setTimeout(poll, 0);
    };

    let disposed = false;
    const clock = new THREE.Clock();

    const tick = () => {
      if (disposed) return;
      const elapsed = clock.getElapsedTime();

      // Gentle lantern sway & warm candle breathing
      const sway = Math.sin(elapsed * 0.85) * 0.028;
      leftLantern.group.rotation.z = sway;
      rightLantern.group.rotation.z = -sway * 0.9;
      stars.rotation.y = elapsed * 0.008;

      if (cameraLerpFrames > 0) {
        camera.position.lerp(desiredCamPos, 0.09);
        controls.target.lerp(desiredTarget, 0.09);
        cameraLerpFrames--;
      }

      controls.update();
      renderer.render(scene, camera);
      afterDraw(tick);
    };

    tick();

    const handleResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      window.removeEventListener('resize', handleResize);
      captureFnRef.current = null;
      applyLightingRef.current = null;
      applyCameraRef.current = null;
      controls.dispose();
      floorTex.dispose();
      rugTex.dispose();
      softShadowTex.dispose();
      envTarget.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectLighting = (mode: SanctuaryLightingPreset) => {
    setLightingMode(mode);
    applyLightingRef.current?.(mode);
  };

  const handleSelectCamera = (preset: SanctuaryCameraPreset) => {
    setCameraPreset(preset);
    applyCameraRef.current?.(preset);
  };

  const handleCaptureBackground = () => {
    const dataUrl = captureFnRef.current?.();
    if (!dataUrl) return;
    onApplyCaptureAsBackground(dataUrl);
    setCaptureNotice('تم اعتماد لقطة المحراب ثلاثي الأبعاد كخلفية للمقطع في الاستوديو');
    setTimeout(() => {
      setCaptureNotice(null);
      onClose();
    }, 900);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="فضاء المحراب ثلاثي الأبعاد"
      className="fixed inset-0 z-50 w-screen h-screen bg-[#070D17] overflow-hidden select-none"
    >
      {/* Full-bleed WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top-Right Minimal Title & Close Action (no backdrop-filter over WebGL) */}
      <div className="fixed top-4 right-4 left-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto rounded-xl border border-slate-700/80 bg-[#0B1018]/95 px-4 py-2.5 shadow-lg">
          <div className="text-sm font-bold text-slate-100">
            فضاء المحراب والفوانيس ثلاثي الأبعاد (3D)
          </div>
          <div className="text-[11px] text-slate-400">
            اسحب للتدوير بزاوية ٣٦٠° · عجلة الفأرة للتقريب · التقط أي زاوية كخلفية لمقطعك
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-[#0B1018]/95 px-3.5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer shadow-lg"
        >
          <X className="w-4 h-4 text-slate-400" />
          <span>إغلاق الفضاء</span>
        </button>
      </div>

      {captureNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-20 rounded-xl border border-emerald-500/60 bg-[#0B1412] px-4 py-2.5 text-xs sm:text-sm font-semibold text-emerald-200 shadow-xl">
          {captureNotice}
        </div>
      )}

      {/* Collapsible Bottom Control Dock (<= 15% viewport, solid rgba surface without backdrop-blur) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10 w-[calc(100vw-2rem)] max-w-3xl rounded-2xl border border-slate-700/85 bg-[#0B1018]/95 px-4 py-3 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-200">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span>أدوات الكاميرا والإضاءة والتقاط خلفية الريلز</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCaptureBackground}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-300 transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>اعتماد الزاوية كخلفية للمقطع</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDockMinimized((v) => !v)}
              aria-label={isDockMinimized ? 'إظهار الأدوات' : 'تصغير الأدوات'}
              className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800/90 p-1.5 text-slate-300 hover:text-white cursor-pointer"
            >
              {isDockMinimized ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {!isDockMinimized && (
          <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>زوايا الكاميرا المعمارية:</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(
                  [
                    { id: 'overview', label: 'بانوراما' },
                    { id: 'mihrab', label: 'المحراب' },
                    { id: 'lantern', label: 'الفانوس' },
                    { id: 'rehal', label: 'المصحف' },
                  ] as const
                ).map((cam) => (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => handleSelectCamera(cam.id)}
                    className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                      cameraPreset === cam.id
                        ? 'border-emerald-500/70 bg-emerald-500/15 text-emerald-200'
                        : 'border-slate-800 bg-[#111824] text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-300" />
                <span>أجواء الإضاءة والوقت:</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'night', label: 'قيام الليل' },
                    { id: 'fajr', label: 'سكون الفجر' },
                    { id: 'duha', label: 'نور الضحى' },
                  ] as const
                ).map((lt) => (
                  <button
                    key={lt.id}
                    type="button"
                    onClick={() => handleSelectLighting(lt.id)}
                    className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                      lightingMode === lt.id
                        ? 'border-amber-400/70 bg-amber-400/15 text-amber-200'
                        : 'border-slate-800 bg-[#111824] text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {lt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

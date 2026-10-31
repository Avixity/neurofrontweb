import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface DeviceModel {
  group: THREE.Group;
  controller: THREE.Group;
  headband: THREE.Group;
  lid: THREE.Group;
  parts: Record<string, THREE.Group>;
  logo: THREE.Mesh;
  animate: (open: number, explode: number, highlight: string) => void;
  dispose: () => void;
}

type Point = [number, number, number];
type Standard = THREE.MeshStandardMaterial;

function surfaceTexture(kind: 'fabric' | 'plastic'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const pixels = ctx.createImageData(128, 128);
  let seed = 71;
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const noise = (seed >>> 24) / 255;
      const weave = Math.sin(x * Math.PI / 2) * Math.cos(y * Math.PI / 3);
      const value = kind === 'fabric' ? 110 + weave * 45 + noise * 48 : 140 + noise * 35;
      const i = (y * 128 + x) * 4;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
      pixels.data[i + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(kind === 'fabric' ? 14 : 3, kind === 'fabric' ? 2 : 3);
  map.anisotropy = 4;
  return map;
}

function printedTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function bandGeometry(rx: number, rz: number, height: number, thickness: number, start = 0, arc = Math.PI * 2) {
  const steps = Math.ceil(96 * arc / (Math.PI * 2));
  const bevel = Math.min(thickness * 0.32, 0.022);
  const section = [
    [-thickness / 2, -height / 2 + bevel], [-thickness / 2 + bevel, -height / 2],
    [thickness / 2 - bevel, -height / 2], [thickness / 2, -height / 2 + bevel],
    [thickness / 2, height / 2 - bevel], [thickness / 2 - bevel, height / 2],
    [-thickness / 2 + bevel, height / 2], [-thickness / 2, height / 2 - bevel],
  ];
  const positions: number[] = [], uv: number[] = [], indices: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = start + i / steps * arc;
    for (let j = 0; j <= section.length; j++) {
      const [r, y] = section[j % section.length];
      positions.push((rx + r) * Math.cos(a), y, (rz + r) * Math.sin(a));
      uv.push(i / steps, j / section.length);
      if (i < steps && j < section.length) {
        const p = i * (section.length + 1) + j;
        indices.push(p, p + 1, p + section.length + 1, p + 1, p + section.length + 2, p + section.length + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function buildDevice(): DeviceModel {
  const group = new THREE.Group();
  group.name = 'NeuroFront — current wired prototype';
  const controller = new THREE.Group();
  controller.name = 'Controller enclosure';
  controller.position.set(1.28, 0, 0);
  group.add(controller);
  const headband = new THREE.Group();
  headband.name = 'Fabric headband';
  headband.position.set(-1.72, 0.30, -0.14);
  headband.rotation.y = -0.12;
  group.add(headband);

  const weave = surfaceTexture('fabric');
  const grain = surfaceTexture('plastic');
  const textures: THREE.Texture[] = [weave, grain];
  const materials = new Set<THREE.Material>();
  let disposed = false;
  const standard = (color: THREE.ColorRepresentation, roughness = 0.5, metalness = 0): Standard => {
    const material = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    materials.add(material);
    return material;
  };
  const shell = standard('#20262a', 0.36, 0.17);
  shell.bumpMap = grain;
  shell.bumpScale = 0.007;
  const edge = standard('#414a4e', 0.31, 0.35);
  const recess = standard('#0b1013', 0.69);
  const rubber = standard('#161a1b', 0.83);
  const silver = standard('#bbc5c8', 0.3, 0.88);
  const solder = standard('#9ea8a7', 0.28, 0.9);
  const gold = standard('#b89a58', 0.36, 0.72);
  const whiteWire = standard('#cfcec5', 0.49);
  const blackWire = standard('#24272a', 0.51);
  const fabric = standard('#252a2a', 0.98);
  fabric.bumpMap = weave;
  fabric.bumpScale = 0.038;
  fabric.roughnessMap = weave;
  const tape = standard('#24292c', 0.31);
  const ceramic = standard('#b49a6a', 0.68);
  const chip = standard('#11171a', 0.53);

  function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, position: Point = [0, 0, 0]) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(parent: THREE.Object3D, size: Point, position: Point, material: THREE.Material, radius = 0.015) {
    return mesh(parent, new RoundedBoxGeometry(...size, 2, Math.min(radius, ...size.map(n => n / 3))), material, position);
  }
  function cylinder(parent: THREE.Object3D, radius: number, length: number, position: Point, material: THREE.Material, segments = 16) {
    return mesh(parent, new THREE.CylinderGeometry(radius, radius, length, segments), material, position);
  }
  function line(parent: THREE.Object3D, points: Point[], material: THREE.Material, radius = 0.013, segments = 28) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return mesh(parent, new THREE.TubeGeometry(curve, segments, radius, 6, false), material);
  }
  function plane(parent: THREE.Object3D, width: number, height: number, position: Point, texture: THREE.Texture, opacity = 1) {
    const material = new THREE.MeshStandardMaterial({ map: texture, transparent: true, opacity, roughness: 0.65, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
    materials.add(material);
    const decal = mesh(parent, new THREE.PlaneGeometry(width, height), material, position);
    decal.rotation.x = -Math.PI / 2;
    decal.castShadow = false;
    return decal;
  }
  function pins(parent: THREE.Object3D, positions: Point[], size: Point, material: THREE.Material) {
    const instances = new THREE.InstancedMesh(new THREE.BoxGeometry(...size), material, positions.length);
    const matrix = new THREE.Matrix4();
    positions.forEach((p, i) => instances.setMatrixAt(i, matrix.makeTranslation(...p)));
    instances.castShadow = instances.receiveShadow = true;
    parent.add(instances);
  }
  function screw(parent: THREE.Object3D, x: number, y: number, z: number, radius = 0.035) {
    cylinder(parent, radius, 0.015, [x, y, z], solder, 12);
    box(parent, [radius * 1.2, 0.004, 0.008], [x, y + 0.009, z], recess, 0.001);
  }

  // An open shell, rather than a solid box, keeps the actual component layout visible.
  box(controller, [2.6, 0.12, 1.9], [0, 0.09, 0], shell, 0.065);
  box(controller, [2.43, 0.035, 1.72], [0, 0.158, 0], recess, 0.03);
  box(controller, [2.6, 0.47, 0.075], [0, 0.35, 0.912], shell, 0.035);
  box(controller, [2.6, 0.47, 0.075], [0, 0.35, -0.912], shell, 0.035);
  box(controller, [0.075, 0.47, 1.82], [-1.262, 0.35, 0], shell, 0.035);
  box(controller, [0.075, 0.47, 1.82], [1.262, 0.35, 0], shell, 0.035);
  for (const z of [-0.912, 0.912]) box(controller, [2.52, 0.025, 0.028], [0, 0.593, z], edge, 0.008);
  for (const x of [-1.262, 1.262]) box(controller, [0.028, 0.025, 1.8], [x, 0.593, 0], edge, 0.008);
  for (const x of [-1.1, 1.1]) {
    for (const z of [-0.72, 0.72]) {
      cylinder(controller, 0.068, 0.16, [x, 0.2, z], shell);
      screw(controller, x, 0.285, z);
      cylinder(controller, 0.09, 0.04, [x, 0.019, z], rubber);
    }
  }
  const port = box(controller, [0.018, 0.19, 0.36], [1.304, 0.32, -0.40], recess, 0.025);
  box(port, [0.018, 0.108, 0.245], [0.012, 0, 0], silver, 0.018);
  box(port, [0.02, 0.067, 0.19], [0.025, 0, 0], recess, 0.012);
  const powerBase = cylinder(controller, 0.115, 0.045, [1.307, 0.33, 0.37], edge);
  powerBase.rotation.z = Math.PI / 2;
  const power = cylinder(controller, 0.083, 0.085, [1.355, 0.33, 0.37], rubber);
  power.rotation.z = Math.PI / 2;
  const jack = cylinder(controller, 0.095, 0.10, [-1.31, 0.33, 0.44], rubber);
  jack.rotation.z = Math.PI / 2;
  const jackRim = cylinder(controller, 0.067, 0.013, [-1.365, 0.33, 0.44], silver);
  jackRim.rotation.z = Math.PI / 2;
  box(controller, [0.28, 0.12, 0.045], [0, 0.56, 0.965], shell, 0.015);
  box(controller, [0.18, 0.028, 0.015], [0, 0.54, 0.994], edge, 0.006);

  const lid = new THREE.Group();
  lid.name = 'Hinged controller lid';
  lid.position.set(0, 0.64, -0.95);
  controller.add(lid);
  box(lid, [2.62, 0.10, 1.91], [0, 0, 0.95], shell, 0.06);
  box(lid, [2.38, 0.018, 1.65], [0, 0.058, 0.95], standard('#484d4e', 0.63, 0.15), 0.022);
  const coverMaterial = new THREE.MeshPhysicalMaterial({ color: '#c5d1d1', roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0.09, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.12 });
  materials.add(coverMaterial);
  box(lid, [2.42, 0.008, 1.69], [0, 0.078, 0.95], coverMaterial, 0.025).castShadow = false;
  for (const x of [-0.91, 0.91]) {
    const barrel = cylinder(controller, 0.068, 0.32, [x, 0.63, -0.96], shell);
    barrel.rotation.z = Math.PI / 2;
    const center = cylinder(lid, 0.062, 0.18, [x, 0, -0.01], edge);
    center.rotation.z = Math.PI / 2;
  }
  const logoMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  materials.add(logoMaterial);
  const logo = mesh(lid, new THREE.PlaneGeometry(1.91, 1), logoMaterial, [0, 0.072, 0.95]);
  logo.name = 'Original NeuroFront printed logo';
  logo.rotation.x = -Math.PI / 2;
  logo.scale.y = 0.42;
  logo.castShadow = false;
  const logoTexture = new THREE.TextureLoader().load('/assets/logo-white.png', texture => {
    if (disposed) { texture.dispose(); return; }
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const source = texture.image as HTMLImageElement;
    logo.scale.y = 1.91 * source.height / source.width;
  });
  textures.push(logoTexture);
  logoMaterial.map = logoTexture;

  const parts: Record<string, THREE.Group> = {};
  const homes: Record<string, THREE.Vector3> = {};
  const highlightMaterials: Record<string, Standard[]> = {};
  function part(name: string, position: Point, parent: THREE.Group = controller) {
    const value = new THREE.Group();
    value.name = name;
    value.position.set(...position);
    parent.add(value);
    parts[name] = value;
    homes[name] = value.position.clone();
    highlightMaterials[name] = [];
    return value;
  }
  function pcb(parent: THREE.Group, width: number, depth: number, color: string, name: string) {
    const boardMaterial = standard(color, 0.56, 0.12);
    highlightMaterials[name].push(boardMaterial);
    box(parent, [width, 0.035, depth], [0, 0, 0], boardMaterial, 0.027);
    for (const x of [-width / 2 + 0.065, width / 2 - 0.065]) {
      for (const z of [-depth / 2 + 0.065, depth / 2 - 0.065]) {
        const ring = mesh(parent, new THREE.TorusGeometry(0.025, 0.006, 5, 10), gold, [x, 0.02, z]);
        ring.rotation.x = Math.PI / 2;
      }
    }
  }
  function passives(parent: THREE.Group, count: number, xStart: number, zStart: number, step: number) {
    const bodies: Point[] = [], contacts: Point[] = [];
    for (let i = 0; i < count; i++) {
      const x = xStart + i % 4 * step;
      const z = zStart + Math.floor(i / 4) * step;
      bodies.push([x, 0.045, z]);
      contacts.push([x - 0.028, 0.045, z], [x + 0.028, 0.045, z]);
    }
    pins(parent, bodies, [0.045, 0.027, 0.026], ceramic);
    pins(parent, contacts, [0.018, 0.029, 0.029], solder);
  }
  function boardPrint(parent: THREE.Group, width: number, depth: number, title: string, color = '#e3e4d6') {
    const map = printedTexture(512, 512, ctx => {
      ctx.clearRect(0, 0, 512, 512);
      ctx.strokeStyle = 'rgba(190,202,174,.24)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(28 + i * 43, 70);
        ctx.lineTo(28 + i * 43, 125 + i % 3 * 30);
        ctx.lineTo(58 + i * 39, 162 + i % 3 * 30);
        ctx.lineTo(58 + i * 39, 430);
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.font = 'bold 27px monospace';
      ctx.fillText(title, 28, 44);
      ctx.font = '16px monospace';
      ctx.fillText('GND   VCC   OUT', 40, 478);
      ctx.strokeStyle = color;
      ctx.strokeRect(13, 14, 486, 484);
    });
    textures.push(map);
    plane(parent, width * 0.92, depth * 0.94, [0, 0.02, 0], map);
  }

  const esp = part('esp32', [0.55, 0.255, 0.36]);
  pcb(esp, 0.89, 0.98, '#171d20', 'esp32');
  boardPrint(esp, 0.89, 0.98, 'ESP32 DEVKIT');
  box(esp, [0.48, 0.11, 0.49], [0, 0.078, -0.09], silver, 0.018);
  box(esp, [0.43, 0.012, 0.43], [0, 0.14, -0.09], standard('#9ba7aa', 0.6, 0.8), 0.009);
  const espText = printedTexture(256, 256, ctx => {
    ctx.fillStyle = '#4c5a5d'; ctx.font = 'bold 28px monospace'; ctx.fillText('ESP32', 45, 95);
    ctx.font = '16px monospace'; ctx.fillText('WROOM-32', 39, 127); ctx.fillText('Wi-Fi + BT', 39, 158);
  });
  textures.push(espText);
  plane(esp, 0.41, 0.41, [0, 0.148, -0.09], espText);
  const headers: Point[] = [], terminals: Point[] = [];
  for (const x of [-0.375, 0.375]) {
    box(esp, [0.078, 0.08, 0.80], [x, 0.064, 0], rubber, 0.008);
    for (let i = 0; i < 15; i++) {
      headers.push([x, -0.045, -0.36 + i * 0.051]);
      terminals.push([x, 0.107, -0.36 + i * 0.051]);
    }
  }
  pins(esp, headers, [0.021, 0.10, 0.021], gold);
  pins(esp, terminals, [0.026, 0.012, 0.026], solder);
  box(esp, [0.27, 0.115, 0.16], [0, 0.076, 0.47], silver, 0.022);
  box(esp, [0.205, 0.061, 0.014], [0, 0.079, 0.559], recess, 0.012);
  for (const x of [-0.26, 0.26]) {
    box(esp, [0.09, 0.05, 0.09], [x, 0.05, 0.37], silver, 0.01);
    cylinder(esp, 0.024, 0.025, [x, 0.085, 0.37], recess, 10);
  }
  for (let i = 0; i < 5; i++) box(esp, [0.055, 0.006, 0.11], [-0.16 + i * 0.08, 0.024, -0.40], gold, 0.001);
  box(esp, [0.37, 0.006, 0.016], [0, 0.025, -0.45], gold, 0.002);
  passives(esp, 8, -0.15, 0.22, 0.10);

  const ad = part('ad8232', [-0.64, 0.25, 0.38]);
  pcb(ad, 0.82, 0.80, '#a53535', 'ad8232');
  boardPrint(ad, 0.82, 0.80, 'AD8232');
  box(ad, [0.25, 0.055, 0.24], [0.03, 0.055, -0.01], chip, 0.012);
  const chipPins: Point[] = [];
  for (let i = 0; i < 6; i++) {
    chipPins.push([-0.12, 0.045, -0.10 + i * 0.039], [0.18, 0.045, -0.10 + i * 0.039]);
  }
  pins(ad, chipPins, [0.05, 0.014, 0.014], solder);
  box(ad, [0.26, 0.20, 0.23], [-0.18, 0.12, 0.30], recess, 0.026);
  const inputJack = cylinder(ad, 0.079, 0.024, [-0.18, 0.12, 0.43], silver);
  inputJack.rotation.x = Math.PI / 2;
  const inputHole = cylinder(ad, 0.053, 0.027, [-0.18, 0.12, 0.447], recess);
  inputHole.rotation.x = Math.PI / 2;
  passives(ad, 12, -0.25, -0.27, 0.13);
  box(ad, [0.074, 0.10, 0.61], [0.33, 0.075, 0], rubber, 0.01);
  pins(ad, Array.from({ length: 6 }, (_, i) => [0.33, 0.145, -0.25 + i * 0.10] as Point), [0.028, 0.07, 0.028], gold);

  const battery = part('battery', [-0.66, 0.25, -0.43]);
  const foil = standard('#b7b9b4', 0.43, 0.73);
  foil.bumpMap = grain; foil.bumpScale = 0.012;
  highlightMaterials.battery.push(foil);
  box(battery, [0.89, 0.16, 0.70], [0, 0, 0], foil, 0.055);
  const amber = standard('#b98c22', 0.37, 0.28);
  box(battery, [0.09, 0.175, 0.69], [0.42, 0, 0], amber, 0.015);
  box(battery, [0.89, 0.014, 0.03], [0, 0.075, -0.345], silver, 0.007);
  const batteryPrint = printedTexture(512, 320, ctx => {
    ctx.fillStyle = '#d8d9d2'; ctx.fillRect(0, 0, 512, 320);
    ctx.fillStyle = '#555e5d'; ctx.font = 'bold 25px monospace'; ctx.fillText('RECHARGEABLE', 28, 52);
    ctx.font = '22px monospace'; ctx.fillText('Li-ion polymer', 28, 89);
    ctx.font = '17px monospace'; ctx.fillText('3.7 V  /  PROTOTYPE', 28, 126);
    ctx.font = '15px monospace'; ctx.fillText('Handle with care', 28, 281);
    for (let i = 0; i < 70; i++) if (i % 4 !== 0) ctx.fillRect(30 + i * 6, 168, i % 3 === 0 ? 3 : 1, 65);
  });
  textures.push(batteryPrint);
  plane(battery, 0.73, 0.56, [-0.035, 0.085, 0], batteryPrint);

  const charger = part('charger', [0.66, 0.24, -0.48]);
  pcb(charger, 0.61, 0.53, '#185d7b', 'charger');
  boardPrint(charger, 0.61, 0.53, 'TP4056');
  box(charger, [0.19, 0.055, 0.20], [-0.05, 0.05, 0], chip, 0.008);
  box(charger, [0.16, 0.12, 0.25], [0.30, 0.075, 0], silver, 0.016);
  box(charger, [0.016, 0.067, 0.18], [0.39, 0.075, 0], recess, 0.01);
  passives(charger, 8, -0.22, -0.16, 0.10);
  for (const z of [-0.17, 0.17]) cylinder(charger, 0.037, 0.015, [-0.27, 0.027, z], solder);

  const gsr = part('gsr', [0.0, 0.36, -0.23]);
  pcb(gsr, 0.40, 0.54, '#275d44', 'gsr');
  boardPrint(gsr, 0.40, 0.54, 'GSR');
  box(gsr, [0.13, 0.06, 0.21], [0, 0.06, 0], chip, 0.01);
  box(gsr, [0.19, 0.10, 0.12], [0, 0.08, -0.18], standard('#315f85', 0.57), 0.01);
  screw(gsr, 0, 0.14, -0.18, 0.026);
  pins(gsr, [[-0.10, 0.08, 0.22], [0, 0.08, 0.22], [0.10, 0.08, 0.22]], [0.022, 0.11, 0.022], gold);

  const wireHarness = new THREE.Group();
  wireHarness.name = 'Simplified internal jumper wiring';
  controller.add(wireHarness);
  const flexibleWires: Array<{
    object: THREE.Mesh<THREE.TubeGeometry>;
    curve: THREE.CatmullRomCurve3;
    points: THREE.Vector3[];
    startPart: string;
    endPart: string | null;
    startAnchor: THREE.Vector3;
    endAnchor: THREE.Vector3;
    radius: number;
    segments: number;
  }> = [];
  function flexibleWire(parent: THREE.Object3D, points: Point[], material: THREE.Material, startPart: string, endPart: string | null, radius = 0.018, segments = 24) {
    const vectors = points.map(p => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(vectors.map(p => p.clone()));
    curve.arcLengthDivisions = 48;
    const geometry = new THREE.TubeGeometry(curve, segments, radius, 6, false);
    (geometry.attributes.position as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
    (geometry.attributes.normal as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
    const object = new THREE.Mesh(geometry, material);
    object.castShadow = true;
    object.frustumCulled = false;
    object.userData.flexible = true;
    parent.add(object);
    flexibleWires.push({
      object, curve, points: vectors, startPart, endPart, radius, segments,
      startAnchor: vectors[0].clone().sub(homes[startPart]),
      endAnchor: endPart ? vectors.at(-1)!.clone().sub(homes[endPart]) : vectors.at(-1)!.clone(),
    });
  }
  const wireColors = ['#d0b346', '#8a6fac', '#6e9b86', '#d1d0bd', '#282e32', '#ab4f48'];
  const harnessPaths: Point[][] = [
    [[-0.31, 0.37, 0.58], [-0.90, 0.46, 0.69], [-0.98, 0.46, -0.62], [0.43, 0.38, -0.63]],
    [[-0.31, 0.37, 0.34], [-0.75, 0.53, 0.45], [-0.13, 0.53, 0.58], [0.92, 0.39, 0.10]],
    [[-0.30, 0.37, 0.14], [-0.51, 0.50, -0.51], [0.03, 0.51, -0.66], [0.91, 0.39, 0.36]],
    [[0.19, 0.38, 0.48], [0.40, 0.51, -0.03], [0.92, 0.49, -0.55], [1.07, 0.35, -0.48]],
    [[-0.21, 0.29, -0.43], [0.14, 0.45, -0.63], [0.45, 0.45, -0.68], [0.39, 0.30, -0.62]],
    [[-0.21, 0.29, -0.36], [0.17, 0.45, -0.36], [0.51, 0.41, -0.23], [0.40, 0.30, -0.31]],
    [[0.0, 0.42, -0.02], [0.11, 0.51, 0.14], [0.34, 0.48, 0.38], [0.92, 0.39, 0.51]],
  ];
  const wireConnections = [['ad8232', 'charger'], ['ad8232', 'esp32'], ['ad8232', 'esp32'], ['esp32', 'charger'], ['battery', 'charger'], ['battery', 'charger'], ['gsr', 'esp32']];
  harnessPaths.forEach((points, i) => flexibleWire(wireHarness, points, standard(wireColors[i % wireColors.length], 0.48), ...wireConnections[i] as [string, string]));

  mesh(headband, bandGeometry(1.14, 0.87, 0.42, 0.105), fabric);
  for (const y of [-0.19, 0.19]) {
    const points: Point[] = Array.from({ length: 81 }, (_, i) => {
      const a = i / 80 * Math.PI * 2;
      return [1.15 * Math.cos(a), y, 0.88 * Math.sin(a)];
    });
    line(headband, points, fabric, 0.018, 80);
  }
  mesh(headband, bandGeometry(1.143, 0.872, 0.40, 0.118, Math.PI * 1.24, Math.PI * 0.54), tape);
  for (const a of [0.14, Math.PI - 0.14]) {
    const tie = mesh(headband, bandGeometry(1.156, 0.886, 0.45, 0.13, a - 0.026, 0.052), rubber);
    tie.name = 'Cable tie securing the fabric';
    box(headband, [0.07, 0.13, 0.12], [1.17 * Math.cos(a), -0.14, 0.89 * Math.sin(a)], rubber, 0.018);
  }
  const stitchMat = standard('#515957', 0.99);
  const stitches: Point[] = [];
  for (let i = 0; i < 96; i++) {
    const a = i / 96 * Math.PI * 2;
    stitches.push([1.2 * Math.cos(a), 0.14, 0.93 * Math.sin(a)]);
  }
  pins(headband, stitches, [0.013, 0.018, 0.013], stitchMat);
  const electrode = part('electrode', [0, 0.01, 0], headband);
  const snapColors = ['#bb4235', '#cbb444'];
  [-0.33, 0.33].forEach((x, i) => {
    const snap = new THREE.Group();
    snap.position.set(x, 0, -0.71);
    snap.rotation.x = Math.PI / 2;
    electrode.add(snap);
    const material = standard(snapColors[i], 0.4);
    highlightMaterials.electrode.push(material);
    cylinder(snap, 0.12, 0.10, [0, 0, 0], material, 24);
    cylinder(snap, 0.083, 0.025, [0, -0.062, 0], silver, 24);
    cylinder(snap, 0.035, 0.031, [0, -0.078, 0], standard('#767a73', 0.25, 0.8), 16);
    box(snap, [0.20, 0.10, 0.12], [0, 0.04, -0.07], material, 0.03);
  });
  const temperature = part('temperature', [0.04, -0.055, -0.735], headband);
  const thermoMaterial = standard('#464139', 0.37);
  highlightMaterials.temperature.push(thermoMaterial);
  const bead = mesh(temperature, new THREE.SphereGeometry(0.063, 16, 10), thermoMaterial);
  bead.scale.set(0.8, 1, 0.65);
  line(temperature, [[-0.022, 0, 0], [-0.022, -0.10, -0.02], [-0.09, -0.15, -0.03]], silver, 0.007, 12);
  line(temperature, [[0.022, 0, 0], [0.022, -0.10, -0.02], [0.08, -0.15, -0.03]], silver, 0.007, 12);
  for (let i = 0; i < 3; i++) {
    flexibleWire(headband, [[-0.34 + i * 0.32, -0.08, -0.80], [0.40, -0.14 + i * 0.026, -0.79], [1.09, -0.14 + i * 0.026, -0.24], [0.94, -0.10 + i * 0.026, 0.53]], whiteWire, i === 1 ? 'temperature' : 'electrode', null, 0.014, 40);
  }

  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.63, 0.19, 0.40), new THREE.Vector3(-0.79, 0.12, 0.94),
    new THREE.Vector3(-0.25, 0.09, 1.39), new THREE.Vector3(0.38, 0.10, 1.33),
    new THREE.Vector3(0.40, 0.21, 0.81), new THREE.Vector3(-0.10, 0.33, 0.44),
  ]);
  mesh(group, new THREE.TubeGeometry(cableCurve, 90, 0.038, 8, false), whiteWire).name = 'Wired connection to controller';
  const frames = cableCurve.computeFrenetFrames(480, false);
  const spiralPoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 480; i++) {
    const t = i / 480;
    const angle = t * Math.PI * 2 * 49;
    const point = cableCurve.getPointAt(t);
    point.addScaledVector(frames.normals[i], Math.cos(angle) * 0.045);
    point.addScaledVector(frames.binormals[i], Math.sin(angle) * 0.045);
    spiralPoints.push(point);
  }
  const spiralCurve = new THREE.CatmullRomCurve3(spiralPoints);
  mesh(group, new THREE.TubeGeometry(spiralCurve, 650, 0.012, 4, false), standard('#bdc2bf', 0.56)).name = 'Spiral cable wrap';
  line(group, [[-0.10, 0.33, 0.44], [-0.03, 0.33, 0.44]], blackWire, 0.055, 4);

  // Merge static detail meshes per material within each independently animated part.
  function batchStatic(parent: THREE.Group) {
    const batches = new Map<THREE.Material, THREE.Mesh[]>();
    parent.children.forEach(child => {
      if (!(child instanceof THREE.Mesh) || child instanceof THREE.InstancedMesh || child === logo || Array.isArray(child.material) || child.children.length || child.material.transparent || child.userData.flexible) return;
      const collection = batches.get(child.material) ?? [];
      collection.push(child); batches.set(child.material, collection);
    });
    for (const [material, objects] of batches) {
      if (objects.length < 2) continue;
      const geometries = objects.map(object => {
        object.updateMatrix();
        const geometry = object.geometry.clone().applyMatrix4(object.matrix);
        if (!geometry.index) return geometry;
        const expanded = geometry.toNonIndexed();
        geometry.dispose();
        return expanded;
      });
      const merged = mergeGeometries(geometries, false);
      geometries.forEach(geometry => geometry.dispose());
      if (!merged) continue;
      const combined = mesh(parent, merged, material);
      combined.name = 'Batched mechanical detail';
      objects.forEach(object => { parent.remove(object); object.geometry.dispose(); });
    }
  }
  [controller, lid, headband, esp, ad, battery, charger, gsr, temperature, wireHarness].forEach(batchStatic);

  const explodeOffsets: Record<string, Point> = {
    esp32: [0.38, 1.02, 0.31], ad8232: [-0.33, 0.73, 0.38],
    battery: [-0.36, 0.98, -0.14], charger: [0.37, 0.68, -0.26],
    gsr: [0.02, 1.45, -0.03], electrode: [0, 0.32, 0.19], temperature: [0, 0.48, 0.13],
  };
  let lastExploded = -1;
  const startDelta = new THREE.Vector3(), endDelta = new THREE.Vector3();
  const wirePoint = new THREE.Vector3(), wireNormal = new THREE.Vector3();
  function deformWires(exploded: number) {
    if (Math.abs(lastExploded - exploded) < 0.00001) return;
    lastExploded = exploded;
    Object.values(parts).forEach(item => item.updateMatrix());
    for (const wire of flexibleWires) {
      startDelta.copy(wire.startAnchor).applyMatrix4(parts[wire.startPart].matrix).sub(wire.points[0]);
      endDelta.copy(wire.endAnchor);
      if (wire.endPart) endDelta.applyMatrix4(parts[wire.endPart].matrix);
      endDelta.sub(wire.points.at(-1)!);
      wire.curve.points.forEach((point, i) => {
        const t = i / (wire.points.length - 1);
        point.copy(wire.points[i]).addScaledVector(startDelta, 1 - t).addScaledVector(endDelta, t);
        point.y += Math.sin(t * Math.PI) * exploded * 0.11;
      });
      wire.curve.updateArcLengths();
      const wireFrames = wire.curve.computeFrenetFrames(wire.segments, false);
      const positions = wire.object.geometry.attributes.position;
      const normals = wire.object.geometry.attributes.normal;
      for (let i = 0; i <= wire.segments; i++) {
        wire.curve.getPointAt(i / wire.segments, wirePoint);
        for (let j = 0; j <= 6; j++) {
          const angle = j / 6 * Math.PI * 2;
          wireNormal.copy(wireFrames.normals[i]).multiplyScalar(-Math.cos(angle)).addScaledVector(wireFrames.binormals[i], Math.sin(angle));
          const index = i * 7 + j;
          positions.setXYZ(index, wirePoint.x + wireNormal.x * wire.radius, wirePoint.y + wireNormal.y * wire.radius, wirePoint.z + wireNormal.z * wire.radius);
          normals.setXYZ(index, wireNormal.x, wireNormal.y, wireNormal.z);
        }
      }
      positions.needsUpdate = normals.needsUpdate = true;
      wire.object.geometry.computeBoundingSphere();
      wire.object.geometry.computeBoundingBox();
    }
  }
  function animate(open: number, explode: number, highlight: string) {
    const opened = THREE.MathUtils.clamp(open, 0, 1);
    const exploded = THREE.MathUtils.clamp(explode, 0, 1);
    lid.rotation.x = -opened * 1.98;
    for (const [key, item] of Object.entries(parts)) {
      const offset = explodeOffsets[key];
      item.position.copy(homes[key]);
      item.position.x += offset[0] * exploded;
      item.position.y += offset[1] * exploded;
      item.position.z += offset[2] * exploded;
      item.rotation.y = (key === 'ad8232' ? -0.12 : key === 'esp32' ? 0.10 : 0) * exploded;
      const active = key === highlight || highlight === 'electrical' && (key === 'ad8232' || key === 'electrode') || highlight === 'eda' && key === 'gsr';
      for (const material of highlightMaterials[key]) {
        material.emissive.set(active ? '#4da99b' : '#000000');
        material.emissiveIntensity = active ? 0.35 : 0;
      }
    }
    deformWires(exploded);
  }
  animate(0, 0, '');

  function dispose() {
    if (disposed) return;
    disposed = true;
    const geometries = new Set<THREE.BufferGeometry>();
    group.traverse(object => {
      if (object instanceof THREE.Mesh) geometries.add(object.geometry);
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    textures.forEach(texture => texture.dispose());
  }
  return { group, controller, headband, lid, parts, logo, animate, dispose };
}

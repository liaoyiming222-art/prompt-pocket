import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.querySelector('#hero-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(1920, 1080, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(31, 16 / 9, .05, 100);
const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
scene.environment = pmrem.fromScene(room, .045).texture;
room.dispose();
pmrem.dispose();
scene.add(new THREE.HemisphereLight('#fff5ef', '#73519b', 1.1));
const key = new THREE.DirectionalLight('#fff0dc', 2.3);
key.position.set(-4, 5, 6);
const rim = new THREE.DirectionalLight('#ddc5ff', 2.5);
rim.position.set(5, 2, -3);
scene.add(key, rim);
const hero = new THREE.Group();
scene.add(hero);
const paper = [];
window.heroReady = new GLTFLoader().loadAsync('../prompt-pocket-film-v1/assets/pocket.glb').then(({ scene: model }) => {
  model.rotation.x = Math.PI / 2;
  hero.add(model);
  model.traverse(node => {
    if (!node.isMesh) return;
    if (node.material.name.includes('Brand')) {
      node.material.color.set('#8662b4');
      node.material.roughness = .32;
    }
    if (/^(Prompt_Card|Quote_)/.test(node.name)) paper.push([node, node.position.z]);
  });
});
window.heroFrame = ({ orbit, lift, closing, distance }) => {
  hero.rotation.set(.07 + .13 * orbit, -.19 - .65 * orbit, .025 + .12 * orbit);
  hero.position.set(0, -.22 + closing * .04, 0);
  for (const [node, rest] of paper) node.position.z = rest - lift;
  key.position.x = -4 + 4 * orbit;
  camera.position.set(.35 + orbit * .25, .8 + orbit * .4, distance);
  camera.lookAt(-1.60, .13 + lift * .16, 0);
  renderer.render(scene, camera);
};

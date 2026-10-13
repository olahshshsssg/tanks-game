// --- 3D ИГРОВОЙ ДВИЖОК (Three.js) ---
const container = document.getElementById('canvasWrapper');

// Сцена, Камера, Рендерер
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a16); // Сделали ночь чуть светлее и синее
scene.fog = new THREE.FogExp2(0x0a0a16, 0.015); // Уменьшили туман

const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1000);
camera.position.set(0, 1.6, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

// --- ХОРОШЕЕ ОСВЕЩЕНИЕ (чтобы всё было отлично видно) ---
// Яркий общий свет
const ambientLight = new THREE.AmbientLight(0x445577, 1.5);
scene.add(ambientLight);

// Направленный лунный свет
const dirLight = new THREE.DirectionalLight(0x8899cc, 1.0);
dirLight.position.set(30, 60, 30);
scene.add(dirLight);

// Фонарик игрока (светит прямо туда, куда смотрит камера)
const playerLight = new THREE.PointLight(0xffffee, 2, 25);
camera.add(playerLight);
scene.add(camera);


// --- СОЗДАНИЕ ОТКРЫТОГО ГОРОДА ---
// Земля (асфальт)
const groundGeo = new THREE.PlaneGeometry(150, 150);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x1f222e, roughness: 0.8 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const colliders = [];

// Строим открытый квартал небоскребов и добавляем уличные фонари
const buildingColors = [0x2c3245, 0x353b50, 0x252a38];

for (let x = -60; x <= 60; x += 20) {
    for (let z = -60; z <= 60; z += 20) {
        if (Math.abs(x) < 5 || Math.abs(z) < 5) continue;

        const w = 12 + Math.random() * 4;
        const h = 20 + Math.random() * 30;
        const d = 12 + Math.random() * 4;

        const bGeo = new THREE.BoxGeometry(w, h, d);
        const bMat = new THREE.MeshStandardMaterial({ 
            color: buildingColors[Math.floor(Math.random() * buildingColors.length)],
            roughness: 0.7 
        });
        const building = new THREE.Mesh(bGeo, bMat);
        building.position.set(x, h / 2, z);
        scene.add(building);

        colliders.push({
            minX: x - w / 2, maxX: x + w / 2,
            minZ: z - d / 2, maxZ: z + d / 2
        });

        // Добавляем светящиеся окна на зданиях (светлые квадратики)
        for (let wy = 4; wy < h - 4; wy += 4) {
            const winGeo = new THREE.PlaneGeometry(1.5, 2);
            const winMat = new THREE.MeshBasicMaterial({ color: 0xffcc66 });
            
            // Окна спереди и сзади
            const win1 = new THREE.Mesh(winGeo, winMat);
            win1.position.set(x, wy, z + d/2 + 0.05);
            scene.add(win1);

            const win2 = new THREE.Mesh(winGeo, winMat);
            win2.position.set(x + w/2 + 0.05, wy, z);
            win2.rotation.y = Math.PI / 2;
            scene.add(win2);
        }
    }
}


// --- КРАСИВЫЕ МОДЕЛЬКИ ПРОТИВНИКОВ ---
const enemies = [];

function createEnemyMesh() {
    const group = new THREE.Group();

    // Торс (ярче, чтобы было видно)
    const torsoGeo = new THREE.BoxGeometry(0.7, 1.1, 0.4);
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.4 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.1;
    group.add(torso);

    // Голова
    const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.8;
    group.add(head);

    // Светящиеся красные глаза
    const eyeGeo = new THREE.BoxGeometry(0.1, 0.08, 0.1);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    
    const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
    eye1.position.set(-0.12, 1.85, -0.2);
    group.add(eye1);

    const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
    eye2.position.set(0.12, 1.85, -0.2);
    group.add(eye2);

    return group;
}

const enemySpawns = [
    { x: 25, z: 25 },
    { x: -30, z: 40 },
    { x: 45, z: -20 },
    { x: -25, z: -35 },
    { x: 0, z: -50 }
];

enemySpawns.forEach(pos => {
    const mesh = createEnemyMesh();
    mesh.position.set(pos.x, 0, pos.z);
    scene.add(mesh);
    enemies.push({
        mesh: mesh,
        x: pos.x,
        z: pos.z,
        hp: 2,
        alive: true
    });
});


// --- АУДИО СИСТЕМА (Web Audio API) ---
let audioCtx = null;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
    if (!audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const now = audioCtx.currentTime;

        if (type === 'shot') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(20, now + 0.3);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(now); osc.stop(now + 0.3);
        } else if (type === 'hit') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(25, now + 0.25);
            gain.gain.setValueAtTime(0.45, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(now); osc.stop(now + 0.25);
        } else if (type === 'hurt') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(90, now);
            osc.frequency.linearRampToValueAtTime(20, now + 0.3);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(now); osc.stop(now + 0.3);
        }
    } catch(e) {}
}


// --- УПРАВЛЕНИЕ ИГРОКОМ ---
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let score = 0;
let playerHp = 100;
let gameState = 'playing';

let eulers = new THREE.Euler(0, 0, 0, 'YXZ');
const sensitivity = 0.002;

container.addEventListener('click', () => {
    initAudio();
    container.requestPointerLock();
});

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === container && gameState === 'playing') {
        eulers.y -= e.movementX * sensitivity;
        eulers.x -= e.movementY * sensitivity;
        eulers.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, eulers.x));
        camera.quaternion.setFromEuler(eulers);
    }
});

window.addEventListener('keydown', (e) => {
    initAudio();
    if (e.code === 'KeyW') moveForward = true;
    if (e.code === 'KeyS') moveBackward = true;
    if (e.code === 'KeyA') moveLeft = true;
    if (e.code === 'KeyD') moveRight = true;
    if (e.code === 'KeyR' && (gameState === 'win' || gameState === 'gameover')) {
        location.reload();
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW') moveForward = false;
    if (e.code === 'KeyS') moveBackward = false;
    if (e.code === 'KeyA') moveLeft = false;
    if (e.code === 'KeyD') moveRight = false;
});

function checkCollision(x, z) {
    const radius = 0.6;
    for (let c of colliders) {
        if (x + radius > c.minX && x - radius < c.maxX &&
            z + radius > c.minZ && z - radius < c.maxZ) {
            return true;
        }
    }
    return false;
}

function checkObstacleBetween(x1, z1, x2, z2) {
    const dist = Math.sqrt((x2 - x1)**2 + (z2 - z1)**2);
    const steps = Math.floor(dist * 5);
    for (let i = 0; i <= steps; i++) {
        let t = i / steps;
        let cx = x1 + (x2 - x1) * t;
        let cz = z1 + (z2 - z1) * t;
        if (checkCollision(cx, cz)) return true;
    }
    return false;
}

// Выстрел
window.addEventListener('mousedown', (e) => {
    if (e.button === 0 && gameState === 'playing' && document.pointerLockElement === container) {
        playSound('shot');
        
        const wp = document.querySelector('.weapon-model');
        wp.style.transform = 'translateX(-50%) translateY(20px) rotate(-5deg)';
        setTimeout(() => wp.style.transform = 'translateX(-50%) translateY(0)', 80);

        const raycaster = new THREE.Raycaster();
        const center = new THREE.Vector2(0, 0);
        raycaster.setFromCamera(center, camera);

        enemies.forEach(en => {
            if (!en.alive) return;
            const intersects = raycaster.intersectObject(en.mesh, true);
            if (intersects.length > 0 && intersects[0].distance < 20) {
                if (!checkObstacleBetween(camera.position.x, camera.position.z, en.x, en.z)) {
                    en.hp--;
                    playSound('hit');
                    if (en.hp <= 0) {
                        en.alive = false;
                        scene.remove(en.mesh);
                        score++;
                        document.getElementById('score').innerText = `Убито: ${score} | Осталось: ${enemies.filter(e => e.alive).length}`;

                        if (enemies.every(e => !e.alive)) {
                            gameState = 'win';
                            document.exitPointerLock();
                            alert('ГОРОД ПОЛНОСТЬЮ ЗАЧИЩЕН!');
                        }
                    }
                }
            }
        });
    }
});


// --- ГЛАВНЫЙ ИГРОВОЙ ЦИКЛ ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    if (gameState === 'playing') {
        const speed = 4.5 * delta;
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        dir.y = 0;
        dir.normalize();

        const sideDir = new THREE.Vector3(-dir.z, 0, dir.x);

        let nextX = camera.position.x;
        let nextZ = camera.position.z;

        if (moveForward) { nextX += dir.x * speed; nextZ += dir.z * speed; }
        if (moveBackward) { nextX -= dir.x * speed; nextZ -= dir.z * speed; }
        if (moveLeft) { nextX += sideDir.x * speed; nextZ += sideDir.z * speed; }
        if (moveRight) { nextX -= sideDir.x * speed; nextZ -= sideDir.z * speed; }

        if (!checkCollision(nextX, camera.position.z)) camera.position.x = nextX;
        if (!checkCollision(camera.position.x, nextZ)) camera.position.z = nextZ;

        enemies.forEach(en => {
            if (!en.alive) return;

            const dx = camera.position.x - en.x;
            const dz = camera.position.z - en.z;
            const dist = Math.sqrt(dx*dx + dz*dz);

            if (dist < 18 && dist > 0.8) {
                if (!checkObstacleBetween(en.x, en.z, camera.position.x, camera.position.z)) {
                    en.x += (dx / dist) * 1.8 * delta;
                    en.z += (dz / dist) * 1.8 * delta;
                    en.mesh.position.set(en.x, 0, en.z);
                    en.mesh.lookAt(camera.position.x, 0, camera.position.z);
                }
            }

            if (dist < 1.0) {
                playerHp -= 0.5;
                playSound('hurt');
                document.getElementById('hp').innerText = `${Math.ceil(playerHp)} HP`;
                if (playerHp <= 0) {
                    gameState = 'gameover';
                    document.exitPointerLock();
                    alert('ВАС ПОГЛОТИЛА ТЬМА ГОРОДА');
                }
            }
        });
    }

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    renderer.setSize(container.clientWidth, container.clientHeight);
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
});
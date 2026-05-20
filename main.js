import * as THREE from 'three';

// ============================================================================
// 1. ESCENA, CÁMARA Y RENDERER
// ============================================================================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 11);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ============================================================================
// 2. ILUMINACIÓN ESTILO ESTUDIO
// ============================================================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
mainLight.position.set(5, 10, 7);
scene.add(mainLight);

const fillLight = new THREE.PointLight(0xffffff, 1.0, 30);
fillLight.position.set(-6, -4, 5);
scene.add(fillLight);

// ============================================================================
// 3. NUEVAS FIGURAS MÁS ESTILIZADAS Y ELEGANTES
// ============================================================================
const geometries = [
    new THREE.TorusKnotGeometry(0.9, 0.3, 120, 16),      // Nudo Toroidal
    new THREE.OctahedronGeometry(1.4, 0),                // Diamante / Octaedro
    new THREE.ConeGeometry(1.3, 2.6, 4, 16),             // Pirámide Estilizada
    new THREE.DodecahedronGeometry(1.3, 1),              // Esfera Facetada
    new THREE.TorusGeometry(1.0, 0.35, 16, 100)          // Anillo Grueso elegante
];

const positionsX = [ -5.5, -2.8, 0, 2.8, 5.5 ]; 
const colors = [0x00f0ff, 0xff007f, 0x7000ff, 0x00ff66, 0xffaa00]; // Colores Neón / Cyberpunk

const figures = [];

geometries.forEach((geo, index) => {
    // Material Sólido Premium
    const solidMaterial = new THREE.MeshStandardMaterial({
        color: colors[index],
        roughness: 0.1,
        metalness: 0.8, // Acabado metálico reflectante
    });
    const solidMesh = new THREE.Mesh(geo, solidMaterial);
    solidMesh.position.x = positionsX[index];
    scene.add(solidMesh);

    // Material de Partículas Estrelares
    const particleMaterial = new THREE.PointsMaterial({
        color: colors[index],
        size: 0.06,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const particleGeo = geo.clone(); 
    const particlePoints = new THREE.Points(particleGeo, particleMaterial);
    particlePoints.position.x = positionsX[index];
    particlePoints.visible = false; 
    scene.add(particlePoints);

    // Guardamos la referencia para el sistema de clics
    figures.push({
        id: solidMesh.uuid, // Identificador único
        solid: solidMesh,
        particles: particlePoints,
        geometry: particleGeo,
        isDisintegrating: false,
        velocities: null
    });
});

// ============================================================================
// 4. DETECCIÓN DE CLIC EN FIGURAS (RAYCASTER)
// ============================================================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    // Convertir la posición del mouse a coordenadas normalizadas de Three.js (-1 a 1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Filtrar solo los objetos sólidos visibles que están vivos
    const targets = figures.filter(f => !f.isDisintegrating).map(f => f.solid);
    const intersects = raycaster.intersectObjects(targets);

    if (intersects.length > 0) {
        const hitMesh = intersects[0].object;

        // Buscar qué figura de nuestro arreglo coincide con la que recibió el clic
        const clickedFigure = figures.find(f => f.id === hitMesh.uuid);

        if (clickedFigure) {
            clickedFigure.solid.visible = false;
            clickedFigure.particles.visible = true;
            clickedFigure.isDisintegrating = true;

            // Inicializar partículas explosivas
            const vertexCount = clickedFigure.geometry.attributes.position.count;
            const vels = new Float32Array(vertexCount * 3);
            for (let i = 0; i < vertexCount * 3; i += 3) {
                vels[i]     = (Math.random() - 0.5) * 0.15; // Velocidad X
                vels[i + 1] = (Math.random() - 0.5) * 0.15; // Velocidad Y
                vels[i + 2] = (Math.random() - 0.5) * 0.15; // Velocidad Z
            }
            clickedFigure.velocities = vels;
        }
    }
});

// ============================================================================
// 5. BUCLE DE ANIMACIÓN
// ============================================================================
function animate() {
    requestAnimationFrame(animate);

    figures.forEach((fig) => {
        if (fig.solid.visible) {
            fig.solid.rotation.y += 0.015;
            fig.solid.rotation.x += 0.005;
        }

        if (fig.isDisintegrating) {
            fig.particles.rotation.y += 0.01;

            const positionsAttribute = fig.geometry.attributes.position;
            const positionsArray = positionsAttribute.array;

            for (let i = 0; i < positionsAttribute.count; i++) {
                const indexX = i * 3;
                const indexY = i * 3 + 1;
                const indexZ = i * 3 + 2;

                positionsArray[indexX] += fig.velocities[indexX];
                positionsArray[indexY] += fig.velocities[indexY];
                positionsArray[indexZ] += fig.velocities[indexZ];
            }
            positionsAttribute.needsUpdate = true;

            if (fig.particles.material.opacity > 0) {
                fig.particles.material.opacity -= 0.02; // Desvanecimiento fluido
            } else {
                fig.particles.visible = false;
                fig.isDisintegrating = false;
            }
        }
    });

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
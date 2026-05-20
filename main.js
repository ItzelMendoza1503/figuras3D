import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 11);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
mainLight.position.set(5, 10, 7);
scene.add(mainLight);

const fillLight = new THREE.PointLight(0xffffff, 1.0, 30);
fillLight.position.set(-6, -4, 5);
scene.add(fillLight);

const geometries = [
    new THREE.TorusKnotGeometry(0.9, 0.3, 120, 16),
    new THREE.OctahedronGeometry(1.4, 0),
    new THREE.ConeGeometry(1.3, 2.6, 4, 16),
    new THREE.DodecahedronGeometry(1.3, 1),
    new THREE.TorusGeometry(1.0, 0.35, 16, 100)
];

const positionsX = [ -5.5, -2.8, 0, 2.8, 5.5 ]; 
const colors = [0x00f0ff, 0xff007f, 0x7000ff, 0x00ff66, 0xffaa00];

const figures = [];

geometries.forEach((geo, index) => {
    const solidMaterial = new THREE.MeshStandardMaterial({
        color: colors[index],
        roughness: 0.1,
        metalness: 0.8,
    });
    const solidMesh = new THREE.Mesh(geo, solidMaterial);
    solidMesh.position.x = positionsX[index];
    scene.add(solidMesh);

    const particleMaterial = new THREE.PointsMaterial({
        color: colors[index],
        size: 0.06,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const particleGeo = geo.clone(); 
    const particlePoints = new THREE.Points(particleGeo, particleMaterial);
    particlePoints.position.x = positionsX[index];
    particlePoints.visible = false; 
    scene.add(particlePoints);

    const originalPositions = Float32Array.from(particleGeo.attributes.position.array);

    figures.push({
        id: solidMesh.uuid,
        solid: solidMesh,
        particles: particlePoints,
        geometry: particleGeo,
        originalPositions: originalPositions,
        status: 'idle',
        velocities: null
    });
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const targets = figures.filter(f => f.status === 'idle').map(f => f.solid);
    const intersects = raycaster.intersectObjects(targets);

    if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const clickedFigure = figures.find(f => f.id === hitMesh.uuid);

        if (clickedFigure) {
            clickedFigure.solid.visible = false;
            clickedFigure.particles.visible = true;
            clickedFigure.status = 'exploding';
            clickedFigure.particles.material.opacity = 1.0;

            const vertexCount = clickedFigure.geometry.attributes.position.count;
            const vels = new Float32Array(vertexCount * 3);
            for (let i = 0; i < vertexCount * 3; i += 3) {
                vels[i]     = (Math.random() - 0.5) * 0.15; 
                vels[i + 1] = (Math.random() - 0.5) * 0.15; 
                vels[i + 2] = (Math.random() - 0.5) * 0.15; 
            }
            clickedFigure.velocities = vels;
        }
    }
});

function animate() {
    requestAnimationFrame(animate);

    figures.forEach((fig) => {
        if (fig.status === 'idle') {
            fig.solid.rotation.y += 0.015;
            fig.solid.rotation.x += 0.005;
        }

        if (fig.status === 'exploding') {
            fig.particles.rotation.y += 0.01;

            const positionsAttribute = fig.geometry.attributes.position;
            const positionsArray = positionsAttribute.array;

            for (let i = 0; i < positionsAttribute.count; i++) {
                positionsArray[i * 3]     += fig.velocities[i * 3];
                positionsArray[i * 3 + 1] += fig.velocities[i * 3 + 1];
                positionsArray[i * 3 + 2] += fig.velocities[i * 3 + 2];
            }
            positionsAttribute.needsUpdate = true;

            if (fig.particles.material.opacity > 0) {
                fig.particles.material.opacity -= 0.015; 
            } else {
                fig.status = 'reintegrating';
            }
        }

        if (fig.status === 'reintegrating') {
            fig.particles.rotation.y += 0.01;

            const positionsAttribute = fig.geometry.attributes.position;
            const positionsArray = positionsAttribute.array;
            const orig = fig.originalPositions;

            let completado = true;
            const lerpFactor = 0.08; 

            for (let i = 0; i < positionsAttribute.count * 3; i++) {
                positionsArray[i] += (orig[i] - positionsArray[i]) * lerpFactor;

                if (Math.abs(orig[i] - positionsArray[i]) > 0.01) {
                    completado = false;
                }
            }
            positionsAttribute.needsUpdate = true;

            if (fig.particles.material.opacity < 1.0) {
                fig.particles.material.opacity += 0.02;
            }

            if (completado) {
                positionsArray.set(orig);
                positionsAttribute.needsUpdate = true;

                fig.solid.visible = true;
                fig.particles.visible = false;
                fig.particles.material.opacity = 0.0;
                fig.status = 'idle';
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
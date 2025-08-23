// This function runs once the entire page has loaded, including the Three.js library.
window.onload = function() {

    // --- Scene Setup ---

    // Get the dimensions of the renderer container.
    const rendererContainer = document.getElementById('renderer-container');
    const containerWidth = rendererContainer.clientWidth;
    const containerHeight = rendererContainer.clientHeight;

    // A Scene is a container for all objects, lights, and cameras.
    const scene = new THREE.Scene();

    // The Camera defines the viewing frustum, determining what is rendered.
    // Use the container's aspect ratio.
    const camera = new THREE.PerspectiveCamera(75, containerWidth / containerHeight, 0.1, 1000);

    // The Renderer handles displaying the scene on the screen.
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerWidth, containerHeight);

    // Add the renderer's canvas to the dedicated container.
    rendererContainer.appendChild(renderer.domElement);


    // --- Create a 3D Object (a cube) ---

    // Define the geometry (shape) and material (surface properties) for the object.
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        roughness: 0.5,
        metalness: 0.8
    });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);


    // --- Add Lights ---

    // Lights are necessary to make objects visible and cast shadows.
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);


    // --- Position the Camera ---

    // Move the camera so we can see the cube from a distance.
    camera.position.z = 5;


    // --- The Animation Loop ---

    // This is the core loop that continuously updates and re-renders the scene.
    const animate = function () {
        // requestAnimationFrame is a browser method for efficient animation.
        requestAnimationFrame(animate);

        // Update the cube's rotation each frame for a spinning effect.
        cube.rotation.x += 0.005;
        cube.rotation.y += 0.005;

        // Render the scene from the camera's perspective.
        renderer.render(scene, camera);
    };

    // Start the animation.
    animate();


    // --- Handle Window Resizing ---

    // This event listener ensures the scene remains responsive when the window size changes.
    window.addEventListener('resize', () => {
        // Update the camera's aspect ratio based on the new container size.
        const newContainerWidth = rendererContainer.clientWidth;
        const newContainerHeight = rendererContainer.clientHeight;
        camera.aspect = newContainerWidth / newContainerHeight;
        camera.updateProjectionMatrix();

        // Update the renderer's size to match the new container.
        renderer.setSize(newContainerWidth, newContainerHeight);
    });
};

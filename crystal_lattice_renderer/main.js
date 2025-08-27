window.onload = function() {
            // --- Points Tab Functionality ---
            let points = [];
            const addPointButton = document.getElementById('addPointButton');
            const pointsList = document.getElementById('pointsList');
            const pointXInput = document.getElementById('pointX');
            const pointYInput = document.getElementById('pointY');
            const pointZInput = document.getElementById('pointZ');


            // Show a message if max points reached
            let pointsLimitMsg = document.getElementById('pointsLimitMsg');
            if (!pointsLimitMsg) {
                pointsLimitMsg = document.createElement('div');
                pointsLimitMsg.id = 'pointsLimitMsg';
                pointsLimitMsg.style.color = 'red';
                pointsLimitMsg.style.marginTop = '8px';
                addPointButton.parentNode.insertBefore(pointsLimitMsg, addPointButton.nextSibling);
            }

            function renderPointsList() {
                pointsList.innerHTML = '';
                points.forEach((pt, idx) => {
                    const li = document.createElement('li');
                    li.classList.add('basis-item');
                    li.dataset.idx = idx;
                    const coords = `(${pt.x.toFixed(4)}, ${pt.y.toFixed(4)}, ${pt.z.toFixed(4)})`;
                    li.innerHTML = `
                        <div>
                            <p class="atom-coordinates">${coords}</p>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <button data-idx="${idx}">Remove</button>
                        </div>
                    `;
                    pointsList.appendChild(li);
                });
                if (points.length >= 2) {
                    addPointButton.disabled = true;
                    pointsLimitMsg.textContent = 'Maximum of 2 points allowed.';
                } else {
                    addPointButton.disabled = false;
                    pointsLimitMsg.textContent = '';
                }
                updatePointsDistance();
                updateLatticeRenderer();
            }

            addPointButton.addEventListener('click', () => {
                if (points.length >= 2) {
                    renderPointsList();
                    return;
                }
                const x = parseFloat(pointXInput.value);
                const y = parseFloat(pointYInput.value);
                const z = parseFloat(pointZInput.value);
                if (isNaN(x) || isNaN(y) || isNaN(z) || x < 0 || x > 1 || y < 0 || y > 1 || z < 0 || z > 1) {
                    alert('Please enter valid Miller coordinates (0-1) for x, y, z.');
                    return;
                }
                points.push({ x, y, z });
                renderPointsList();
            });

            pointsList.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON' && e.target.dataset.idx !== undefined) {
                    const idx = parseInt(e.target.dataset.idx, 10);
                    points.splice(idx, 1);
                    renderPointsList();
                }
            });
            // Get the container for the renderer and UI elements
            const rendererContainer = document.getElementById('rendererContainer');
            const latticeParamsDisplay = document.getElementById('latticeParamsDisplay');
            const basisAtomsList = document.getElementById('basisAtomsList');
            const addAtomButton = document.getElementById('addAtomButton');
            const renderCustomButton = document.getElementById('renderCustomButton');
            
            // Get the new custom size input elements
            const customLengthXInput = document.getElementById('customLengthX');
            const customLengthYInput = document.getElementById('customLengthY');
            const customLengthZInput = document.getElementById('customLengthZ');


            // --- Scene Setup ---
            const scene = new THREE.Scene();
            const basisScene = new THREE.Scene();

            const camera = new THREE.PerspectiveCamera(75, rendererContainer.clientWidth / rendererContainer.clientHeight, 0.1, 1000);
            camera.position.set(2, 2, 5);
            const basisCamera = new THREE.PerspectiveCamera(75, rendererContainer.clientWidth / rendererContainer.clientHeight, 0.1, 1000);
            // Adjusted camera position to better fit the rotated basis
            basisCamera.position.set(2, 2, 2);

            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(rendererContainer.clientWidth, rendererContainer.clientHeight);
            renderer.setClearColor(0x000000, 0);
            rendererContainer.appendChild(renderer.domElement);
            renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            scene.add(ambientLight);
            const pointLight = new THREE.PointLight(0xffffff, 1);
            pointLight.position.set(5, 5, 5);
            scene.add(pointLight);

            const basisAmbientLight = new THREE.AmbientLight(0xffffff, 0.5);
            basisScene.add(basisAmbientLight);
            const basisPointLight = new THREE.PointLight(0xffffff, 1);
            basisPointLight.position.set(1, 1, 1);
            basisScene.add(basisPointLight);

            // Create a group for the axes that can be added and removed easily
            function createAxesGroup() {
                const axesGroup = new THREE.Group();
                const axisLength = 5;

                // X-axis (Red)
                const xPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(axisLength, 0, 0)];
                const xMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
                const xGeometry = new THREE.BufferGeometry().setFromPoints(xPoints);
                const xAxis = new THREE.Line(xGeometry, xMaterial);
                axesGroup.add(xAxis);

                // Y-axis (Green)
                const yPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, axisLength, 0)];
                const yMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
                const yGeometry = new THREE.BufferGeometry().setFromPoints(yPoints);
                const yAxis = new THREE.Line(yGeometry, yMaterial);
                axesGroup.add(yAxis);

                // Z-axis (Blue)
                const zPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, axisLength)];
                const zMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
                const zGeometry = new THREE.BufferGeometry().setFromPoints(zPoints);
                const zAxis = new THREE.Line(zGeometry, zMaterial);
                axesGroup.add(zAxis);
                return axesGroup;
            }

            const latticeGroup = new THREE.Group();
            scene.add(latticeGroup);
            // Rotate the main lattice to have z-axis vertical
            latticeGroup.rotation.x = -Math.PI / 2;
            const latticeAxesGroup = createAxesGroup();
            latticeGroup.add(latticeAxesGroup);

            const basisLatticeGroup = new THREE.Group();
            basisScene.add(basisLatticeGroup);
            // Rotate the basis unit cell to have z-axis vertical
            basisLatticeGroup.rotation.x = -Math.PI / 2;
            const basisAxesGroup = createAxesGroup();
            basisLatticeGroup.add(basisAxesGroup);

            // --- Basis Data and State ---
            // The basis is now a mutable array of atom objects
            // Starting with a two-atom basis to demonstrate the functionality
            let basis = [
                { id: crypto.randomUUID(), position: new THREE.Vector3(0, 0, 0), color: "#ffffff" },
                { id: crypto.randomUUID(), position: new THREE.Vector3(0.5, 0.5, 0.5), color: "#00ff00" }
            ];

            // An object to hold the definitions for different Bravais lattices
            const lattices = {
                cubicP: { a: 1, b: 1, c: 1, alpha: 90, beta: 90, gamma: 90, centeringType: 'P' },
                cubicI: { a: 1, b: 1, c: 1, alpha: 90, beta: 90, gamma: 90, centeringType: 'I' },
                cubicF: { a: 1, b: 1, c: 1, alpha: 90, beta: 90, gamma: 90, centeringType: 'F' },
                tetragonalP: { a: 1, b: 1, c: 2, alpha: 90, beta: 90, gamma: 90, centeringType: 'P' },
                tetragonalI: { a: 1, b: 1, c: 2, alpha: 90, beta: 90, gamma: 90, centeringType: 'I' },
                orthorhombicP: { a: 1, b: 1.5, c: 2, alpha: 90, beta: 90, gamma: 90, centeringType: 'P' },
                orthorhombicA: { a: 1, b: 1.5, c: 2, alpha: 90, beta: 90, gamma: 90, centeringType: 'A' },
                orthorhombicB: { a: 1, b: 1.5, c: 2, alpha: 90, beta: 90, gamma: 90, centeringType: 'B' },
                orthorhombicC: { a: 1, b: 1.5, c: 2, alpha: 90, beta: 90, gamma: 90, centeringType: 'C' },
                orthorhombicI: { a: 1, b: 1.5, c: 2, alpha: 90, beta: 90, gamma: 90, centeringType: 'I' },
                orthorhombicF: { a: 1, b: 1.5, c: 2, alpha: 90, beta: 90, gamma: 90, centeringType: 'F' },
                monoclinicP: { a: 1, b: 1.5, c: 2, alpha: 90, beta: 105, gamma: 90, centeringType: 'P' },
                monoclinicC: { a: 1, b: 1.5, c: 2, alpha: 90, beta: 105, gamma: 90, centeringType: 'C' },
                // New lattice types added here
                triclinicP: { a: 1, b: 1.5, c: 2, alpha: 80, beta: 100, gamma: 110, centeringType: 'P' },
                trigonalR: { a: 1.5, b: 1.5, c: 1.5, alpha: 80, beta: 80, gamma: 80, centeringType: 'R' },
                hexagonalP: { a: 1, b: 1, c: 2, alpha: 90, beta: 90, gamma: 120, centeringType: 'P' },
            };

            let currentScene = scene;
            let currentCamera = camera;

            // --- Rendering Functions ---
            function clearGroup(group) {
                // Remove all children from a group, but a more robust way is to just remove and then re-add everything.
                while(group.children.length > 0) {
                    const child = group.children[0];
                    group.remove(child);
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                }
            }
            
            // Function to generate the inverse matrix for converting Cartesian to fractional coordinates
            function getInverseMatrix(a1, a2, a3) {
                const matrix = new THREE.Matrix4();
                matrix.set(
                    a1.x, a2.x, a3.x, 0,
                    a1.y, a2.y, a3.y, 0,
                    a1.z, a2.z, a3.z, 0,
                    0, 0, 0, 1
                );
                return matrix.invert();
            }
            
            function renderLattice(data, shouldRenderFaces, latticeType) {
                // Clear all children from the group and then re-add the axes
                clearGroup(latticeGroup);
                latticeGroup.add(latticeAxesGroup);

                const sphereGeometry = new THREE.SphereGeometry(0.05, 32, 32);

                const { points: allAtoms, lines, numCellsX, numCellsY, numCellsZ, a1, a2, a3 } = data;
                
                // Form the supercell basis vectors
                const supercell_a1 = a1.clone().multiplyScalar(numCellsX);
                const supercell_a2 = a2.clone().multiplyScalar(numCellsY);
                const supercell_a3 = a3.clone().multiplyScalar(numCellsZ);

                // Get the inverse matrix for the supercell's basis vectors
                const supercellInverseMatrix = getInverseMatrix(supercell_a1, supercell_a2, supercell_a3);

                const filteredAtoms = [];
                const tolerance = 1e-6;

                // Filter atoms to only show those inside the main supercell
                allAtoms.forEach(atom => {
                    const fracPos = atom.position.clone().applyMatrix4(supercellInverseMatrix);
                    
                    // The main supercell is defined by 0 <= x,y,z <= 1 in fractional coordinates
                    if (fracPos.x >= -tolerance && fracPos.x <= 1 + tolerance &&
                        fracPos.y >= -tolerance && fracPos.y <= 1 + tolerance &&
                        fracPos.z >= -tolerance && fracPos.z <= 1 + tolerance) {
                        filteredAtoms.push(atom);
                    }
                });

                filteredAtoms.forEach(atom => {
                    const sphereMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(atom.color) });
                    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                    sphere.position.set(atom.position.x, atom.position.y, atom.position.z);
                    latticeGroup.add(sphere);
                });
                // Add points from the Points tab as bright pink atoms in the main scene
                // Render points as relative positions using lattice parameters
                if (Array.isArray(points)) {
                    // Use the lattice parameters for this scene
                    const a = a1.length();
                    const b = a2.length();
                    const c = a3.length();
                    // Calculate angles
                    const alpha = Math.acos(a2.dot(a3) / (a2.length() * a3.length())) * 180 / Math.PI;
                    const beta = Math.acos(a1.dot(a3) / (a1.length() * a3.length())) * 180 / Math.PI;
                    const gamma = Math.acos(a1.dot(a2) / (a1.length() * a2.length())) * 180 / Math.PI;
                    points.forEach(pt => {
                        // Convert fractional to cartesian
                        const cart = fractionalToCartesian(pt, a, b, c, alpha, beta, gamma);
                        const sphereMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color('#ff33cc') });
                        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                        sphere.position.set(cart.x, cart.y, cart.z);
                        latticeGroup.add(sphere);
                    });
                }
                
                const lineMaterial = new THREE.LineBasicMaterial({ color: 0xcccccc });
                const lineGeometry = new THREE.BufferGeometry().setFromPoints(lines);
                const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
                latticeGroup.add(lineSegments);

                if (shouldRenderFaces) {
                    const faceMaterial = new THREE.MeshStandardMaterial({
                        color: 0xcccccc,
                        transparent: true,
                        opacity: 0.1,
                        side: THREE.DoubleSide,
                    });
                    
                    const faceVertices = [];
                    const faceIndices = [];
                    let vertexCount = 0;

                    for (let n1 = 0; n1 < numCellsX; n1++) {
                        for (let n2 = 0; n2 < numCellsY; n2++) {
                            for (let n3 = 0; n3 < numCellsZ; n3++) {
                                const offset = a1.clone().multiplyScalar(n1).add(a2.clone().multiplyScalar(n2)).add(a3.clone().multiplyScalar(n3));

                                const corners = [
                                    offset.clone(),
                                    a1.clone().add(offset),
                                    a2.clone().add(offset),
                                    a3.clone().add(offset),
                                    a1.clone().add(a2).add(offset),
                                    a1.clone().add(a3).add(offset),
                                    a2.clone().add(a3).add(offset),
                                    a1.clone().add(a2).add(a3).add(offset)
                                ];

                                const faces = [
                                    [corners[0], corners[1], corners[4], corners[2]],
                                    [corners[0], corners[2], corners[6], corners[3]],
                                    [corners[0], corners[3], corners[5], corners[1]],
                                    [corners[1], corners[5], corners[7], corners[4]],
                                    [corners[2], corners[4], corners[7], corners[6]],
                                    [corners[3], corners[6], corners[7], corners[5]],
                                ];

                                faces.forEach(face => {
                                    face.forEach(v => faceVertices.push(v.x, v.y, v.z));
                                    faceIndices.push(vertexCount, vertexCount + 1, vertexCount + 2);
                                    faceIndices.push(vertexCount, vertexCount + 2, vertexCount + 3);
                                    vertexCount += 4;
                                });
                            }
                        }
                    }

                    const faceGeometry = new THREE.BufferGeometry();
                    faceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(faceVertices, 3));
                    faceGeometry.setIndex(faceIndices);
                    faceGeometry.computeVertexNormals();

                    const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
                    latticeGroup.add(faceMesh);
                }
            }

            // Function to render the atoms for the basis scene
            function renderBasis() {
                // Clear all children from the group and then re-add the axes
                clearGroup(basisLatticeGroup);
                basisLatticeGroup.add(basisAxesGroup);

                const sphereGeometry = new THREE.SphereGeometry(0.05, 32, 32);

                // This is a dummy unit cell to hold the basis atoms, always 1x1x1
                const a1 = new THREE.Vector3(1, 0, 0);
                const a2 = new THREE.Vector3(0, 1, 0);
                const a3 = new THREE.Vector3(0, 0, 1);

                // Add the lines for the unit cell boundaries
                const lineMaterial = new THREE.LineBasicMaterial({ color: 0xcccccc });
                const linePoints = [
                    new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0),
                    new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 1, 0),
                    new THREE.Vector3(1, 1, 0), new THREE.Vector3(0, 1, 0),
                    new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0),

                    new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 1),
                    new THREE.Vector3(1, 0, 1), new THREE.Vector3(1, 1, 1),
                    new THREE.Vector3(1, 1, 1), new THREE.Vector3(0, 1, 1),
                    new THREE.Vector3(0, 1, 1), new THREE.Vector3(0, 0, 1),
                    
                    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1),
                    new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 0, 1),
                    new THREE.Vector3(1, 1, 0), new THREE.Vector3(1, 1, 1),
                    new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 1),
                ];
                const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
                const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
                basisLatticeGroup.add(lineSegments);


                basis.forEach(atom => {
                    const sphereMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(atom.color) });
                    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                    
                    // Position the atoms correctly within the 1x1x1 cell
                    sphere.position.copy(atom.position);
                    
                    basisLatticeGroup.add(sphere);
                });
                // Add points from the Points tab as bright pink atoms
                if (Array.isArray(points)) {
                    points.forEach(pt => {
                        const sphereMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color('#ff33cc') });
                        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                        sphere.position.set(pt.x, pt.y, pt.z);
                        basisLatticeGroup.add(sphere);
                    });
                }
            }

            // New function to generate all basis atoms at all lattice points
            function generateBasisAtLatticePoints(latticePoints, basis, a1, a2, a3) {
                const allAtoms = [];
                // The basis positions are already in fractional coordinates, but for the rendering function, we need them to be a part of the atom object.
                // We'll calculate the Cartesian position later
                
                latticePoints.forEach(latticePos => {
                    basis.forEach(basisAtom => {
                        const newPos = latticePos.clone()
                            .add(a1.clone().multiplyScalar(basisAtom.position.x))
                            .add(a2.clone().multiplyScalar(basisAtom.position.y))
                            .add(a3.clone().multiplyScalar(basisAtom.position.z));

                        allAtoms.push({
                            position: newPos,
                            color: basisAtom.color
                        });
                    });
                });
                return allAtoms;
            }
            
            function generateLatticePoints(latticeParams, numCellsX, numCellsY, numCellsZ) {
                
                if (!latticeParams) {
                    console.error('Lattice parameters not found.');
                    return;
                }

                const { a, b, c, alpha, beta, gamma, centeringType } = latticeParams;
                const alphaRad = alpha * (Math.PI / 180);
                const betaRad = beta * (Math.PI / 180);
                const gammaRad = gamma * (Math.PI / 180);

                const a1 = new THREE.Vector3(a, 0, 0);
                const a2 = new THREE.Vector3(b * Math.cos(gammaRad), b * Math.sin(gammaRad), 0);
                const V_squared = 1 - Math.cos(alphaRad)**2 - Math.cos(betaRad)**2 - Math.cos(gammaRad)**2 + 2 * Math.cos(alphaRad) * Math.cos(betaRad) * Math.cos(gammaRad);
                const V = a * b * c * Math.sqrt(V_squared);
                const a3x = c * Math.cos(betaRad);
                const a3y = c * (Math.cos(alphaRad) - Math.cos(betaRad) * Math.cos(gammaRad)) / Math.sin(gammaRad);
                const a3z = V / (a * b * Math.sin(gammaRad));
                const a3 = new THREE.Vector3(a3x, a3y, a3z);

                const pointSet = new Set();
                const lines = [];

                let fractionalPositions = [];
                switch (centeringType) {
                    case 'P':
                    case 'R':
                        fractionalPositions = [
                            new THREE.Vector3(0, 0, 0)
                        ];
                        break;
                    case 'I':
                        fractionalPositions = [
                            new THREE.Vector3(0, 0, 0),
                            new THREE.Vector3(0.5, 0.5, 0.5)
                        ];
                        break;
                    case 'F':
                        fractionalPositions = [
                            new THREE.Vector3(0, 0, 0),
                            new THREE.Vector3(0.5, 0.5, 0),
                            new THREE.Vector3(0.5, 0, 0.5),
                            new THREE.Vector3(0, 0.5, 0.5)
                        ];
                        break;
                    case 'A':
                        fractionalPositions = [
                            new THREE.Vector3(0, 0, 0),
                            new THREE.Vector3(0, 0.5, 0.5)
                        ];
                        break;
                    case 'B':
                        fractionalPositions = [
                            new THREE.Vector3(0, 0, 0),
                            new THREE.Vector3(0.5, 0, 0.5)
                        ];
                        break;
                    case 'C':
                        fractionalPositions = [
                            new THREE.Vector3(0, 0, 0),
                            new THREE.Vector3(0.5, 0.5, 0)
                        ];
                        break;
                }
                
                const latticePoints = [];
                // Overscan loops to ensure all atoms in the final unit cell range are included
                for (let n1 = -1; n1 <= numCellsX; n1++) {
                    for (let n2 = -1; n2 <= numCellsY; n2++) {
                        for (let n3 = -1; n3 <= numCellsZ; n3++) {
                            const offset = a1.clone().multiplyScalar(n1).add(a2.clone().multiplyScalar(n2)).add(a3.clone().multiplyScalar(n3));
                            fractionalPositions.forEach(frac_pos => {
                                const pos = offset.clone()
                                    .add(a1.clone().multiplyScalar(frac_pos.x))
                                    .add(a2.clone().multiplyScalar(frac_pos.y))
                                    .add(a3.clone().multiplyScalar(frac_pos.z));
                                
                                latticePoints.push(pos);
                            });
                        }
                    }
                }
                
                // Add lines for the main unit cell grid only
                for (let n1 = 0; n1 < numCellsX; n1++) {
                    for (let n2 = 0; n2 < numCellsY; n2++) {
                        for (let n3 = 0; n3 < numCellsZ; n3++) {
                            const offset = a1.clone().multiplyScalar(n1).add(a2.clone().multiplyScalar(n2)).add(a3.clone().multiplyScalar(n3));
                            const corners = [
                                offset.clone(),
                                a1.clone().add(offset),
                                a2.clone().add(offset),
                                a3.clone().add(offset),
                                a1.clone().add(a2).add(offset),
                                a1.clone().add(a3).add(offset),
                                a2.clone().add(a3).add(offset),
                                a1.clone().add(a2).add(a3).add(offset)
                            ];

                            lines.push(corners[0], corners[1]);
                            lines.push(corners[1], corners[4]);
                            lines.push(corners[4], corners[2]);
                            lines.push(corners[2], corners[0]);
                            
                            lines.push(corners[3], corners[5]);
                            lines.push(corners[5], corners[7]);
                            lines.push(corners[7], corners[6]);
                            lines.push(corners[6], corners[3]);
                            
                            lines.push(corners[0], corners[3]);
                            lines.push(corners[1], corners[5]);
                            lines.push(corners[4], corners[7]);
                            lines.push(corners[2], corners[6]);
                        }
                    }
                }
                
                return { 
                    points: latticePoints, 
                    lines, 
                    numCellsX, 
                    numCellsY, 
                    numCellsZ, 
                    a1, a2, a3 
                };
            }

            // --- Interaction Controls (Mouse and Touch) ---
            let isDragging = false;
            let isPanning = false;
            let previousMousePosition = {
                x: 0,
                y: 0
            };
            const rotationSpeed = 0.005;
            const panSpeed = 0.005;
            const zoomSpeed = 0.0025;
            
            renderer.domElement.addEventListener('mousedown', (event) => {
                if (event.button === 2) {
                    isPanning = true;
                } else {
                    isDragging = true;
                }
                previousMousePosition.x = event.clientX;
                previousMousePosition.y = event.clientY;
            });
            renderer.domElement.addEventListener('mousemove', (event) => {
                const deltaMove = {
                    x: event.clientX - previousMousePosition.x,
                    y: event.clientY - previousMousePosition.y,
                };

                if (isDragging) {
                    currentScene.rotation.y += deltaMove.x * rotationSpeed;
                    currentScene.rotation.x += deltaMove.y * rotationSpeed;
                } else if (isPanning) {
                    currentCamera.position.x -= deltaMove.x * panSpeed;
                    currentCamera.position.y += deltaMove.y * panSpeed;
                }
                previousMousePosition.x = event.clientX;
                previousMousePosition.y = event.clientY;
            });
            renderer.domElement.addEventListener('mouseup', () => {
                isDragging = false;
                isPanning = false;
            });

            renderer.domElement.addEventListener('wheel', (event) => {
                event.preventDefault();
                currentCamera.position.z += event.deltaY * zoomSpeed;
                currentCamera.position.z = Math.max(0.1, Math.min(currentCamera.position.z, 20));
            });

            renderer.domElement.addEventListener('touchstart', (event) => {
                if (event.touches.length === 1) {
                    isDragging = true;
                    previousMousePosition.x = event.touches[0].clientX;
                    previousMousePosition.y = event.touches[0].clientY;
                } else if (event.touches.length === 2) {
                    isPanning = true;
                    previousMousePosition.x = (event.touches[0].clientX + event.touches[1].clientX) / 2;
                    previousMousePosition.y = (event.touches[0].clientY + event.touches[1].clientY) / 2;
                }
            });
            renderer.domElement.addEventListener('touchend', () => {
                isDragging = false;
                isPanning = false;
            });
            renderer.domElement.addEventListener('touchmove', (event) => {
                if (isDragging && event.touches.length === 1) {
                    const deltaMove = {
                        x: event.touches[0].clientX - previousMousePosition.x,
                        y: event.touches[0].clientY - previousMousePosition.y,
                    };
                    currentScene.rotation.y += deltaMove.x * rotationSpeed;
                    currentScene.rotation.x += deltaMove.y * rotationSpeed;
                    previousMousePosition.x = event.touches[0].clientX;
                    previousMousePosition.y = event.touches[0].clientY;
                } else if (isPanning && event.touches.length === 2) {
                    const currentMidpointX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
                    const currentMidpointY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
                    const deltaMove = {
                        x: currentMidpointX - previousMousePosition.x,
                        y: currentMidpointY - previousMousePosition.y,
                    };
                    currentCamera.position.x -= deltaMove.x * panSpeed;
                    currentCamera.position.y += deltaMove.y * panSpeed;
                    previousMousePosition.x = currentMidpointX;
                    previousMousePosition.y = currentMidpointY;
                }
            });
            
            // --- UI Interaction Logic ---

            function getSelectedLatticeType() {
                const activeLatticeButton = document.querySelector('#bravaisSection .render-button.active');
                return activeLatticeButton ? activeLatticeButton.dataset.lattice : 'cubicP';
            }

            function updateLatticeRenderer() {
                const activeSectionId = document.querySelector('.menu-section.active').id;
                let latticeData;
                let numCellsX, numCellsY, numCellsZ;

                if (activeSectionId === 'customSection') {
                    const customParams = {
                        a: parseFloat(document.getElementById('customA').value),
                        b: parseFloat(document.getElementById('customB').value),
                        c: parseFloat(document.getElementById('customC').value),
                        alpha: parseFloat(document.getElementById('customAlpha').value),
                        beta: parseFloat(document.getElementById('customBeta').value),
                        gamma: parseFloat(document.getElementById('customGamma').value),
                        centeringType: document.getElementById('customCentering').value
                    };
                    // Use new custom size inputs
                    numCellsX = parseInt(customLengthXInput.value, 10);
                    numCellsY = parseInt(customLengthYInput.value, 10);
                    numCellsZ = parseInt(customLengthZInput.value, 10);
                    
                    latticeData = generateLatticePoints(customParams, numCellsX, numCellsY, numCellsZ);
                    displayLatticeParams('custom', customParams);
                } else {
                    const selectedLatticeType = getSelectedLatticeType();
                    // Use existing unit cell inputs for Bravais lattices
                    numCellsX = parseInt(document.getElementById('lengthX').value, 10);
                    numCellsY = parseInt(document.getElementById('lengthY').value, 10);
                    numCellsZ = parseInt(document.getElementById('lengthZ').value, 10);
                    
                    latticeData = generateLatticePoints(lattices[selectedLatticeType], numCellsX, numCellsY, numCellsZ);
                    displayLatticeParams(selectedLatticeType);
                }
                
                const shouldRenderFaces = document.getElementById('showFacesToggle').checked;
                const allAtoms = generateBasisAtLatticePoints(latticeData.points, basis, latticeData.a1, latticeData.a2, latticeData.a3);
                
                const renderData = { 
                    points: allAtoms, 
                    lines: latticeData.lines, 
                    numCellsX: latticeData.numCellsX, 
                    numCellsY: latticeData.numCellsY, 
                    numCellsZ: latticeData.numCellsZ, 
                    a1: latticeData.a1, 
                    a2: latticeData.a2, 
                    a3: latticeData.a3 
                };
                renderLattice(renderData, shouldRenderFaces, latticeData.centeringType);
            }

            function updateBasisRenderer() {
                // If the previous tab was customSection, render the basis with the custom lattice size
                if (lastTabId === 'customSection') {
                    // Get custom lattice size values
                    const numCellsX = parseInt(customLengthXInput.value, 10);
                    const numCellsY = parseInt(customLengthYInput.value, 10);
                    const numCellsZ = parseInt(customLengthZInput.value, 10);
                    // We'll use the custom lattice parameters for the cell shape
                    const customParams = {
                        a: parseFloat(document.getElementById('customA').value),
                        b: parseFloat(document.getElementById('customB').value),
                        c: parseFloat(document.getElementById('customC').value),
                        alpha: parseFloat(document.getElementById('customAlpha').value),
                        beta: parseFloat(document.getElementById('customBeta').value),
                        gamma: parseFloat(document.getElementById('customGamma').value),
                        centeringType: document.getElementById('customCentering').value
                    };
                    // Generate lattice points for the custom lattice
                    const latticeData = generateLatticePoints(customParams, numCellsX, numCellsY, numCellsZ);
                    // Render the basis atoms at the origin cell only (as in the original basis view)
                    // But show the custom lattice grid
                    clearGroup(basisLatticeGroup);
                    basisLatticeGroup.add(basisAxesGroup);
                    // Draw the lattice grid
                    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xcccccc });
                    const lineGeometry = new THREE.BufferGeometry().setFromPoints(latticeData.lines);
                    const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
                    basisLatticeGroup.add(lineSegments);
                    // Draw the basis atoms in the first cell (as before)
                    const sphereGeometry = new THREE.SphereGeometry(0.05, 32, 32);
                    basis.forEach(atom => {
                        const sphereMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(atom.color) });
                        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                        sphere.position.copy(atom.position);
                        basisLatticeGroup.add(sphere);
                    });
                    renderBasisAtomsList();
                } else {
                    renderBasis();
                    renderBasisAtomsList();
                }
            }

            // Function to render the list of atoms in the Basis tab
            function renderBasisAtomsList() {
                basisAtomsList.innerHTML = ''; // Clear the list
                basis.forEach(atom => {
                    const li = document.createElement('li');
                    li.classList.add('basis-item');
                    li.dataset.id = atom.id;

                    const coords = `(${atom.position.x.toFixed(4)}, ${atom.position.y.toFixed(4)}, ${atom.position.z.toFixed(4)})`;
                    const colorCircle = `<div style="width:20px; height:20px; background-color:${atom.color}; border-radius:50%; border: 1px solid #555;"></div>`;

                    li.innerHTML = `
                        <div>
                            <p class="atom-coordinates">${coords}</p>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            ${colorCircle}
                            <button data-action="remove">Remove</button>
                        </div>
                    `;
                    basisAtomsList.appendChild(li);
                });
            }

            // Add new atom to the basis
            addAtomButton.addEventListener('click', () => {
                const x = parseFloat(document.getElementById('coordX').value);
                const y = parseFloat(document.getElementById('coordY').value);
                const z = parseFloat(document.getElementById('coordZ').value);
                const color = document.getElementById('atomColor').value;

                if (isNaN(x) || isNaN(y) || isNaN(z)) {
                    console.error("Invalid coordinates. Please enter numbers.");
                    return;
                }

                const newAtom = {
                    id: crypto.randomUUID(),
                    position: new THREE.Vector3(x, y, z),
                    color: color
                };

                basis.push(newAtom);
                
                // Update both renderers
                updateLatticeRenderer();
                updateBasisRenderer();

                // Reset color picker to a new random color for convenience
                // document.getElementById('atomColor').value = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
            });

            // Event delegation for removing atoms
            basisAtomsList.addEventListener('click', (event) => {
                const target = event.target;
                if (target.dataset.action === 'remove') {
                    const atomIdToRemove = target.closest('li').dataset.id;
                    basis = basis.filter(atom => atom.id !== atomIdToRemove);
                    
                    // Update both renderers
                    updateLatticeRenderer();
                    updateBasisRenderer();
                }
            });


            // Tab switching logic with previousTabId tracking
            let lastTabId = 'bravaisSection';
            const tabButtons = document.querySelectorAll('.menu-nav-button-container .menu-nav-button');
            const menuSections = document.querySelectorAll('.menu-section');
            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    // Set lastTabId to the current tab before changing tabs
                    lastTabId = document.querySelector('.menu-section.active')?.id;
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    menuSections.forEach(section => section.classList.remove('active'));
                    button.classList.add('active');
                    const targetId = button.dataset.target;
                    const targetSection = document.getElementById(targetId);
                    if (targetSection) {
                        targetSection.classList.add('active');
                    }

                    if (targetId === 'basisSection') {
                        currentScene = basisScene;
                        currentCamera = basisCamera;
                        updateBasisRenderer();
                    } else if (
                        targetId === 'directionsSection' ||
                        targetId === 'pointsSection' ||
                        targetId === 'planesSection'
                    ) {
                        // Do not change the scene or renderer, just show the tab
                        // This preserves the current scene (custom, basis, or normal lattice)
                    } else {
                        currentScene = scene;
                        currentCamera = camera;
                        updateLatticeRenderer();
                    }
                });
            });

            // Bravais lattice button selection logic
            const renderButtons = document.querySelectorAll('#bravaisSection .render-button');
            renderButtons.forEach(button => {
                button.addEventListener('click', () => {
                    if (!button.classList.contains('active')) {
                        renderButtons.forEach(btn => btn.classList.remove('active'));
                        button.classList.add('active');
                        updateLatticeRenderer();
                    }
                });
            });
            
            // Custom render button logic
            renderCustomButton.addEventListener('click', updateLatticeRenderer);

            // Unit cell input change logic
            const unitCellInputs = document.querySelectorAll('#unitCellSection input[type="number"]');
            unitCellInputs.forEach(input => {
                input.addEventListener('input', updateLatticeRenderer);
            });
            
            document.getElementById('showFacesToggle').addEventListener('change', updateLatticeRenderer);
            
            // Custom size inputs listener
            customLengthXInput.addEventListener('input', updateLatticeRenderer);
            customLengthYInput.addEventListener('input', updateLatticeRenderer);
            customLengthZInput.addEventListener('input', updateLatticeRenderer);
            document.getElementById('customA').addEventListener('input', updateLatticeRenderer);
            document.getElementById('customB').addEventListener('input', updateLatticeRenderer);
            document.getElementById('customC').addEventListener('input', updateLatticeRenderer);
            document.getElementById('customAlpha').addEventListener('input', updateLatticeRenderer);
            document.getElementById('customBeta').addEventListener('input', updateLatticeRenderer);
            document.getElementById('customGamma').addEventListener('input', updateLatticeRenderer);
            document.getElementById('customCentering').addEventListener('change', updateLatticeRenderer);


            function displayLatticeParams(latticeType, customParams = null) {
                const params = customParams || lattices[latticeType];
                let numCellsX, numCellsY, numCellsZ;
                
                // Determine which size inputs to use based on the active tab
                const activeSectionId = document.querySelector('.menu-section.active').id;
                if (activeSectionId === 'customSection') {
                    numCellsX = parseFloat(customLengthXInput.value);
                    numCellsY = parseFloat(customLengthYInput.value);
                    numCellsZ = parseFloat(customLengthZInput.value);
                } else {
                    numCellsX = parseFloat(document.getElementById('lengthX').value);
                    numCellsY = parseFloat(document.getElementById('lengthY').value);
                    numCellsZ = parseFloat(document.getElementById('lengthZ').value);
                }

                if (!params) {
                    latticeParamsDisplay.innerHTML = 'Lattice parameters not found.';
                    return;
                }

                latticeParamsDisplay.innerHTML = `
                    <h3>Lattice Parameters:</h3>
                    <p>Unit Cell: a = ${params.a}, b = ${params.b}, c = ${params.c}</p>
                    <p>Angles: &alpha; = ${params.alpha}&deg;, &beta; = ${params.beta}&deg;, &gamma; = ${params.gamma}&deg;</p>
                    <p>Lattice Size: ${numCellsX} x ${numCellsY} x ${numCellsZ} unit cells</p>
                    <p>Centering Type: ${params.centeringType}</p>
                `;
            }

            // --- Responsiveness ---
            window.addEventListener('resize', () => {
                const newWidth = rendererContainer.clientWidth;
                const newHeight = rendererContainer.clientHeight;
                camera.aspect = newWidth / newHeight;
                camera.updateProjectionMatrix();
                basisCamera.aspect = newWidth / newHeight;
                basisCamera.updateProjectionMatrix();
                renderer.setSize(newWidth, newHeight);
            });

            // --- Default Rendering ---
            updateLatticeRenderer();
            updateBasisRenderer();

            // --- Animation Loop ---
            function animate() {
                requestAnimationFrame(animate);
                renderer.render(currentScene, currentCamera);
            }

            animate();

            // Utility to convert fractional to cartesian using lattice parameters
function fractionalToCartesian(frac, a, b, c, alpha, beta, gamma) {
    // Convert angles to radians
    const alphaRad = alpha * Math.PI / 180;
    const betaRad = beta * Math.PI / 180;
    const gammaRad = gamma * Math.PI / 180;
    // Lattice vectors
    const ax = a;
    const ay = 0;
    const az = 0;
    const bx = b * Math.cos(gammaRad);
    const by = b * Math.sin(gammaRad);
    const bz = 0;
    const cx = c * Math.cos(betaRad);
    const cy = c * (Math.cos(alphaRad) - Math.cos(betaRad) * Math.cos(gammaRad)) / Math.sin(gammaRad);
    const cz = Math.sqrt(
        c * c
        - cx * cx
        - cy * cy
    );
    // Cartesian coordinates
    return {
        x: frac.x * ax + frac.y * bx + frac.z * cx,
        y: frac.x * ay + frac.y * by + frac.z * cy,
        z: frac.x * az + frac.y * bz + frac.z * cz
    };
}

const pointsDistanceDisplay = document.getElementById('pointsDistanceDisplay');
function updatePointsDistance() {
    if (points.length !== 2) {
        pointsDistanceDisplay.textContent = '';
        return;
    }
    // Get lattice parameters (custom if customSection is active, else from selected lattice)
    let a, b, c, alpha, beta, gamma;
    const activeSectionId = document.querySelector('.menu-section.active')?.id;
    if (activeSectionId === 'customSection') {
        a = parseFloat(document.getElementById('customA').value);
        b = parseFloat(document.getElementById('customB').value);
        c = parseFloat(document.getElementById('customC').value);
        alpha = parseFloat(document.getElementById('customAlpha').value);
        beta = parseFloat(document.getElementById('customBeta').value);
        gamma = parseFloat(document.getElementById('customGamma').value);
    } else {
        // Use selected lattice type
        const selectedLatticeType = getSelectedLatticeType();
        const params = lattices[selectedLatticeType];
        a = params.a;
        b = params.b;
        c = params.c;
        alpha = params.alpha;
        beta = params.beta;
        gamma = params.gamma;
    }
    // Metric tensor for the lattice
    const alphaRad = alpha * Math.PI / 180;
    const betaRad = beta * Math.PI / 180;
    const gammaRad = gamma * Math.PI / 180;
    const cosAlpha = Math.cos(alphaRad);
    const cosBeta = Math.cos(betaRad);
    const cosGamma = Math.cos(gammaRad);
    // Metric tensor G
    const G = [
        [a*a, a*b*cosGamma, a*c*cosBeta],
        [a*b*cosGamma, b*b, b*c*cosAlpha],
        [a*c*cosBeta, b*c*cosAlpha, c*c]
    ];
    // Difference vector in fractional coordinates
    const dx = points[0].x - points[1].x;
    const dy = points[0].y - points[1].y;
    const dz = points[0].z - points[1].z;
    // Distance squared: d^2 = v^T G v
    const d2 =
        dx*dx*G[0][0] + 2*dx*dy*G[0][1] + 2*dx*dz*G[0][2] +
        dy*dy*G[1][1] + 2*dy*dz*G[1][2] +
        dz*dz*G[2][2];
    const dist = Math.sqrt(Math.abs(d2));
    pointsDistanceDisplay.textContent = `Distance between points: ${dist.toFixed(4)} Å`;
}

// Attach listeners to all lattice parameter inputs to update distance automatically
{
    const ids = [
        'lengthX', 'lengthY', 'lengthZ',
        'showFacesToggle',
        'customA', 'customB', 'customC',
        'customAlpha', 'customBeta', 'customGamma', 'customCentering',
        'customLengthX', 'customLengthY', 'customLengthZ'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updatePointsDistance);
    });
}
// Bravais lattice type
const bravaisButtons = document.querySelectorAll('#bravaisSection .render-button');
bravaisButtons.forEach(btn => btn.addEventListener('click', updatePointsDistance));
        };
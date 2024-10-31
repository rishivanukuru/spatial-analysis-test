// Import necessary modules
// import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// import * as THREE from 'three';

async function loadMotionLog(file) {
    const response = await fetch(file);
    const text = await response.text();
    return text.trim().split('\n').map(line => {
        const [time, position, rotation] = line.split('#');
        const [x, y, z] = position.slice(1, -1).split(',').map(Number);
        const [qx, qy, qz, qw] = rotation.slice(1, -1).split(',').map(Number);
        return { time: parseInt(time), position: { x, y, z }, rotation: { x: qx, y: qy, z: qz, w: qw } };
    });
}

function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
}
n
// File paths for different groups
const groups = {
    group1: { model: 'Room2A.fbx', log1: 'Player-13B-20240522-transformlog-video-sampled.txt' },
    group2: { model: 'Room1A.fbx', log1: 'Player-13B-20240522-transformlog-spatial-sampled.txt', log2: 'Player-13A-20240522-transformlog-spatial-sampled.txt' },
    group3: { model: 'Room1A.fbx', log1: 'Player-14B-20240522-transformlog-video-sampled.txt' },
    group4: { model: 'Room2A.fbx', log1: 'Player-14B-20240522-transformlog-spatial-sampled.txt', log2: 'Player-14A-20240522-transformlog-spatial-sampled.txt' },
    group5: { model: 'Room1A.fbx', log1: 'Player-3B-20240506-transformlog-video-sampled.txt' },
    group6: { model: 'Room2A.fbx', log1: 'Player-3B-20240506-transformlog-spatial-sampled.txt', log2: 'Player-3A-20240506-transformlog-spatial-sampled.txt' },
    group7: { model: 'Room2A.fbx', log1: 'Player-12B-20240522-transformlog-video-sampled.txt' },
    group8: { model: 'Room1A.fbx', log1: 'Player-12B-20240522-transformlog-spatial-sampled.txt', log2: 'Player-12A-20240522-transformlog-spatial-sampled.txt' },
};

// Initialize scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('container').appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 20);
scene.add(ambientLight);

// Camera positioning
camera.position.set(0, 2, 5);
camera.lookAt(0, 1, 0);

// Create phone1 and phone2 as pyramids
const phone1Material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const phone2Material = new THREE.MeshBasicMaterial({ color: 0x0000ff });
const phone1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
// const phone1 = new THREE.Mesh(combinedGeometry1, new THREE.MeshBasicMaterial({ color: 0xff0000 }));

const phone2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0x0000ff }));
// const phone2 = new THREE.Mesh(combinedGeometry2, new THREE.MeshBasicMaterial({ color: 0x0000ff }));


phone1.rotation.x = Math.PI / 2;
phone2.rotation.x = Math.PI / 2;
scene.add(phone1); // Add phone1 by default

let phone1Log = [], phone2Log = null, roomModel = null;
let currentTime = 0;
let play = false;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
controls.minDistance = 1;
controls.maxDistance = 10;
controls.maxPolarAngle = Math.PI / 2;

// Load the selected group
function loadGroup(group) {
    // Remove the previous room model
    if (roomModel) {
        scene.remove(roomModel);
    }
    phone1Log = [];
    phone2Log = null; // Reset phone2 log to handle single phone case
    currentTime = 0;
    document.getElementById('seekBar').value = 0;
    document.getElementById('currentTimeDisplay').textContent = formatTime(currentTime);
    document.getElementById('playPauseBtn').innerText = 'Play';
    play = false;

    const { model, log1, log2 } = groups[group];
    
    // Load the room model
    const loader = new FBXLoader();
    loader.load(model, (object) => {
        roomModel = object;
        //roomModel.rotation.y = Math.PI;
        scene.add(roomModel);
    }, undefined, (error) => {
        console.error(error);
    });
    
    // Load the motion logs
    loadMotionLog(log1).then(log1Data => {
        phone1Log = log1Data;
        
        // If log2 exists, load it; otherwise, hide phone2
        if (log2) {
            loadMotionLog(log2).then(log2Data => {
                phone2Log = log2Data;
                scene.add(phone2); // Add phone2 if log2 is available
                updateSeekBarMax();
            });
        } else {
            scene.remove(phone2); // Remove phone2 if there's no log2
            updateSeekBarMax();
        }
    });
}

// Update the seek bar's maximum based on the logs
function updateSeekBarMax() {
    const log1EndTime = phone1Log[phone1Log.length - 1].time;
    const log2EndTime = phone2Log ? phone2Log[phone2Log.length - 1].time : log1EndTime;
    const totalDuration = Math.max(log1EndTime, log2EndTime);

    document.getElementById('seekBar').max = 360;
}

document.getElementById('groupSelector').addEventListener('change', (e) => {
    loadGroup(e.target.value);
});

// Play and Pause functionality
document.getElementById('playPauseBtn').addEventListener('click', () => {
    play = !play;
    document.getElementById('playPauseBtn').innerText = play ? 'Pause' : 'Play';
});

// Seek Bar Update
document.getElementById('seekBar').addEventListener('input', (e) => {
    currentTime = parseFloat(e.target.value);
    updatePhonePosition(phone1, phone1Log, currentTime);
    if (phone2Log) {
        updatePhonePosition(phone2, phone2Log, currentTime);
    }
    document.getElementById('currentTimeDisplay').textContent = formatTime(currentTime); // Update display
});

function updateSeekBar() {
    document.getElementById('seekBar').value = Math.floor(currentTime);
    document.getElementById('currentTimeDisplay').textContent = formatTime(currentTime);
}

// Position and animate phones
function updatePhonePosition(phone, log, time) {
    // Ensure the log has data and time index is within bounds
    if (!log || log.length === 0) return;
    
    const index = Math.floor(time);
    if (index >= log.length - 1) return; // Avoid out-of-bounds access
    
    const nextIndex = Math.min(index + 1, log.length - 1);
    const factor = time % 1;

    // Interpolate position and rotation if the log entries exist
    if (log[index] && log[nextIndex]) {
        phone.position.lerpVectors(log[index].position, log[nextIndex].position, factor);
        phone.quaternion.slerpQuaternions(
            new THREE.Quaternion(log[index].rotation.x, log[index].rotation.y, log[index].rotation.z, log[index].rotation.w),
            new THREE.Quaternion(log[nextIndex].rotation.x, log[nextIndex].rotation.y, log[nextIndex].rotation.z, log[nextIndex].rotation.w),
            factor
        );
    }
}


function animate() {
    requestAnimationFrame(animate);
    
    if (play) {
        currentTime += 0.016;
        const log1Length = phone1Log ? phone1Log.length : 0;
        const log2Length = phone2Log ? phone2Log.length : 0;
        
        if (Math.floor(currentTime) >= Math.max(log1Length, log2Length)) {
            play = false;
            document.getElementById('playPauseBtn').innerText = 'Play';
        }
        
        if (log1Length > 0) updatePhonePosition(phone1, phone1Log, currentTime);
        if (log2Length > 0) updatePhonePosition(phone2, phone2Log, currentTime);
        
        updateSeekBar();
    }
    
    controls.update();
    renderer.render(scene, camera);
}


// Initial load for the first group
loadGroup('group1');
animate();

console.log("SCRIPT LOADED SUCCESSFULLY");

const video = document.getElementById('video');
const overlayCanvas = document.getElementById('overlayCanvas');
const statusEl = document.getElementById('status');
const ctx = overlayCanvas.getContext('2d');

let modelsLoaded = false;

// Use the public weights for face-api.js models
const MODEL_URL = 'https://cdn.jsdelivr.net/gh/cgarciagl/face-api.js@0.22.2/weights';

// 1. Load models
async function loadModels() {
    statusEl.textContent = 'Loading models...';

    try {
        console.log("Loading TINY FACE DETECTOR...");
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        console.log("TinyFaceDetector ✔");

        console.log("Loading LANDMARK MODEL...");
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        console.log("Landmark ✔");

        console.log("Loading RECOGNITION MODEL...");
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        console.log("Recognition ✔");

        console.log("Loading EXPRESSION MODEL...");
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        console.log("Expression ✔");

        console.log("Loading AGE/GENDER MODEL...");
        await faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL);
        console.log("AgeGender ✔");

        statusEl.textContent = "Models loaded. Starting webcam...";
        modelsLoaded = true;
        startWebcam();

    } catch (error) {
        console.error("MODEL LOAD ERROR:", error);
    }
}


// 2. Start webcam
async function startWebcam() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        statusEl.textContent = 'getUserMedia is not supported in this browser.';
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' }
        });

        video.srcObject = stream;

        video.onloadedmetadata = () => {
            video.play();
            overlayCanvas.width = video.videoWidth;
            overlayCanvas.height = video.videoHeight;
            statusEl.textContent = 'Webcam active. Detecting faces...';
            startDetection();
        };
    } catch (error) {
        console.error('Error accessing webcam:', error);
        statusEl.textContent =
            `Error accessing webcam: ${error.message}. ` +
            'Make sure you allowed camera access and are using https/localhost.';
    }
}

// 3. Detection loop (manual drawing)
function startDetection() {
    if (!modelsLoaded) {
        setTimeout(startDetection, 100);
        return;
    }

    const detect = async () => {
      console.log("Detect loop running...");

        const displaySize = {
            width: video.videoWidth,
            height: video.videoHeight
        };

        // Make sure canvas matches video size
        faceapi.matchDimensions(overlayCanvas, displaySize);

        const detections = await faceapi
            .detectAllFaces(
                video,
                new faceapi.TinyFaceDetectorOptions({
                    inputSize: 320,
                    scoreThreshold: 0.4
                })
            )
            .withAgeAndGender()
            .withFaceExpressions();

        // Update text so we see how many faces
        statusEl.textContent = `Detecting faces... found ${detections.length}`;

        // Clear canvas
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        // TEST DRAWING
ctx.fillStyle = "red";
ctx.fillRect(50, 50, 100, 100);


        // Scale results to the display size
        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        resizedDetections.forEach(det => {
    const box = det.detection.box;

    // Draw green box
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 4;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    // Draw label
    const age = Math.round(det.age);
    const gender = det.gender;
    const expr = Object.entries(det.expressions)
        .sort((a, b) => b[1] - a[1])[0][0];

    ctx.fillStyle = "yellow";
    ctx.font = "18px Arial";
    ctx.fillText(`Age: ${age} | Gender: ${gender} | Expr: ${expr}`, box.x, box.y - 10);
});



        // Loop
        requestAnimationFrame(detect);
    };

    detect();
}

// 4. Start everything
loadModels();

(() => {
  'use strict';
  let landmarkerPromise;

  async function getLandmarker() {
    if (!landmarkerPromise) {
      landmarkerPromise = (async () => {
        const { FilesetResolver, HandLandmarker } = await import('/static/vendor/mediapipe/vision_bundle.mjs');
        const vision = await FilesetResolver.forVisionTasks('/static/vendor/mediapipe/wasm');
        return HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: '/static/models/hand_landmarker.task', delegate: 'CPU' },
          runningMode: 'IMAGE', numHands: 2, minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55, minTrackingConfidence: 0.5
        });
      })();
    }
    return landmarkerPromise;
  }

  async function detect(image) {
    const landmarker = await getLandmarker();
    const result = landmarker.detect(image);
    const hands = result.landmarks || [];
    if (!hands.length) return { status: 'no-hand', landmarks: null };
    if (hands.length > 1) return { status: 'multiple-hands', landmarks: null };
    return { status: 'detected', landmarks: hands[0] };
  }

  window.MoneyFlowPalmHandDetector = { detect };
})();

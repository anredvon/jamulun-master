# MediaPipe Tasks Vision web assets

- Package: `@mediapipe/tasks-vision` 1.2.0
- License: Apache-2.0; see `LICENSE-2.0.txt`.
- Official package: https://www.npmjs.com/package/@mediapipe/tasks-vision
- Hand landmark model: `static/models/hand_landmarker.task`
- Model card/license: https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Hand%20Tracking%20%28Lite_Full%29%20with%20Fairness%20Oct%202021.pdf

The WebAssembly runtime, model, and image processing run in the browser. The hand photo is not sent to Google or the MoneyFlow server. The upstream model card describes the hand-landmarker model as experimental and not validated for all in-the-wild camera conditions; MoneyFlow must give retake/uncertain results rather than advertise guaranteed detection accuracy.

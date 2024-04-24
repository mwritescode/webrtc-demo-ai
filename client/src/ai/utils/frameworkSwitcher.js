import { createFaceLandmarkerMediapipe, createSelfieSegmenterMediapipe } from "../mediapipe";
import { createSelfieSegmenterTF } from "../tfjs";
import { createSelfieSegmenterONNX } from "../onnx";

const createSelfieSegmenter = (() => {
  let models = {};

  return async (framework) => {
    if (!models[framework]) {
      switch (framework) {
        case "mediapipe":
          models[framework] = await createSelfieSegmenterMediapipe("GPU");
          break;
        case "tfjs":
          models[framework] = await createSelfieSegmenterTF();
          break;
        case "onnx":
          models[framework] = await createSelfieSegmenterONNX();
          break;
        default:
          console.error("Invalid framework:", framework);
      }
    }

    return models[framework];
  };
})();

const createFaceLandmarker = (() => {
  let models = {};

  return async (framework) => {
    if (!models[framework] && framework === "mediapipe") {
      models[framework] = await createFaceLandmarkerMediapipe("GPU");
    }

    return models["mediapipe"];
  }
})();

export {createSelfieSegmenter, createFaceLandmarker};
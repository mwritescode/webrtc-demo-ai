import { FaceLandmarker, ImageSegmenter, FilesetResolver }  from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
import { maskToImageData } from "./utils/postprocess";

class FaceLandmarkerMediapipe {
  constructor() {
    this.model = null;
  }

  async loadModel() {
    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );

    const model = await FaceLandmarker.createFromOptions(
      filesetResolver,
      {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        outputFaceBlendshapes: true,
        runningMode: "IMAGE",
        numFaces: 1,
      }
    );
    this.model = model;
  }

  async detect(imageData) {
    const results = await this.model.detect(imageData);
    const landmarks = results.faceLandmarks;
    return landmarks;
  }
}

class SelfieSegmenterMediapipe {
  constructor() {
    this.model = null;
  }

  async loadModel() {
    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );

    const model = await ImageSegmenter.createFromOptions(
      filesetResolver,
      {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
          delegate: "GPU",
        },
        runningMode: "IMAGE",
      }
    );
    this.model = model;
  }

  async segment(imageData) {
    const results = await this.model.segment(imageData);

    const width = imageData.videoWidth;
    const height = imageData.videoHeight;
    const mask = results.confidenceMasks[0].getAsFloat32Array();
    results.confidenceMasks[0].close(); // Note: this might not be necessary if we close the whole results object below
    results.close();

    // Reshape the 1D mask to an RGBA image
    const maskImageData = maskToImageData(mask, width, height);

    return maskImageData;
  }
}

const createFaceLandmarkerMediapipe = async () => {
  try {
    const faceLandmarker = new FaceLandmarkerMediapipe();
    await faceLandmarker.loadModel();
    console.log("Mediapipe FaceLandmarker loaded!");

    return faceLandmarker;
  } catch (error) {
    console.error("Error creating FaceLandmarker:", error);

    return null;
  }
};

const createSelfieSegmenterMediapipe = async () => {
  try {
    const selfieSegmenter = new SelfieSegmenterMediapipe();
    await selfieSegmenter.loadModel();
    console.log("Mediapipe Selfie segmenter loaded!");

    return selfieSegmenter;
  } catch (error) {
    console.error("Error creating SelfieSegmenter:", error);

    return null;
  }
}

export {createSelfieSegmenterMediapipe, createFaceLandmarkerMediapipe};

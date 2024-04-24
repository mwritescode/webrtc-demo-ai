import * as tf from '@tensorflow/tfjs';
import {InferenceSession, Tensor, env} from 'onnxruntime-web';
import { resizeSegmentationMask, maskToImageData } from './utils/postprocess';

// Set the WebAssembly binary file path for ONNX Runtime Web
env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@dev/dist/';

const createSelfieSegmenterONNX = async () => {
  try {
    const selfieSegmenter = new SelfieSegmenterONNX();
    await selfieSegmenter.loadModel();
    console.log("ONNX Selfie segmenter loaded!");

    return selfieSegmenter;
  } catch (error) {
    console.error("Error creating ONNX SelfieSegmenter:", error);

    return null;
  }
};

// Class for the selfie segmentation model
class SelfieSegmenterONNX {
  constructor() {
    this.session = null;
    this.inputSize = 256;
  }

  async loadModel() {

    // NOTE: webgl produces incorrect results for this model and apparently that's pretty common
    // (See: https://github.com/xenova/transformers.js/issues/505) couldn't get WebGPU to work
    // so using wasm backend for now
    const session = await InferenceSession.create(
      'models/selfie_segmenter.onnx', 
      { executionProviders: ['wasm']});

    this.session = session;
  }

  async segment(imageData) {
    const preprocessedData = tf.tidy(() => {
      // Preprocess the image data
      const tensor = tf.browser.fromPixels(imageData);
      const resized = tf.image.resizeBilinear(tensor, [this.inputSize, this.inputSize]);
      const expanded = resized.expandDims(0);
      const preprocessed = expanded.toFloat().div(255.0);

      return preprocessed;
    });

    const inputName = this.session.inputNames[0];
    const outputName = this.session.outputNames[0];

    const onnxTensor = toONNX(preprocessedData);
    const outputTensor = await this.session.run({ [inputName]: onnxTensor });
    const maskTF = await toTensorflow(outputTensor[outputName]);

    const outputMask = tf.tidy(() => {
      const postprocessedMask = resizeSegmentationMask(
        maskTF,
        imageData.videoWidth,
        imageData.videoHeight
      );

      return postprocessedMask;
    });

    const maskData = outputMask.dataSync();
    outputMask.dispose();

    const maskImageData = maskToImageData(maskData, imageData.videoWidth, imageData.videoHeight);

    return maskImageData;
  }
}

/* Utility functions to convert between TensorFlow.js 
tensors and ONNX Runtime tensors - needed for interoperability because
ONNX runtime does not provide many tensor manipulation functions
*/

const toONNX = (tensor) => {
  // Convert TensorFlow.js tensor to ONNX Runtime tensor
  const data = tensor.dataSync();
  tensor.dispose();
  return new Tensor('float32', data, tensor.shape);
}

const toTensorflow = async (tensor) => {
  // Convert ONNX Runtime tensor to TensorFlow.js tensor
  const data = await tensor.getData();
  const dataDim = Math.sqrt(data.length);
  tensor.dispose();
  return tf.tensor(data, [1, dataDim, dataDim, 1]);
}

export { createSelfieSegmenterONNX };
import * as tf from '@tensorflow/tfjs';
import { resizeSegmentationMask, maskToImageData } from './utils/postprocess';

tf.setBackend('webgl').catch(console.warn);

const createSelfieSegmenterTF = async () => {
  try {
    const selfieSegmenter = new selfieSegmenterTF();
    await selfieSegmenter.loadModels();
    console.log('Tensorflow.js selfie segmenter loaded!');
    return selfieSegmenter;
  } catch (error) {
    console.error("Error creating TFJS SelfieSegmenter:", error);
    return null;
  }
}

// Class for the selfie segmentation model
class selfieSegmenterTF {
  constructor() {
    this.model = null;
    this.inputSize = 256;
  }

  async loadModels() {
    this.model = await tf.loadGraphModel('models/selfie_segmenter/model.json');
  }

  async segment(imageData) {
    const mask = tf.tidy(() => {
      // Preprocess the image data
      const tensor = tf.browser.fromPixels(imageData);
      const resized = tf.image.resizeBilinear(tensor, [this.inputSize, this.inputSize]);
      const expanded = resized.expandDims(0);
      const preprocessed = expanded.toFloat().div(255.0);

      // Perform inference
      const segmentationTensor =
            // Slice activation output only.
            tf.slice(
                this.model.predict(preprocessed),
                [0, 0, 0, 1], -1
            );

      // Postprocess the prediction
      const postprocessedMask = resizeSegmentationMask(
        segmentationTensor,
        tensor.shape[1],
        tensor.shape[0]
      );

      return postprocessedMask;
    });

    const maskData = mask.dataSync();
    mask.dispose();

    const maskImageData = maskToImageData(maskData, imageData.videoWidth, imageData.videoHeight);

    return maskImageData;
  }
}

export { createSelfieSegmenterTF };
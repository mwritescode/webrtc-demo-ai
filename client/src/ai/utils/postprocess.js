import * as tf from '@tensorflow/tfjs';

function resizeSegmentationMask(segmentationTensor, outputWidth, outputHeight) {
  return tf.tidy(() => {
    // Remove batch dimension.
    const $segmentationTensor = tf.squeeze(segmentationTensor, [0]);

    const tensorChannels = $segmentationTensor.shape[2];
    // Process mask tensor and apply activation function.
    if (tensorChannels === 1) {
      // Create initial working mask.
      let smallMaskMat = $segmentationTensor;

      const outputMat = tf.image.resizeBilinear(
        smallMaskMat, [outputHeight, outputWidth]
      );

      // Remove channel dimension.
      return tf.squeeze(outputMat, [2]).flatten();

    } else {
      throw new Error(
        `Unsupported number of tensor channels ${tensorChannels}`);
    }
  });
}

function maskToImageData(mask, width, height) {
  // Reshape the 1D mask to an RGBA image
  const maskData = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const j = i * 4;
    maskData[j] = 0;
    maskData[j + 1] = 0;
    maskData[j + 2] = 0;
    maskData[j + 3] = Math.round(mask[i] * 255);
  }

  return new ImageData(maskData, width, height);
}

export { resizeSegmentationMask, maskToImageData };
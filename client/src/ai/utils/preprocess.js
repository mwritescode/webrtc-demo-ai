import * as tf from '@tensorflow/tfjs';

function resizeWithAspectRatio(image, targetWidth, targetHeight) {
  const [resizedImage, padding] = tf.tidy(() => {
    const [originalHeight, originalWidth] = image.shape;
    const aspectRatio = originalWidth / originalHeight;

    let newWidth = targetWidth;
    let newHeight = targetHeight;

    // Calculate new dimensions while maintaining aspect ratio
    if (targetWidth / targetHeight > aspectRatio) {
      newWidth = Math.round(targetHeight * aspectRatio);
    } else {
      newHeight = Math.round(targetWidth / aspectRatio);
    }

    // Resize image while maintaining aspect ratio
    const resizedImage = tf.image.resizeBilinear(image, [newHeight, newWidth]);

    // Calculate padding
    const topPad = Math.floor((targetHeight - newHeight) / 2);
    const bottomPad = targetHeight - newHeight - topPad;
    const leftPad = Math.floor((targetWidth - newWidth) / 2);
    const rightPad = targetWidth - newWidth - leftPad;

    // Pad the image
    const paddedImage = tf.pad3d(resizedImage, [[topPad, bottomPad], [leftPad, rightPad], [0, 0]]);

    return [paddedImage, [topPad, bottomPad, leftPad, rightPad]];
});
  return [resizedImage, padding];
}

export { resizeWithAspectRatio };
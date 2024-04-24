import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
const { FaceLandmarker, DrawingUtils } = vision;
  
const drawFaceLandmarks = (canvasCtx, faceLandmarks) => {
  const drawingUtils = new DrawingUtils(canvasCtx);
  if (faceLandmarks) {
    for (const landmarks of faceLandmarks) {
      // First draw the face tasselation with a thinner line width.
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_TESSELATION,
          { color: "#C0C0C070", lineWidth: 1 }
      );

      // Draw eyes and eyebrows with different colors.
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
          { color: "#FF3030" }
      );
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
          { color: "#FF3030" }
      );
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
          { color: "#30FF30" }
      );
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
          { color: "#30FF30" }
      );

      // Draw the remaining face landmarks in light grey.
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
          { color: "#E0E0E0" }
      );
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_LIPS,
          { color: "#E0E0E0" }
      );
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
          { color: "#FF3030" }
      );
      drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
          { color: "#30FF30" }
      );
    }
  }
};

const drawSegmentationResult = (canvasElement, canvasCtx, segmentationMask, videoElement) => {
  // Here mask is an RGBA image with 0 values in the RGB channels and values in [0, 255] 
  // in the alpha channel. We can use it to mask the video frame.

  canvasCtx.putImageData(segmentationMask, 0, 0);

  // We use the mask for a composite operation. 
  canvasCtx.globalCompositeOperation = "source-in";
  canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.globalCompositeOperation = "destination-over";
  canvasCtx.fillStyle = 'rgba(0, 255, 0, 1)'; // Green
  canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

  // Reset the globalCompositeOperation to its default value
  canvasCtx.globalCompositeOperation = "source-over";
}
 
export { drawFaceLandmarks, drawSegmentationResult };
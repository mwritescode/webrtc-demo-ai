# WebRTC Demo

This project is a simple WebRTC demo that establishes a direct P2P WebRTC connection between two clients to exchange video streams. It consists of two parts:

- [WebRTC client](client/): A simple WebRTC client written in React. It connects to the [signalling server](server/) via WebSocket to broadcast its availability. When two clients are available, they establish a direct P2P WebRTC connection to exchange video streams.
- [WebRTC server](server/): A very simple WebRTC signalling server in NodeJS. It accepts WebSocket connections from [clients](client/) and broadcasts their availability to other clients. When two clients are available, they establish a direct P2P WebRTC connection to exchange video streams.

You can find more details in the README files of each part, and in [this Notion page](https://www.notion.so/bendingspoons/WebRTC-07cb99c4a579450dbe441db77ac434b4?pvs=4).

## 🤖 AI Features

The two supported models in this demo are [FaceMesh](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf) and [SelfieSegmenter](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Selfie%20Segmentation.pdf) from the MediaPipe team. 
- Conversion from the original TFLite format to ONNX was done through [tf2onnx](https://github.com/onnx/tensorflow-onnx).
- Conversion from ONNX to TensorFlow.js format was done through a combination of [onnx2tf](https://github.com/PINTO0309/onnx2tf) and [tensorflowjs-cnverter](https://github.com/tensorflow/tfjs/tree/master/tfjs-converter).

All models run on GPU with the exception of the `onnxruntime-web` segmenter, which had quality-related issues.

**Disclaimer:** not a JS expert at all so I'm pretty sure the integration of the features in the app could be optimized. A couple of known possibilities:
- Using [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) for the AI models so that we don't block the main thread.
- [Insertable Streams](https://developer.mozilla.org/en-US/docs/Web/API/Insertable_Streams_for_MediaStreamTrack_API) could be used instead of the `Canvas` to modify and display the camera stream, tho I'm not sure how widely supported they are.

## 🌐 Making this work across networks

This demo works out of the box on localhost.

If you want to make it work across different machines on the same network, you simply need to change the WebSocketServer URL in the client to point to the IP address of the machine running the server.

Making this work across the internet is much more difficult, because of NATs and firewalls. You would need to use a STUN/TURN server to relay the WebRTC traffic. You can read more about such sorcery [here](https://temasys.io/guides/developers/webrtc-ice-sorcery/).

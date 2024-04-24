import React, { useEffect, useCallback } from "react";
import {  Button, Typography, Space, Select, Radio, message  } from "antd";
import "./App.css";
import { v4 as uuid } from "uuid";
import {drawFaceLandmarks, drawSegmentationResult} from "./ai/utils/drawing";
import { createFaceLandmarker, createSelfieSegmenter } from "./ai/utils/frameworkSwitcher";

// LD: A good web SWE would be able to integrate these variables into the React lifecycle.
// I am not a good web SWE.
let localStream = undefined; // The local video stream from the user's camera.
let localPeerConnection = undefined; // The WebRTC peer connection with the other client.

// Logging utility that adds the current timestamp to the log message.
const log = (message) => {
  console.log(`${new Date().toISOString()} - ${message}`);
};

const radioOptions= [
  { label: 'MediaPipe', value: 'mediapipe' },
  { label: 'TensorFlow.js', value: 'tfjs' },
  { label: 'ONNX', value: 'onnx'},
];

function App() {
  const [connectButtonDisabled, setConnectButtonDisabled] =
    React.useState(false);
  const [userId, setUserId] = React.useState("");
  const ws = React.useRef(null);

  const localVideoElementRef = React.useRef(null);
  const localCanvasElementRef = React.useRef(null);
  const localCanvasCtxRef = React.useRef(null);

  const [frameworkAI, setFrameworkAI] = React.useState("mediapipe");
  const [selfieSegmenter, setSelfieSegmenter] = React.useState(null);
  const [faceLandmarker, setFaceLandmarker] = React.useState(null);

  // The ref is needed because requestAnimationFrame is asynchoronous, which means it 
  // might not run until after the useEffect hook has finished. If the filterType state
  // changes in the meantime, the callback will still use the old filterType state.
  const [filterType, setFilterType] = React.useState("none");
  const filterTypeRef = React.useRef(filterType);

  const handleFilterChange = (value) => {
    setFilterType(value);
    console.log(`Filter changed to ${value}`);
  };
  
  const handleFrameworkChange = ({target: {value}}) => {
    setFrameworkAI(value);
    console.log(`AI framework changed to ${value}`);
  };

  const predictFaceLandmarks = useCallback(
    async (canvasElement) => {
      const startTime = performance.now();
      const landmarks = await faceLandmarker.detect(canvasElement);
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      const fps = 1000 / executionTime;
      return [landmarks, fps];
    },
    [faceLandmarker]
  );

  const predictSegmentation = useCallback(
    async (canvasElement) => {
      const startTime = performance.now();
      const results = await selfieSegmenter.segment(canvasElement);
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      const fps = 1000 / executionTime;
      return [results, fps];
    },
    [selfieSegmenter]
  );

  const updateSpeedStats = (currentSpeed) => {
    const statsText = document.getElementById("speedStats");
    if (currentSpeed) {
      statsText.textContent = `Speed: ${Math.round(currentSpeed)} FPS`;
    } else {
      statsText.textContent = "Activate a filter to view speed stats";
    }
  }

  const applyFiltersOnCanvas = useCallback(
    async () => {
      let faceLandmarks = null;
      let segmentationMask = null;
      let speedStats = null;

      const canvasElement = localCanvasElementRef.current;
      const canvasCtx = localCanvasCtxRef.current;

      // Clear the canvas
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

      // Update the canvas depending on the filter type
      switch (filterTypeRef.current) {
        case "mesh":
          [faceLandmarks, speedStats] = await predictFaceLandmarks(localVideoElementRef.current);
          canvasCtx.drawImage(localVideoElementRef.current, 0, 0, canvasElement.width, canvasElement.height);
          drawFaceLandmarks(canvasCtx, faceLandmarks);
          break;
        case "bg":
          [segmentationMask, speedStats] = await predictSegmentation(localVideoElementRef.current);
          drawSegmentationResult(canvasElement, canvasCtx, segmentationMask, localVideoElementRef.current);
          break;
        default:
          canvasCtx.drawImage(localVideoElementRef.current, 0, 0, canvasElement.width, canvasElement.height);
          break;
      }

      updateSpeedStats(speedStats);

      // Schedule the next call to applyFilterAndDraw
      if (filterTypeRef.current !== 'none') {
        requestAnimationFrame(async () => await applyFiltersOnCanvas());
      }
    },
    [predictFaceLandmarks, predictSegmentation]
  );

  // This function sets up the device to be used for the call and adds the video to the DOM.
  const setupLocalStream = async () => {
    try {
      // Most of the magic is done by `getUserMedia`.
      // You can learn more [here](https://developer.mozilla.org/en-US/docs/Web/API/Media_Capture_and_Streams_API).
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      const localVideo = document.createElement("video");
      localVideo.srcObject = stream;
      localVideo.autoplay = true;

      // Set the ref's current value to the video element
      localVideoElementRef.current = localVideo;
      localCanvasElementRef.current = document.getElementById("localPlayer");
      localCanvasCtxRef.current = localCanvasElementRef.current.getContext("2d");

      localVideo.addEventListener("loadedmetadata", () => {

        // Set the pixel dimensions of the canvas to match the video size
        localCanvasElementRef.current.width = localVideo.videoWidth;
        localCanvasElementRef.current.height = localVideo.videoHeight;
        const localCanvas = localCanvasElementRef.current;
        const canvasCtx = localCanvasCtxRef.current;

        const drawVideo = () => {
          if (localVideo.readyState === localVideo.HAVE_ENOUGH_DATA) {
            // Clear the canvas and then draw the video on it
            canvasCtx.clearRect(0, 0, localCanvas.width, localCanvas.height);
            canvasCtx.drawImage(localVideo, 0, 0);
          }
  
          requestAnimationFrame(drawVideo);
        };
  
        requestAnimationFrame(drawVideo);
        localStream = localCanvas.captureStream(30);
      });

      log("Local stream set up");

    } catch (error) {
      console.error("Error setting up local stream:", error);
    }
  };

  // Utility to send stringified messages to the WebSocket server.
  const sendWsMessage = (type, body) => {
    ws.current.send(JSON.stringify({ type, body }));
  };

  // This function is called when the "Connect" button is clicked.
  const startConnection = async () => {
    // User the WebRTC API to setup a new peer connection.
    localPeerConnection = new RTCPeerConnection();

    // This callback has a scary name because ICE is a complex topic. In this case, it's
    // called when we call `setLocalDescription(offer)` on this peer connection.
    localPeerConnection.onicecandidate = (event) => {
      log("On ICE Candidate invoked");
      if (!event.candidate) {
        const offer = localPeerConnection.localDescription;
        log("Sending offer");
        sendWsMessage("send_offer", {
          userId,
          sdp: offer,
        });
      }
    };

    localPeerConnection.onaddstream = addRemoteStreamToDom;

    // Make our local stream available to the peer connection.
    localStream.getTracks().forEach((track) => {
      localPeerConnection.addTrack(track, localStream);
    });

    // Generate the offer to send to the signalling server.
    const offer = await localPeerConnection.createOffer();
    await localPeerConnection.setLocalDescription(offer);

    setConnectButtonDisabled(true);
  };

  // This logic is run when the client receives an offer from another client.
  // It happens when this client has already sent an offer to the signalling server, and
  // a second client then connects and sends its offer.
  const receiveOfferAndSendAnswer = useCallback(
    async (offer) => {
      log("Offer received");

      // We're reusing the localPeerConnection we created when clicking the `Connect` button,
      // but we're setting up a new event handler for ICE candidates.
      // In this case, the function will run when we call `setLocalDescription(answer)` on this peer connection.
      // When that happens, we want to send our answer to the signalling server.
      localPeerConnection.onicecandidate = (event) => {
        log("On ICE Candidate invoked");
        if (!event.candidate) {
          const answer = localPeerConnection.localDescription;
          log("Sending answer");
          sendWsMessage("send_answer", {
            userId,
            sdp: answer,
          });
        }
      };

      // Generate the answer to the offer.
      await localPeerConnection.setRemoteDescription(offer);
      const answer = await localPeerConnection.createAnswer();
      await localPeerConnection.setLocalDescription(answer);
    },
    [userId]
  );

  const addRemoteStreamToDom = (event) => {
    log("My peer has added a stream. Adding to DOM.");
    const remotePlayer = document.getElementById("peerPlayer");
    remotePlayer.srcObject = event.stream;
  };

  // Set up the WebSocket connection with the signalling server.
  // This is only used to send and receive SDP messages, which are
  // the offers and answers that are used to establish the WebRTC connection.
  useEffect(() => {
    log("Setting up WebSocket connection");
    const url = "ws://localhost:8090";
    const wsClient = new WebSocket(url);
    ws.current = wsClient;

    wsClient.onopen = () => {
      log(`WebSocket connected to signalling server at ${url}`);
      setUserId(uuid());
      setupLocalStream();
    };
  }, []);

  // Update the ref whenever filterType changes
  useEffect(() => {
    filterTypeRef.current = filterType;
  }, [filterType]);

  // Warn the user if they try to use the face mesh filter with a framework other than Mediapipe.
  useEffect(() => {
    if (frameworkAI !== "mediapipe" && filterType === "mesh") {
      message.warning('Face mesh only supports Mediapipe at the moment, falling back on that.');
    }
  }, [frameworkAI, filterType]);

  // Initialize the models when the component mounts. It should
  // rerun every time we change the framework we are working with.
  useEffect(() => {
    const initializeModels = async () => {
      const landmarker = await createFaceLandmarker(frameworkAI);
      const segmenter = await createSelfieSegmenter(frameworkAI);
      setFaceLandmarker(landmarker);
      setSelfieSegmenter(segmenter);
    };

    initializeModels();      
  }, [frameworkAI]);

  // Checks whether the filter should be applied and calls the applyFiltersOnCanvas function.
  useEffect(() => {
    async function applyFilter() {
      if (filterType !== 'none' && faceLandmarker && selfieSegmenter) {
        await applyFiltersOnCanvas();
      }
    }
    applyFilter();
  }, [filterType, faceLandmarker, selfieSegmenter, applyFiltersOnCanvas]);

  useEffect(() => {
    ws.current.onmessage = (event) => {
      const { type, body } = JSON.parse(event.data);
      switch (type) {
        case "offer_sdp_received":
          log("offer_sdp_received event received from signalling server");
          receiveOfferAndSendAnswer(body);
          break;
        case "answer_sdp_received":
          log("answer_sdp_received event received from signalling server");
          localPeerConnection?.setRemoteDescription(body);
          break;
        default:
          console.error("Unknown message type", type, body);
      }
    };
  }, [receiveOfferAndSendAnswer, userId, ws]);

  return (
    <div className="App">
      <div className="App-header">
        <Typography.Title>WebRTC</Typography.Title>
        <div className="wrapper-row">
          <div className="wrapper">
            <Typography.Text>ID: {userId}</Typography.Text>
            <Button
              style={{ width: 240, marginTop: 16 }}
              type="primary"
              disabled={!userId || connectButtonDisabled}
              onClick={startConnection}
            >
              Connect
            </Button>
          </div>
        </div>
        <div className="wrapper-row">
          <div className="wrapper">
            <Typography.Text strong style={{marginTop: 60, paddingBottom: 5}}>AI Filters Options:</Typography.Text>
            <Typography.Text style={{paddingBottom: 5}}>
              Note that the face mesh filter only supports Mediapie for now, 
              <br></br>so changing the framework only reloads the model.
            </Typography.Text>
            <div>
              <Space>
              <Typography.Text>Filter Type:</Typography.Text>
              <Select defaultValue="none" style={{ width: 120 }} onChange={handleFilterChange}>
                <Select.Option value="none">None</Select.Option>
                <Select.Option value="mesh">Face Mesh</Select.Option>
                <Select.Option value="bg">Background Removal</Select.Option>
              </Select>
              </Space>
            </div>
            <div>
              <Space>
              <Typography.Text style={{paddingTop: 10}}>Framework:</Typography.Text>
              <Radio.Group 
                style={{paddingTop: 10}} 
                options={radioOptions} 
                onChange={handleFrameworkChange} 
                value={frameworkAI} 
                optionType="button" 
              />
              </Space>
            </div>
          </div>
        </div>
        <div className="playerContainer" id="playerContainer">
          <div style={{display: 'flex', flexDirection: 'column'}}>
            <h1 style={{ color: "#003eb3", marginBottom: 10 }}>You</h1>
            <canvas
              id="localPlayer"
              style={{
                width: 640,
                height: 360,
                border: "5px solid #003eb3",
                borderTop: "65px solid #003eb3",
                borderBottom: "65px solid #003eb3",
                borderRadius: 5,
                backgroundColor: "#003eb3",
              }}
            />
            <Typography.Text 
              id="speedStats" 
              style={{paddingTop: 10}}>Activate a filter to view speed stats</Typography.Text>
          </div>

          <div>
            <h1 style={{ color: "#ad2102", marginBottom: 10 }}>Them</h1>
            <video
              id="peerPlayer"
              autoPlay
              style={{
                width: 640,
                height: 480,
                border: "5px solid #ad2102",
                borderRadius: 5,
                backgroundColor: "#ad2102",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
export default App;

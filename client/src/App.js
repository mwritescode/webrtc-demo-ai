import React, { useEffect, useCallback } from "react";
import { Button, Typography } from "antd";
import "./App.css";
import { v4 as uuid } from "uuid";

// LD: A good web SWE would be able to integrate these variables into the React lifecycle.
// I am not a good web SWE.
let localStream = undefined; // The local video stream from the user's camera.
let localPeerConnection = undefined; // The WebRTC peer connection with the other client.

function App() {
  const [connectButtonDisabled, setConnectButtonDisabled] =
    React.useState(false);
  const [userId, setUserId] = React.useState("");

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

      const localPlayer = document.getElementById("localPlayer");
      localPlayer.srcObject = stream;
      localStream = stream;
      console.log("Local Stream set up");
    } catch (error) {
      console.error("Error setting up local stream:", error);
    }
  };

  const ws = React.useRef(null);

  // Utility to send stringified messages to the WebSocket server.
  const sendWsMessage = (type, body) => {
    ws.current.send(JSON.stringify({ type, body }));
  };

  // This logic is run when the client receives an offer from another client.
  // It happens when this client has already sent an offer to the signalling server, and
  // a second client then connects and sends its offer.
  const receiveOfferAndSendAnswer = useCallback(
    async (offer) => {
      console.log("Offer received");

      // Use the WebRTC API to setup a new peer connection.
      localPeerConnection = new RTCPeerConnection();

      // This callback has a scary name because ICE is a complex topic. In this case, it's
      // called when we call `setLocalDescription(answer)` on this peer connection.
      localPeerConnection.onicecandidate = (event) => {
        console.log("On ICE Candidate invoked");
        if (!event.candidate) {
          const answer = localPeerConnection.localDescription;
          console.log("Sending answer");
          sendWsMessage("send_answer", {
            userId,
            sdp: answer,
          });
        }
      };
      localPeerConnection.onaddstream = addRemoteStreamToDom;

      // Make our local stream available to the peer connection.
      localStream.getTracks().forEach((track) => {
        localPeerConnection.addTrack(track, localStream);
      });

      // Generate the answer to the offer.
      await localPeerConnection.setRemoteDescription(offer);
      const answer = await localPeerConnection.createAnswer();
      await localPeerConnection.setLocalDescription(answer);
    },
    [userId]
  );

  const addRemoteStreamToDom = (event) => {
    console.log("My peer has added a stream. Adding to DOM.");
    const remotePlayer = document.getElementById("peerPlayer");
    remotePlayer.srcObject = event.stream;
  };

  // Set up the WebSocket connection with the signalling server.
  // This is only used to send and receive SDP messages, which are
  // the offers and answers that are used to establish the WebRTC connection.
  useEffect(() => {
    const url = "ws://localhost:8090";
    const wsClient = new WebSocket(url);
    ws.current = wsClient;

    wsClient.onopen = () => {
      console.log("WebSocket connected to signalling server at", url);
      setUserId(uuid());
      setupLocalStream();
    };
  }, []);

  useEffect(() => {
    ws.current.onmessage = (event) => {
      const { type, body } = JSON.parse(event.data);
      switch (type) {
        case "offer_sdp_received":
          console.log("offer_sdp_received");
          receiveOfferAndSendAnswer(body);
          break;
        case "answer_sdp_received":
          console.log("answer_sdp_received");
          localPeerConnection?.setRemoteDescription(body);
          break;
        default:
          console.error("Unknown message type", type, body);
      }
    };
  }, [receiveOfferAndSendAnswer, userId, ws]);

  // This function is called when the "Connect" button is clicked.
  const startConnection = async () => {
    // User the WebRTC API to setup a new peer connection.
    localPeerConnection = new RTCPeerConnection();

    // This callback has a scary name because ICE is a complex topic. In this case, it's
    // called when we call `setLocalDescription(offer)` on this peer connection.
    localPeerConnection.onicecandidate = (event) => {
      console.log("On ICE Candidate invoked");
      if (!event.candidate) {
        const offer = localPeerConnection.localDescription;
        console.log("Sending offer");
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
        <div className="playerContainer" id="playerContainer">
          <div>
            <h1 style={{ color: "#003eb3", marginBottom: 10 }}>You</h1>
            <video
              id="localPlayer"
              autoPlay
              style={{
                width: 640,
                height: 480,
                border: "5px solid #003eb3",
                borderRadius: 5,
                backgroundColor: "#003eb3",
              }}
            />
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

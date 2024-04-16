import { WebSocketServer } from "ws";

const WSSPORT = 8090;

// The WebSocketServer that listens for incoming connections from the clients.
const websockerServer = new WebSocketServer({
  port: WSSPORT,
});

// A map of userIds to WebSocket connections, it's used to send messages to all other
// clients when a message is received from another client.
let clients = {};

// Utility to send stringified messages to the WebSocket server.
const sendWsMessage = (ws, type, body) => {
  ws.send(
    JSON.stringify({
      type,
      body,
    }),
    { binary: false }
  );
};

// This is all of the logic of the signalling server. It simply listens for messages from
// clients and sends them to all other clients.
const onMessage = (ws, message) => {
  const { type, body } = JSON.parse(message);
  const { userId, sdp } = body;

  switch (type) {
    case "send_offer":
      console.log("send_offer received from", userId);
      Object.entries(clients).forEach(([otherUserId, wsClient]) => {
        if (otherUserId === userId) {
          return;
        }
        console.log("Sending offer to", otherUserId);
        sendWsMessage(wsClient, "offer_sdp_received", sdp);
      });
      clients[userId] = ws;
      break;
    case "send_answer":
      console.log("send_answer received from", userId);
      Object.entries(clients).forEach(([otherUserId, wsClient]) => {
        if (otherUserId === userId) {
          return;
        }
        console.log("Sending answer to", otherUserId);
        sendWsMessage(wsClient, "answer_sdp_received", sdp);
      });
      break;
    default:
      console.error("Unknown message type: ", type);
      break;
  }
};

websockerServer.on("connection", (ws) => {
  ws.on("error", console.error);
  ws.on("message", (message) => onMessage(ws, message));
});

websockerServer.on("listening", function () {
  console.log(`Websocket server is running on port: ${WSSPORT}`);
});

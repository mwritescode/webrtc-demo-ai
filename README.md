# WebRTC Demo

This project is a simple WebRTC demo that establishes a direct P2P WebRTC connection between two clients to exchange video streams. It consists of two parts:

- [WebRTC client](client/): A simple WebRTC client written in React. It connects to the [signalling server](server/) via WebSocket to broadcast its availability. When two clients are available, they establish a direct P2P WebRTC connection to exchange video streams.
- [WebRTC server](server/): A very simple WebRTC signalling server in NodeJS. It accepts WebSocket connections from [clients](client/) and broadcasts their availability to other clients. When two clients are available, they establish a direct P2P WebRTC connection to exchange video streams.

You can find more details in the README files of each part, and in [this Notion page](https://www.notion.so/bendingspoons/WebRTC-07cb99c4a579450dbe441db77ac434b4?pvs=4).

## 🌐 Making this work across networks

This demo works out of the box on localhost.

If you want to make it work across different machines on the same network, you simply need to change the WebSocketServer URL in the client to point to the IP address of the machine running the server.

Making this work across the internet is much more difficult, because of NATs and firewalls. You would need to use a STUN/TURN server to relay the WebRTC traffic. You can read more about such sorcery [here](https://temasys.io/guides/developers/webrtc-ice-sorcery/).

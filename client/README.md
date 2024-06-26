# WebRTC client

A simple WebRTC client written in React. It connects to the [signalling server](../server/) via WebSocket to broadcast its availability, when two clients are available, they establish a direct P2P WebRTC connection to exchange video streams.

## 🏃 How to run

To run the client, you can follow the steps below:

- `cd client`
- `npm install`
- `npm start`. This will start the client on http://localhost:3000
- Open two browser tabs and go to http://localhost:3000 on both of them
- On each tab, click the `Connect` button to connect to the signalling server
- Once both clients are connected, observe the video streams being exchanged between the two clients.

Note that you need to start the [server](../server/) first.

## 🧑‍💻 Code

[The App.js file](src/App.js) takes care of setting up the local stream for the WebRTC connection and of instantiating and calling the models. AI-wise, the most interesting files are inside the [src/ai folder](src/ai/).

The rest of the files are just boilerplate code generated by *Create React App*.

require("dotenv").config();

import {SoXRecorder} from "node-sox-recorder"

// @ts-ignore
import ss from 'socket.io-stream';

import {createServer} from "http";
import socketio from 'socket.io';

const port = process.env.PORT || 8080;
const httpServer = createServer();
const io = new socketio.Server(httpServer, {
	// cors: {
	// 	origin: "http://localhost:8080",
	// },
});


const openRecorder = () => {
	return new SoXRecorder({
		channels: 1,
		rate: 48000,
		device: process.env.AUDIO_DEVICE,
		silence: {
			keepSilence: false,
			above: {
				times: 1,
				durationSec: "0.1t",
				threshold: "10%",
			}
		},
		opusEncode: true,
	});
}


io.on("connection", socket => {

	let recorder: SoXRecorder;
	console.log("connect");

	socket.on("start", () => {
		console.log("on start");

		recorder = openRecorder();
		recorder.start();
		const recordStream = recorder.stream()!;

		const sendStream = ss.createStream();
		recordStream.pipe(sendStream);
		recordStream.on("end", () => {
			console.log("stream end");
		})

		ss(socket).emit("sendStream", sendStream);
	})

	socket.on("end", () => {
		console.log("force end");
		recorder.stop();
	});

})


httpServer.listen(port, () => {
	console.log(`listening on ${port}`);
	console.log(`device: ${process.env.AUDIO_DEVICE}`)
})

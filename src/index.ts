require("dotenv").config();


// @ts-ignore
import AudioRecorder from "node-audiorecorder";

// @ts-ignore
import ss from 'socket.io-stream';
import prism from "prism-media";

import {createServer} from "http";
import socketio from 'socket.io';
import {Readable, Writable} from "stream";

const port = process.env.PORT || 8080;
const httpServer = createServer();
const io = new socketio.Server(httpServer, {
	// cors: {
	// 	origin: "http://localhost:8080",
	// },
});


const getRecorder = () => {
	const recorder = new AudioRecorder({
		program: "sox",
		rate: 48000,
		channel: 1,
		device: process.env.AUDIO_DEVICE,
		silence: false,
	});

	return recorder;
}

const getAudioStream = (): Readable => {
	const recorder = getRecorder();
	recorder.start();
	const recordStream = recorder.stream();

	const encoder = new prism.opus.Encoder({channels: 1, rate: 48000, frameSize: 960});
	return recordStream.pipe(encoder);
}

const audioStream = getAudioStream();
let sendStream: Writable;

io.on("connection", socket => {
	console.log("connect");

	socket.on("start", () => {
		console.log("on start");
		sendStream?.end();
		sendStream = ss.createStream();
		audioStream.unpipe();
		audioStream.pipe(sendStream);

		ss(socket).emit("sendStream", sendStream);
	})

	socket.on("end", () => {
		audioStream.unpipe();
		sendStream?.end();
	});

})


httpServer.listen(port, () => {
	console.log(`listening on ${port}`);
	console.log(`device: ${process.env.AUDIO_DEVICE}`)
})

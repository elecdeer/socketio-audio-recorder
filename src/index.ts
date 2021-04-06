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


const openRecorder = () => {
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
	const recorder = openRecorder();
	recorder.start();
	const recordStream = recorder.stream();

	const encoder = new prism.opus.Encoder({channels: 1, rate: 48000, frameSize: 960});
	return recordStream.pipe(encoder);
}



io.on("connection", socket => {

	let recorder: any;
	console.log("connect");

	socket.on("start", () => {
		console.log("on start");

		recorder = openRecorder();
		recorder.start();
		const recordStream = recorder.stream();

		const encoder = new prism.opus.Encoder({channels: 1, rate: 48000, frameSize: 960});


		const sendStream = ss.createStream();
		// audioStream.unpipe();
		recordStream.pipe(encoder).pipe(sendStream);
		recordStream.on("end", () => {
			console.log("stream end");
		})

		ss(socket).emit("sendStream", sendStream);
	})

	socket.on("end", () => {
		console.log("force end");
		recorder.stop();
		// audioStream.stop();

		// audioStream.unpipe();
		// sendStream?.end();
	});

})


httpServer.listen(port, () => {
	console.log(`listening on ${port}`);
	console.log(`device: ${process.env.AUDIO_DEVICE}`)
})

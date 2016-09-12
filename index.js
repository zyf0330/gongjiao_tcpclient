'use strict';
/**
 * Created by zyf on 2016/8/30.
 */

var TCPClient = require('./TCPClient');
var FR = require('./FrameResolver');
var fs = require('fs');
var RW = require('./RW');

var logDir = 'log';
function getLogWriterStream(filepath){
	return function () {
		return fs.createWriteStream(filepath, {flags: 'a'});
	}
}
process.__defineGetter__('stdout', getLogWriterStream(logDir + '/info.log'));
process.__defineGetter__('stderr', getLogWriterStream(logDir + '/error.log'));

var serverAddress = '218.201.35.212', serverPort = 6059;
var client = new TCPClient(serverAddress, serverPort);
var writer = new RW.FileWriter('data', 'file', {
	log: true,
	limit: 1024 * 10
});
var lifetime = 3 * 12 * 60 * 60 * 1000;
client.dataHandle = function (frames) {
	writer.write('\n' + frames.join('\n'));
}
client.errHandle = function (err) {
	console.error(err);
}
client.connect();

setTimeout(function () {
	client.close(function () {
		writer.close();
	});
}, lifetime);

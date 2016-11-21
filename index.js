'use strict';
/**
 * Created by zyf on 2016/8/30.
 */

var TCPClient = require('./TCPClient');
var FR = require('./FrameResolver');
var fs = require('fs');
var RW = require('./RW');

var logDir = 'log';
try {
    fs.mkdirSync(logDir);
} catch (e) {

}

function getLogWriterStream(filepath) {
    return function() {
        var stream = fs.createWriteStream(filepath, { flags: 'a' });
        var _write = stream.write;
        stream.write = function() {
            var chunk = arguments[0];
            if (chunk != null) {
                chunk = '[' + new Date().toLocaleString() + '] ' + chunk;
            }
            var args = [chunk, Array.prototype.slice.call(arguments, 1)];
            _write.apply(stream, args);
        }
        return stream;
    }
}
process.__defineGetter__('stdout', getLogWriterStream(logDir + '/info.log'));
process.__defineGetter__('stderr', getLogWriterStream(logDir + '/error.log'));

var serverAddress = '218.201.35.212',
    serverPort = 6059;
var lifetime = 3 * 12 * 60 * 60 * 1000;

var client = new TCPClient(serverAddress, serverPort);
var writer = new RW.FileWriter('data', 'file', {
    log: true,
    limit: 1024 * 100
});
client.dataHandle = function(frames) {
    writer.write('\n' + frames.join('\n'));
}
client.errHandle = function(err) {
    console.error(err);
}
client.connect();

// setTimeout(function() {
//     client.close(function() {
//         writer.close();
//     });
// }, lifetime);

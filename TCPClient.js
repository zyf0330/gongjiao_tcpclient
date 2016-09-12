'use strict';
/**
 * 用来处理公交数据包的TCP客户端
 * Created by zyf on 2016/8/30.
 */
var net = require('net');

/**
 * 使用服务器地址实例化一个tcp客户端
 * @param serverHost {string} 服务器ip地址
 * @param serverPort {number} 服务器端口
 * @constructor
 */
function TCPClient(serverHost, serverPort) {
	var _this = this;
	this.serverHost = serverHost;
	this.serverPort = serverPort;
	var socket = this.socket = new net.Socket();
	socket.setEncoding('hex');
	this.lastData = '';
	socket.on('data', function (data) {
		var frames = distillFrames(data);
		if(typeof _this.dataHandle == 'function' && frames.length > 0){
			_this.dataHandle.call(null, frames);
		}
	});
	/**
	 * 截取完整帧
	 */
	function distillFrames(data){
		data = _this.lastData + data.toLowerCase();
		var startIndex;
		var frames = [];
		while ((startIndex = data.indexOf('2626')) > -1) {
			//截取完整帧
			data = data.substring(startIndex);
			//不含帧长度位
			if (data.length < 5 * 2) {
				break;
			}
			var frameLen = parseInt(data.slice(3 * 2, 5 * 2), 16) + 5;
			//不够帧长度
			if (data.length < frameLen * 2) {
				break;
			}
			var frame = data.slice(0, frameLen * 2);
			//校验。帧内容不符，那么从下一个2626开始截取
			if (frame.endsWith('0b') == false) {
				// _onerror(new Error('Received a frame whose end is not 0b, frame is ' + frame + '.'));
				data = data.slice(1);
				continue;
			}
			var checkDigit = frame.slice(-2 * 2, -1 * 2), lastXOR = 0;
			for (var i = 0, l = frameLen - 2; i < l; i++) {
				lastXOR = lastXOR ^ parseInt(frame[2 * i] + frame[2 * i + 1], 16);
			}
			if (parseInt(checkDigit, 16) != lastXOR) {
				data = data.slice(1);
				_onerror(new Error('Received a frame whose check failed, frame is ' + frame + '.'));
				continue;
			}
			frames.push(frame);
			data = data.slice(frameLen * 2);
		}
		_this.lastData = data;
		return frames;
	}
	function _onerror(err) {
		if (typeof _this.errHandle == 'function') {
			_this.errHandle.call(null, err);
		}
	}
	socket.on('error', _onerror);
	socket.on('close', function(had_error) {
		console.log('tcp socket closes, had error: %s', had_error);
		typeof _this.endCb == 'function' && _this.endCb.call(null);
	});
}

var prototype = TCPClient.prototype;

/**
 * 连接到服务器
 */
prototype.connect = function() {
	this.socket.connect({
		port: this.serverPort,
		host: this.serverHost
	});
}

/**
 * 调用end发送关闭信号
 */
prototype.close = function(cb) {
	this.socket.end();
	if(typeof cb == 'function'){
		this.endCb = cb;
	}
}

/**
 * 设置接收数据处理函数
 * @type {function(Array.<string>)} 第一个参数是帧数组
 */
prototype.dataHandle = null;

/**
 * 错误处理函数
 * @type {function(Error)} 接收err
 */
prototype.errHandle = null;

module.exports = TCPClient;

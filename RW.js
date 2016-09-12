var fs = require('fs');
var path = require('path');

/**
 * 同步文件写入，保证顺序。使用 fs.WriteStream
 * @param dir {string} 目标文件夹
 * @param filename {string} 文件名，后缀从0开始
 * @param limit {number} 单位是KB，每个文件最大的大小。不会截断一次写入的数据，使用 fs.WriteStream.bytesWritten 检测因此避免同步写入
 * @constructor
 */
function FileWriter(dir, filename, option) {
	try {
		fs.statSync(dir);
	} catch (e) {
		fs.mkdirSync(dir);
	}
	this.dir = dir;
	this.index = 0;
	this.filename = filename || 'file';
	option = option || {};
	this.limit = option.limit || 1024;
	this.log = !!option.log;
	this._writeStream = null;
}
/**
 * 创建当前索引的文件写入流。只会创建新文件
 * @returns {fs.WriteStream}
 * @private
 */
FileWriter.prototype._getWriteStream = function () {
	var log = this.log;
	var writeStream = this._writeStream;
	if (writeStream != null) {
		//同步调用 prototype.write 可能失准
		if (writeStream.bytesWritten < this.limit * 1024) {
			return writeStream;
		} else {
			writeStream.end();
			this._writeStream = null;
			this.index++;
		}
	}
	var filepath = path.join(this.dir, this.filename + this.index);
	//不写入已经存在的文件
	try {
		fs.accessSync(filepath, fs.F_OK);
	} catch (e) {
		if (e.code == 'ENOENT') {
			writeStream = this._writeStream = fs.createWriteStream(filepath, {flags: 'wx'});
			writeStream.on('finish', function () {
				log && console.log('File %s ends writing', this.path);
			});
			log && console.log('File %s starts writing', filepath);
			return writeStream;
		}
	}
	log && console.log('File %s exists or cannot be written', filepath);
	this.index++;
	return this._getWriteStream();
}
/**
 * 写入数据。注意，如果同步写入太多只会暂存到内存中
 * @param data {string} 写入数据
 */
FileWriter.prototype.write = function (data) {
	data = data.toString();
	var writeStream = this._getWriteStream();
	if(writeStream.write(data) == false){
		this.log && console.warn('WriteStream has too much data');
	}
}
/**
 * 关闭写入流
 */
FileWriter.prototype.close = function () {
	if(this._writeStream){
		this._writeStream.end();
		this._writeStream = null;
	}
}

module.exports = {
	FileWriter: FileWriter,
	FileReader: null
};



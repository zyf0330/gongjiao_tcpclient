'use strict';
/**
 * 公交数据帧解析器
 * Created by zyf on 2016/8/31.
 */

/**
 * 解析数据帧。按照字节号乘2来截取子串，从0开始
 * @param frame {string} 16进制数据帧，全部为小写字母
 * @returns {Object} 解析结果，没有返回null
 */
function frameHandle(frame) {
	var cmdId = frame.slice(2 * 2, 3 * 2);
	var content = frame.slice(9 * 2, -2 * 2);
	//实时消息
	if (cmdId in frameContentHandle) {
		return frameContentHandle[cmdId](content);
	}
	return null;
}

/**
 * 按照规则将字符串各部分截取并按照规则解析，再合并关联属性
 * @param str {string} 要解析的字符串
 * @param regulation {Array.<Array>} 规则，子元素数组内容依次为字段名、字符串长度、解析器
 * @returns {Object} 解析结果
 */
function distill(str, regulation) {
	var result = {};
	for (var entry of regulation) {
		var field = entry[0],
			length = entry[1],
			formater = entry[2];
		var value = str.slice(0, length);
		str = str.slice(length);
		if (typeof formater == 'function') {
			value = formater.call(null, value);
		}
		//检查重复字段
		if (field in result) {
			throw new Error('regulation中有重复字段 ' + field);
		}
		result[field] = value;
	}
	if ('latitude1' in result) {
		result.latitude = parseInt(result.latitude1[0]) + (result.latitude1[1] + '.' + result.latitude2) / 60;
	}
	if ('longitude1' in result) {
		result.longitude = parseInt(result.longitude1[0]) + (result.longitude1[1] + '.' + result.longitude2) / 60;
	}
	if ('direction1' in result) {
		result.direction = parseFloat(result.direction1 + '.' + result.direction2);
	}
	if ('mileage1' in result) {
		result.mileage = parseFloat(result.mileage1 + '.' + result.mileage2);
	}
	if ('stopDistance1' in result) {
		result.stopDistance = parseFloat(result.stopDistance1 + '.' + result.stopDistance2);
	}
	if ('statusRaw' in result) {
		result.status = distill(result.statusRaw, commonRegulation.status);
	}
	return result;
}
/**
 * 公用的解析规则
 * @type {Object}
 */
var commonRegulation = {
	content: [
		['cmdSN', 2 * 2],
		['cmdID', 1 * 2],
		['gpsEffective', 1 * 2, function (v) {
			return v == '41' ? true : false;
		}],
		['latitudeDirection', 1 * 2, function (v) {
			return v == '4e' ? 'north' : 'south';
		}],
		['latitude1', 2 * 2, function (v) {
			return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2), 16)];
		}],
		['latitude2', 2 * 2, function (v) {
			return parseInt(v, 16);
		}],
		['longitudeDirection', 1 * 2, function (v) {
			return v == '45' ? 'east' : 'west';
		}],
		['longitude1', 2 * 2, function (v) {
			return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2), 16)];
		}],
		['longitude2', 2 * 2, function (v) {
			return parseInt(v, 16);
		}],
		['altitude', 2 * 2, function (v) {
			return parseInt(v.slice(0, 2), 16) * 100 + parseInt(v.slice(2), 16);
		}],
		['speed', 1 * 2, function (v) {
			return parseInt(v, 16);
		}],
		['direction1', 2 * 2, function (v) {
			return parseInt(v, 16);
		}],
		['direction2', 1 * 2, function (v) {
			return parseInt(v, 16);
		}],
		['mileage1', 2 * 2, function (v) {
			return parseInt(v, 16);
		}],
		['mileage2', 1 * 2, function (v) {
			return parseInt(v, 16);
		}],
		['time', 6 * 2, function (v) {
			var yearPrefix = new Date().getFullYear().toString().slice(0, -2);
			var jsonDateStr = [yearPrefix + v.slice(0, 2), v.slice(2, 4), v.slice(4, 6)].join('-')
				+ ' '
				+ [v.slice(6, 8), v.slice(8, 10), v.slice(10, 12)].join(':');
			return new Date(jsonDateStr);
		}],
		['statusRaw', 4 * 2, function (v) {
			//和文档不同，是从前往后的顺序
			return padLeft(parseInt(v, 16).toString(2), 4 * 8);
		}],
		['lastStopNO', 2 * 2, function (v) {
			return parseInt(v, 16);
		}],
		['stopDistance1', 2 * 2, function (v) {
			return parseInt(v, 16);
		}],
		['stopDistance2', 1 * 2, function (v) {
			return parseInt(v, 16);
		}],
	],
	status: [
		['fatigue', 1, function (v) {
			return v == '1';
		}],
		['overspeed', 1, function (v) {
			return v == '1';
		}],
		['suddenBrake', 1, function (v) {
			return v == '1';
		}],
		['stopBeyondTime', 1, function (v) {
			return v == '1';
		}],
		['alarmPassenger', 1, function (v) {
			return v == '1';
		}],
		['gpsShortCircuit', 1, function (v) {
			return v == '1';
		}],
		['gpsOpenCircuit', 1, function (v) {
			return v == '1';
		}],
		['alarmGPS', 1, function (v) {
			return v == '1';
		}],
		['driverCall', 1, function (v) {
			return v == '1';
		}],
		['gpsEffective', 1, function (v) {
			return v == '1';
		}],
		['serving', 1, function (v) {
			return v == '1';
		}],
		['direction', 1, function (v) {
			return v == '1' ? 'uplink' : 'downlink';
		}],
		['stopDock', 1, function (v) {
			return v == '1';
		}],
		['stopFirst', 1, function (v) {
			return v == '1';
		}],
		['stopEnd', 1, function (v) {
			return v == '1';
		}],
		['stopGas', 1, function (v) {
			return v == '1';
		}],
		['stopPark', 1, function (v) {
			return v == '1';
		}],
		['cashboxOpen', 1, function (v) {
			return v == '1';
		}],
		['abnormalDoorSignalStop', 1, function (v) {
			return v == '1';
		}],
		['abnormalDoorSignalMove', 1, function (v) {
			return v == '1';
		}],
		['alarmPowerCut', 1, function (v) {
			return v == '1';
		}],
		['alarmPark', 1, function (v) {
			return v == '1';
		}],
		['alarmYaw', 1, function (v) {
			return v == '1';
		}],
	]
}

/**
 * 帧内容处理器。内容为命令id和处理函数键值对
 * @type {Object}
 */
var frameContentHandle = {
	'41': function (content) {
		var regulation = commonRegulation.content.concat([
			['temperature', 1 * 2, function (v) {
				return parseInt(v, 16);
			}],
			['speedLimit', 1 * 2, function (v) {
				return parseInt(v, 16);
			}]
		]);
		return distill(content, regulation);
	},
	'79': function (content) {
		var regulation = commonRegulation.content.concat([
			['stopType', 1 * 2, function (v) {
				var char = String.fromCharCode(parseInt(v, 16));
				var en, zh;
				switch (char) {
					case 'F':
						zh = '停靠站', en = 'dock';
						break;
					case 'B':
						zh = '起点站', en = 'first';
						break;
					case 'f':
						zh = '终点站', en = 'end';
						break;
					case 'I':
						zh = '停车场', en = 'park';
						break;
					case 'i':
						zh = '加油站', en = 'gas';
						break;
				}
				return {
					en: en,
					zh: zh
				};
			}],
			['inOutBound', 1 * 2, function (v) {
				return parseInt(v, 16) == 0 ? 'in' : 'out';
			}],
			['upNum', 2 * 2, function (v) {
				return parseInt(v, 16);
			}],
			['downNum', 2 * 2, function (v) {
				return parseInt(v, 16);
			}],
			['cardAmount', 4 * 2, function (v) {
				return parseInt(v, 16);
			}],
		]);
		return distill(content, regulation);
	}
}

function padLeft(str, len, char) {
	str = str + '';
	char = char || '0';
	if (str.length < len) {
		str = char.repeat(len - str.length) + str;
	}
	return str;
}

module.exports.do = frameHandle;
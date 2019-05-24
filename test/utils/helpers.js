module.exports.cleanupEmptyArrays = function cleanupEmptyArrays(input) {
	const result = {};
	Object.keys(input).forEach((keyName)=>{
		if (Array.isArray(input[keyName])) {
			if (input[keyName].length !== 0) {
				result[keyName] = input[keyName];
			}
		} else {
			result[keyName] = input[keyName];
		}
	})
	return result;
}
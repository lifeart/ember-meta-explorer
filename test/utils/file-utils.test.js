'use strict';
/* eslint-env jest */
/* eslint-env node */

const utils = require('../../dist/utils/file-utils');



it('can export some props', ()=>{
	assert(Object.keys(utils), [
		"serializePath",
		"normalizePath",
		"isJSFile",
		"isHBSFile",
		"isSupportedFileType"
	]);
});

function assert(left, right) {
	expect(left).toEqual(right);
}

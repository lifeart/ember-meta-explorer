'use strict';
/* eslint-env jest */
/* eslint-env node */

const utils = require('../../dist/utils/file-utils');



it('can export some props', ()=>{
	assert(Object.keys(utils).sort(), [
		"serializePath",
		"normalizePath",
		"isJSFile",
		"isHBSFile",
		"isSupportedFileType"
	].sort());
});

function assert(left, right) {
	expect(left).toEqual(right);
}

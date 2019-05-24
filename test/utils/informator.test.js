'use strict';
/* eslint-env jest */
/* eslint-env node */

const { extractComponentInformationFromMeta } = require('../../dist/utils/informator');
const { processJSFile } = require('../../dist/utils/js-utils');

function compile(input) {
    return extractComponentInformationFromMeta(processJSFile(input, 'empty'));
}

it('ts: can get info for property without value and with decorator', ()=>{
	const input = `
		class Foo extends Boo {
			@(function(){})
			n;
		}
    `;
    const { jsProps } = compile(input);
	assert(jsProps, ['n = ?']);
});

it('ts: can get info for property without value. with any type and with decorator', ()=>{
	const input = `
		class Foo extends Boo {
			@(function(){})
			n: any;
		}
    `;
    const { jsProps } = compile(input);
	assert(jsProps, ['n : any = ?']);
});

it('ts: can get info for property without value. with propert type and with decorator', ()=>{
	const input = `
		class Foo extends Boo {
			@(function(){})
			n: Task;
		}
    `;
    const { jsProps } = compile(input);
	assert(jsProps, ['n : Task = ?']);
});


function assert(left, right) {
	expect(left).toEqual(right);
}
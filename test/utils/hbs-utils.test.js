'use strict';
/* eslint-env jest */
/* eslint-env node */

const {
    patternMatch
} = require('../../dist/utils/hbs-utils');

it('patternMatch works as expected: false', () => {
    assert(patternMatch({input: 1}, { input: 2}), false);
    assert(patternMatch({output: 1}, { input: 2}), false);
    assert(patternMatch({input: { output: 12 }}, { input: { output: 11 }}), false);
    assert(patternMatch({input: { output: 12 }}, { input: [{ output: 11 },{ output: 14 }]}), false);

});

it('patternMatch works as expected: true, for plain objects', () => {
    assert(patternMatch({input: 1}, { input: 1}), true);
    assert(patternMatch({output: 1}, { output: 1}), true);
    assert(patternMatch({input: { output: 12 }}, { input: { output: 12 }}), true);
});

it('patternMatch works as expected: true, for arrayed objects', () => {
    assert(patternMatch({input: { output: 12 }}, { input: [{ output: 12 }]}), true);
    assert(patternMatch({input: { output: 12 }}, { input: [{ output: 11 }, { output: 12 }]}), true);    
});

function assert(left, right) {
	expect(left).toEqual(right);
}

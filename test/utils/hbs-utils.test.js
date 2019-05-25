'use strict';
/* eslint-env jest */
/* eslint-env node */

const {
    patternMatch,
    processTemplate
} = require('../../dist/utils/hbs-utils');
const { cleanupEmptyArrays } = require('./helpers');

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

it('must grab classic components', () => {
    const tpl = '{{my-component}}';
    assertOutput(tpl, {
        helpers: ['my-component']
    });
});

it('must grab classic components blocks', () => {
    const tpl = '{{#my-component}} {{/my-component}}';
    assertOutput(tpl, {
        components: ['my-component']
    });
});

it('must grab classic components blocks with context', () => {
    const tpl = '{{#my-component as |name|}} {{/my-component}}';
    assertOutput(tpl, {
        components: ['my-component']
    });
});


it('must grab angle components', () => {
    const tpl = '<MyComponent />';
    assertOutput(tpl, {
        components: ['MyComponent']
    });
});

it('must grab angle components blocks', () => {
    const tpl = '<MyComponent></MyComponent>';
    assertOutput(tpl, {
        components: ['MyComponent']
    });
});

it('must grab angle components blocks with context', () => {
    const tpl = '<MyComponent as |ctx|></MyComponent>';
    assertOutput(tpl, {
        components: ['MyComponent']
    });
});

it('respect {{link-to}} componnt', () => {
    const tpl = '{{link-to "name" "uri"}}';
    assertOutput(tpl, {
        links: ['uri']
    });
});

it('respect {{#link-to "path"}}{{/link-to}} componnt', () => {
    const tpl = '{{#link-to "uri"}}{{/link-to}}';
    assertOutput(tpl, {
        links: ['uri']
    });
});


it('respect <LinkTo @route="name" /> componnt', () => {
    const tpl = '<LinkTo @route="name" />';
    assertOutput(tpl, {
        links: ['name']
    });
});

it('respect <LinkTo @route="name" ></LinkTo> componnt', () => {
    const tpl = '<LinkTo @route="name"></LinkTo>';
    assertOutput(tpl, {
        links: ['name']
    });
});


function assert(left, right) {
	expect(left).toEqual(right);
}

function assertOutput(left, right) {
    return assert(cleanupEmptyArrays(processTemplate(left)), right);
}
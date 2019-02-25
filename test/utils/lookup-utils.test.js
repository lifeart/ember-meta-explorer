'use strict';
/* eslint-env jest */
/* eslint-env node */
const { join } = require('path');

const { getItemsFromPods, getRoutes } = require('../../dist/utils/lookup-utils');

it('can return list of items from pods-like structure', ()=>{
    const stuff = getItemsFromPods(join(__dirname, '..', 'dummy', 'pods'));
    assert(stuff.length, 3);
});

it('can find routes', ()=>{
    const stuff = getRoutes(join(__dirname, '..', 'dummy', 'classic'));
    assert(stuff.length, 2);
});

it('can find routes in MU app', ()=>{
    const stuff = getRoutes(join(__dirname, '..', 'dummy', 'mu'));
    assert(stuff.length, 2);
});

function assert(left, right) {
	expect(left).toEqual(right);
}

'use strict';
/* eslint-env jest */
/* eslint-env node */

const utils = require('../../dist/utils/js-utils');
const { cleanupEmptyArrays } = require('./helpers');
const processJSFile = utils.processJSFile;

function compile(input) {
	return cleanupEmptyArrays(processJSFile(input, 'empty'));
}

it('can export some props', () => {
	assert(Object.keys(utils), ['parseScriptFile', 'processJSFile']);
});

it('can handle basic js component', () => {
	const example = `
	
import Component from "@ember/component";
import layout from "../templates/components/hot-placeholder";

export default Component.extend({
  tagName: "",
  layout
});

	`;
	assert(processJSFile(example, 'empty'), {
		"actions": [],
		"attributeBindings": [],
		"classNameBindings": [],
		"classNames": [],
		"computeds": [],
		"concatenatedProperties": [],
		"exports": [],
		"functions": [],
		"imports": ["@ember/component", "../templates/components/hot-placeholder"],
		"mergedProperties": [],
		"positionalParams": [],
		"props": ["layout = layout "],
		"tagNames": [""],
		"unknownProps": []
	});
});

it('can handle complex js component', () => {
	const example = `
	
import Component from "@ember/component";
import layout from "../templates/components/hot-placeholder";
import { computed } from "@ember/object/computed";

export default Component.extend({
  tagName: "",
  layout,
  nullProp: null,
  boolProp: false,
  emptyStr: '',
  someFunction() {
  },
  someComputed: computed(function(){
	return 'foo-bar';
  }),
  actions: {
	  myFirstAction() {

	  },
	  mySecondAction(foo, bar) {

	  }
  }
});

	`;
	assert(compile(example), {
		"actions": [
			"myFirstAction()",
			"mySecondAction(foo, bar)",
		],
		"computeds": [
			"someComputed = computed(fn() {...})"
		],
		"functions": [
			"someFunction()",
			"myFirstAction()",
			"mySecondAction(foo, bar)"
		],
		"imports": ["@ember/component", "../templates/components/hot-placeholder", "@ember/object/computed"],
		"props": ["layout = layout ",
			"nullProp = null ",
			"boolProp = false",
			"emptyStr = \"\""
		],
		"tagNames": [""]
	});
});

it('not fails on some ts files without types', () => {
	const example = `
import Component from '@ember/component';
import { computed } from '@ember/object';

export default class AbstractControlsTableMetaMenu extends Component.extend({
  // anything which *must* be merged to prototype here
  tagName: '',
  heading: null,
  halfHeadingSize: computed('heading.length', function() {
    if (this.heading && this.heading.length) {
      return Math.round(this.heading.length / 2);
    } else {
      return 1;
    }
  })
}) {
  // normal class body definition here
}

	`;

	assert(compile(example), {
		"computeds": ["halfHeadingSize = computed('heading.length', fn() {...})"],
		"imports": ["@ember/component", "@ember/object"],
		"props": ["heading = null "],
		"tagNames": [""],
		"unknownProps": ["heading.length"]
	});
});


it('not fails on ts files with types', () => {
	const example = `
import Component from '@ember/component';
import { computed } from '@ember/object';

export default class AbstractControlsTableMetaMenu extends Component.extend({
  // anything which *must* be merged to prototype here
  tagName: '',
  heading: null,
  halfHeadingSize: computed('heading.length', function() {
    if (this.heading && this.heading.length) {
      return Math.round(this.heading.length / 2);
    } else {
      return 1;
    }
  }),
  actions: {
	  sendEmail(name: string, message: string) {
		return true;
	  }
  }
}) {
  // normal class body definition here
}

	`;

	let result = null;
	try {
		result = compile(example, 'empty');
	} catch(e) {
		result = JSON.stringify(e);
	}
	const expectedResult = {
		"actions": ["sendEmail(name, message)"],  
		"computeds": ["halfHeadingSize = computed('heading.length', fn() {...})"], 
		"functions": ["sendEmail(name, message)"], 
		"imports": ["@ember/component", "@ember/object"], 
		"props": ["heading = null "], 
		"tagNames": [""], 
		"unknownProps": ["heading.length"]
	};
	assert(result, expectedResult);
});

it('can handle class properties', ()=>{
	const input = `class Rectangle extends FooBar {
		public name: number = 42;
		public attributeBindings: string[] = ['foo:bar'];
		public classNameBindings = ['foo-bar'];
		tagName = 'head';
		@computed
		get name() {
			return 42;
		}
	  
		get user() {
			return 42;
		}
	  
		hello() {
		}

		@action
		boo() {
		}
	  }`;

	const expectedResult = {
		"actions": [
		 "boo()",
		],
		"attributeBindings": [
		 "foo:bar",
		],
		"classNameBindings": [
		 "foo-bar",
		],
		"computeds": [
		 "name = get fn()",
		 "user = get fn()",
		],
		"functions": [
		 "hello()",
		],
		"props": [
		 "name = 42",
		],
		"tagNames": [
		 "head",
		],
		"unknownProps": [
		 "foo",
		 "foo-bar",
		],
	};

	assert(compile(input), expectedResult);
});

it('can handle valueless decorated props with types', ()=>{
	const input = `
		class Foo extends Boo {
			@(function(){})
			n!: Moo;
		}
	`;
	assert(compile(input), {
		props: [
			"n = <Moo>"
		]
	});
});

it('can handle valueless decorated props without types', ()=>{
	const input = `
		class Foo extends Boo {
			@(function(){})
			n;
		}
	`;
	assert(compile(input), {
		props: [
			"n = undefined"
		]
	});
});

it('can handle service decorator with basic path', () => {
	const input = `
		class Foo extends Boo {
			@service()
			n;
		}
	`;
	assert(compile(input), {
		computeds: [
			'n = service("n")'
		]
	});
});

it('can handle named service decorator with basic path', () => {
	const input = `
		class Foo extends Boo {
			@service('uber')
			n;
		}
	`;
	assert(compile(input), {
		computeds: [
			'n = service("uber")'
		]
	});
});

function assert(left, right) {
	expect(left).toEqual(right);
}


'use strict';
/* eslint-env jest */
/* eslint-env node */

const utils = require('../../dist/utils/js-utils');
const processJSFile = utils.processJSFile;

it('can export some props', () => {
	assert(Object.keys(utils), ['processJSFile']);
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
	assert(processJSFile(example, 'empty'), {
		"actions": [
			"myFirstAction()",
			"mySecondAction(foo, bar)",
		],
		"attributeBindings": [],
		"classNameBindings": [],
		"classNames": [],
		"computeds": [
			"someComputed = computed(fn() {...})"
		],
		"concatenatedProperties": [],
		"exports": [],
		"functions": [
			"someFunction()",
			"myFirstAction()",
			"mySecondAction(foo, bar)"
		],
		"imports": ["@ember/component", "../templates/components/hot-placeholder", "@ember/object/computed"],
		"mergedProperties": [],
		"positionalParams": [],
		"props": ["layout = layout ",
			"nullProp = null ",
			"boolProp = false",
			"emptyStr = \"\""
		],
		"tagNames": [""],
		"unknownProps": []
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

	assert(processJSFile(example, 'empty'), {
		"actions": [],
		"attributeBindings": [],
		"classNameBindings": [],
		"classNames": [],
		"computeds": ["halfHeadingSize = computed('heading.length', fn() {...})"],
		"concatenatedProperties": [],
		"exports": [],
		"functions": [],
		"imports": ["@ember/component", "@ember/object"],
		"mergedProperties": [],
		"positionalParams": [],
		"props": ["heading = null "],
		"tagNames": [""],
		"unknownProps": ["heading.length"]
	});
});


it('fails on ts files with types', () => {
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
		result = processJSFile(example, 'empty');
	} catch(e) {
		result = JSON.stringify(e);
	}
	assert(result, JSON.stringify({"pos":478,"loc":{"line":17,"column":17},"code":"BABEL_PARSE_ERROR"}));
});

function assert(left, right) {
	expect(left).toEqual(right);
}
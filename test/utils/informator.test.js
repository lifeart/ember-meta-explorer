"use strict";
/* eslint-env jest */
/* eslint-env node */

const {
  extractComponentInformationFromMeta,
  extractJSXComponents,
  rebelObject
} = require("../../dist/utils/informator");
const { processJSFile } = require("../../dist/utils/js-utils");

function compile(input) {
  return extractComponentInformationFromMeta(processJSFile(input, "empty"));
}

it("ts: can get info for property without value and with decorator", () => {
  const input = `
		class Foo extends Boo {
			@(function(){})
			n;
		}
    `;
  const { jsProps } = compile(input);
  assert(jsProps, ["n = undefined"]);
});

it("ts: can get info for property without value. with any type and with decorator", () => {
  const input = `
		class Foo extends Boo {
			@(function(){})
			n: any;
		}
    `;
  const { jsProps } = compile(input);
  assert(jsProps, ["n = <any>"]);
});

it("ts: can get info for property without value. with propert type and with decorator", () => {
  const input = `
		class Foo extends Boo {
			@(function(){})
			n: Task;
		}
    `;
  const { jsProps } = compile(input);
  assert(jsProps, ["n = <Task>"]);
});

it("rebelObject can handle flat cases", () => {
  assert(rebelObject(["name"]), { name: "any" });
  assert(rebelObject(["name", "lastname"]), { name: "any", lastname: "any" });
});
it("rebelObject can handle nested cases", () => {
  assert(rebelObject(["name", "name.lastname"]), { name: { lastname: "any" } });
  assert(rebelObject(["name", "name.lastname", "name.lastname.value"]), {
    name: { lastname: { value: "any" } }
  });
  assert(
    rebelObject([
      "name",
      "name.lastname",
      "name.lastname.value",
      "name.lastname.uid"
    ]),
    { name: { lastname: { value: "any", uid: "any" } } }
  );
});
it("rebelObject can handle local context", () => {
  const input = ["this.name", "name", "this.name.id", "name.item"];
  const output = {
    name: {
      id: "any",
      item: "any"
    }
  };
  assert(rebelObject(input), output);
});
it("rebelObject can handle external context", () => {
  const input = ["@name", "@name.id", "@name.item.id"];
  const output = {
    args: {
      name: {
        id: "any",
        item: {
          id: "any"
        }
      }
    }
  };
  assert(rebelObject(input), output);
});
it("rebelObject skip this path", () => {
  const input = ["this"];
  const output = {};
  assert(rebelObject(input), output);
});

it("can extract simple JSX components from file", () => {
	const input = `
	
    
     
      function App(){
		function SuccessMessage(props) {
			function MessageContent(props) {
				return (<p className="message__content"><h3 className="message__title">{props.title}</h3><p className="message__text">{props.children}</p></p>);
			  }
			return (<div className={'message message_success'}><MessageContent title={props.title}>{props.children}</MessageContent></div>);
		}

        return (<p><SuccessMessage title="Succes">Done!</SuccessMessage></p>);
      }
	`;
	
	assert(extractJSXComponents(input), {
		App: "<p><SuccessMessage @title=\"Succes\">Done!</SuccessMessage></p>",
		MessageContent: "<p class=\"message__content\"><h3 class=\"message__title\">{{@title}}</h3><p class=\"message__text\">{{yield}}</p></p>",
		SuccessMessage: "<div class=\"message message_success\"><MessageContent @title={{@title}}>{{yield}}</MessageContent></div>"
	});
});

it("can extract jsx from ClassMethod", () => {
	const input = `
	import React from 'react';
	import WithEmberSupport from 'ember-react-components';


	export default class BasicComponent extends React.Component {
		render() {
			return <h1>Hello from React</h1>;
		}
	}
	`;

	assert(extractJSXComponents(input), {
		'render': '<h1>Hello from React</h1>'
	});
});
it("can extract jsx from VariableDeclarator", () => {
	const input = `
	var data = <h1>Hello from React</h1>;
	`;

	assert(extractJSXComponents(input), {
		'data': '<h1>Hello from React</h1>'
	});
});
it("can extract jsx from ArrowFunctionExpression", () => {
	const input = `
	var data = () => <h1>Hello from React</h1>;
	`;

	assert(extractJSXComponents(input), {
		'ArrowFunctionExpression': '<h1>Hello from React</h1>'
	});
});
it("can extract jsx from FunctionExpression", () => {
	const input = `
	function node() {}

node(function () {
	return <div></div>;
});
	`;

	assert(extractJSXComponents(input), {
		'FunctionExpression': '<div></div>'
	});
});
it("can extract jsx from ArrowFunctionExpression, using return", () => {
	const input = `
	var data = () => { return <h1>Hello from React</h1> };
	`;

	assert(extractJSXComponents(input), {
		'ArrowFunctionExpression': '<h1>Hello from React</h1>'
	});
});

it('can extract component, returning fragment', () => {
	const input = `function FragmentedComponent(props) {
		return (<><div></div><div></div></>);
	}`;
	assert(extractJSXComponents(input), {
		FragmentedComponent: "<div></div><div></div>"
	});
});

it('can extract component from object method', () => {
	const input = `
	let ob = {
		name() {
			return <div></div>;
		}
	};
	`;
	assert(extractJSXComponents(input), {
		name: "<div></div>"
	});
});
it('can extract component from object property', () => {
	const input = `
	let ob = {
		name:  <div></div>
	};
	`;
	assert(extractJSXComponents(input), {
		name: "<div></div>"
	});
});
it('can handle basic string declarations', () => {
	// todo fix fails
	const input = `
	function App() {
		const greeting = "Hi";
	  
		return <h1>{greeting}</h1>;
	  }
	`;
	assert(extractJSXComponents(input), {
		App: "<h1>{{this.greeting}}</h1>",
		App_declarated:  "{{#let (hash greeting=\"Hi\") as |ctx|}}<h1>{{ctx.greeting}}</h1>{{/let}}"
	});
});
it('can handle basic numeric declarations', () => {
	// todo fix fails
	const input = `
	function App() {
		const greeting = 42;
	  
		return <h1>{greeting}</h1>;
	  }
	`;
	assert(extractJSXComponents(input), {
		App: "<h1>{{this.greeting}}</h1>",
		App_declarated:  "{{#let (hash greeting=42) as |ctx|}}<h1>{{ctx.greeting}}</h1>{{/let}}"
	});
});
it('can handle spread as arguments for arrow function', () => {
	const input = `
	const Headline = ({ value }) => {
		return <h1>{value}</h1>;
	  };
	`;
	assert(extractJSXComponents(input), {
		ArrowFunctionExpression: "<h1>{{this.value}}</h1>",
		ArrowFunctionExpression_declarated: "<h1>{{@value}}</h1>",
	});
	// App.. = <h1>{{@value}}</h1>
});
it('can handle spread as arguments for named function', () => {
	const input = `
	function Headline({ value }) {
		return <h1>{value}</h1>;
	  };
	`;
	assert(extractJSXComponents(input), {
		Headline: "<h1>{{this.value}}</h1>"
	});

	// App.. = <h1>{{@value}}</h1>

	// same for
	//  const { name } = this.props;
    //return (
	//	<p>Hello, {name}</p>
	//  );
});
it('can handle spread for this.props', () => {
	const input = `
	function Headline() {
		const { value } = this.props;
		return <h1>{value}</h1>;
	  };
	`;
	assert(extractJSXComponents(input), {
		Headline: "<h1>{{this.value}}</h1>",
		Headline_declarated: "<h1>{{@value}}</h1>"
	});
});
it('can handle components with state hook', () => {
	const input = `
	const Headline = () => {
		const [greeting, setGreeting] = useState(
		  'Hello Function Component!'
		);
	  
		const handleChange = event => setGreeting(event.target.value);
	  
		return (
		  <div><h1>{greeting}</h1><input type="text" value={greeting} onChange={handleChange} /></div>
		);
	  };
	`;
	// idea todo -> we can catch setGreeting and produce {{action (mut this.greeting)}}, or kinda
	assert(extractJSXComponents(input), {
		ArrowFunctionExpression: "<div><h1>{{this.greeting}}</h1><input type=\"text\" value={{this.greeting}} {{on \"change\" this.handleChange}} /></div>",
		ArrowFunctionExpression_declarated: "{{#let (hash greeting=\"Hello Function Component!\") as |ctx|}}<div><h1>{{ctx.greeting}}</h1><input type=\"text\" value={{ctx.greeting}} {{on \"change\" this.handleChange}} /></div>{{/let}}"
	});
});
function assert(left, right) {
  expect(left).toEqual(right);
}

"use strict";
/* eslint-env jest */
/* eslint-env node */

const { extractJSXComponents } = require("../../dist/utils/jsx-extractor");

function assert(left, right) {
  expect(left).toEqual(right);
}

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
    App: '<p><SuccessMessage @title="Succes">Done!</SuccessMessage></p>',
    MessageContent:
      '<p class="message__content"><h3 class="message__title">{{@title}}</h3><p class="message__text">{{yield}}</p></p>',
    SuccessMessage:
      '<div class="message message_success"><MessageContent @title={{@title}}>{{yield}}</MessageContent></div>'
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
    render: "<h1>Hello from React</h1>"
  });
});
it("can extract jsx from VariableDeclarator", () => {
  const input = `
	  var data = <h1>Hello from React</h1>;
	  `;

  assert(extractJSXComponents(input), {
    data: "<h1>Hello from React</h1>"
  });
});
it("can extract jsx from ArrowFunctionExpression", () => {
  const input = `
	  var data = () => <h1>Hello from React</h1>;
	  `;

  assert(extractJSXComponents(input), {
    ArrowFunctionExpression: "<h1>Hello from React</h1>"
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
    FunctionExpression: "<div></div>"
  });
});
it("can extract jsx from ArrowFunctionExpression, using return", () => {
  const input = `
	  var data = () => { return <h1>Hello from React</h1> };
	  `;

  assert(extractJSXComponents(input), {
    ArrowFunctionExpression: "<h1>Hello from React</h1>"
  });
});

it("can extract component, returning fragment", () => {
  const input = `function FragmentedComponent(props) {
		  return (<><div></div><div></div></>);
	  }`;
  assert(extractJSXComponents(input), {
    FragmentedComponent: "<div></div><div></div>"
  });
});

it("can extract component from object method", () => {
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
it("can extract component from object property", () => {
  const input = `
	  let ob = {
		  name:  <div></div>
	  };
	  `;
  assert(extractJSXComponents(input), {
    name: "<div></div>"
  });
});
it("can handle basic string declarations", () => {
  // todo fix fails
  const input = `
	  function App() {
		  const greeting5 = "Hi";
		
		  return <h1>{greeting5}</h1>;
		}
	  `;
  assert(extractJSXComponents(input), {
    App: "<h1>{{this.greeting5}}</h1>",
    App_declarated:
      '{{#let (hash greeting5="Hi") as |ctx|}}<h1>{{ctx.greeting5}}</h1>{{/let}}'
  });
});
it("can handle basic numeric declarations", () => {
  // todo fix fails
  const input = `
	  function App() {
		  const greeting3 = 42;
		
		  return <h1>{greeting3}</h1>;
		}
	  `;
  assert(extractJSXComponents(input), {
    App: "<h1>{{this.greeting3}}</h1>",
    App_declarated:
      "{{#let (hash greeting3=42) as |ctx|}}<h1>{{ctx.greeting3}}</h1>{{/let}}"
  });
});
it("can handle basic local declarations", () => {
  // todo fix fails
  const input = `
	  function App() {
		  const a = 42;
		  let b = "1";
		  var c = [1,false];
		  var d = true;
		  var e = { name : 12 };
		  return <h1>{a}{b}{c}{d}{e} and { { aa: a, bb: b, cc: c, dd: d, ee: e} }</h1>;
		}
	  `;
  assert(extractJSXComponents(input), {
    App:
      "<h1>{{this.a}}{{this.b}}{{this.c}}{{this.d}}{{this.e}} and {{hash aa=this.a bb=this.b cc=this.c dd=this.d ee=this.e}}</h1>",
    App_declarated:
      '{{#let (hash a=42 b="1" c={{array 1 false}} d=true e=(hash name=12)) as |ctx|}}<h1>{{ctx.a}}{{ctx.b}}{{ctx.c}}{{ctx.d}}{{ctx.e}} and {{hash aa=ctx.a bb=ctx.b cc=ctx.c dd=ctx.d ee=ctx.e}}</h1>{{/let}}'
  });
});
it("can handle spread as arguments for arrow function", () => {
  const input = `
	  const Headline = ({ value }) => {
		  return <h1>{value}</h1>;
		};
	  `;
  assert(extractJSXComponents(input), {
    ArrowFunctionExpression: "<h1>{{this.value}}</h1>",
    ArrowFunctionExpression_declarated: "<h1>{{@value}}</h1>"
  });
  // App.. = <h1>{{@value}}</h1>
});
it("can handle spread as arguments for named function", () => {
  const input = `
	  function Headline({ value }) {
		  return <h1>{value}</h1>;
		};
	  `;
  assert(extractJSXComponents(input), {
    Headline: "<h1>{{this.value}}</h1>",
    Headline_declarated: "<h1>{{@value}}</h1>"
  });

  // App.. = <h1>{{@value}}</h1>

  // same for
  //  const { name } = this.props;
  //return (
  //	<p>Hello, {name}</p>
  //  );
});
it("can handle spread for this.props", () => {
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

it("can handle jsx subdeclarations", () => {
  const input = `
		function Headline() {
			var tag = <div></div>;
			return <h1>{tag}</h1>;
		  };
		`;
  assert(extractJSXComponents(input), {
    Headline: "<h1>{{this.tag}}</h1>",
    Headline_declarated: "<h1><div></div></h1>",
    tag: "<div></div>"
  });
});

it("can handle jsx subdeclarations in fragments", () => {
  const input = `
		function Headline() {
			var tag = <><div></div></>;
			return <h1>{tag}</h1>;
		  };
		`;
  assert(extractJSXComponents(input), {
    Headline: "<h1>{{this.tag}}</h1>",
    Headline_declarated: "<h1><div></div></h1>",
    tag: "<div></div>"
  });
});

it("can handle jsx subdeclarations chains in fragments", () => {
  const input = `
		function Headline() {
      var foo = <><h1>Hi</h1></>;
			var tag = <><div>{foo}</div></>;
			return <h1>{tag}</h1>;
		  };
		`;
  assert(extractJSXComponents(input), {
    Headline: "<h1>{{this.tag}}</h1>",
    Headline_declarated: "<h1><div><h1>Hi</h1></div></h1>",
    foo: "<h1>Hi</h1>",
    tag: "<div>{{this.foo}}</div>",
    tag_declarated: "<div><h1>Hi</h1></div>"
  });
});

it("can handle jsx subdeclarations chains in pure nodes", () => {
  const input = `
		function Headline() {
      var foo = <h1>Hi</h1>;
			var tag = <div>{foo}</div>;
			return <h1>{tag}</h1>;
		  };
		`;
  assert(extractJSXComponents(input), {
    Headline: "<h1>{{this.tag}}</h1>",
    Headline_declarated: "<h1><div><h1>Hi</h1></div></h1>",
    foo: "<h1>Hi</h1>",
    tag: "<div>{{this.foo}}</div>",
    tag_declarated: "<div><h1>Hi</h1></div>"
  });
});

it("can handle jsx subdeclarations chains with params", () => {
  const input = `
		function Headline() {
      let bar = 1;
      var foo = <h1>{bar}</h1>;
      let zoo = 12;
			var tag = <div>{foo} {zoo}</div>;
			return <h1>{tag}</h1>;
		  };
		`;
  assert(extractJSXComponents(input), {
    Headline: "<h1>{{this.tag}}</h1>",
    Headline_declarated:
      "{{#let (hash bar=1 zoo=12) as |ctx|}}<h1><div><h1>{{ctx.bar}}</h1> {{ctx.zoo}}</div></h1>{{/let}}",
    foo: "<h1>{{this.bar}}</h1>",
    foo_declarated:
      "{{#let (hash bar=1) as |ctx|}}<h1>{{ctx.bar}}</h1>{{/let}}",
    tag: "<div>{{this.foo}} {{this.zoo}}</div>",
    tag_declarated:
      "{{#let (hash zoo=12) as |ctx|}}<div><h1>{{ctx.bar}}</h1> {{ctx.zoo}}</div>{{/let}}"
  });
});

it("can handle jsx subdeclarations and use it for filling", () => {
  const input = `
		function Headline() {
			var tag = <div></div>;
			return <h1>{tag}{tag}{tag}</h1>;
		  };
		`;
  assert(extractJSXComponents(input), {
    Headline: "<h1>{{this.tag}}{{this.tag}}{{this.tag}}</h1>",
    Headline_declarated: "<h1><div></div><div></div><div></div></h1>",
    tag: "<div></div>"
  });
});

it("can handle plain jsx", () => {
  const input = `<div></div>`;
  assert(extractJSXComponents(input), {
    root: "<div></div>"
  });
});

it("can handle complexConditional templates", () => {
  const input = `
    function MyTemplate() {
        let caseOne = <><div></div></>;
        let caseTwo = <h1></h1>;
        return <span>{a > b ? caseOne : caseTwo }</span>
    }
  `;
  assert(extractJSXComponents(input), {
    MyTemplate: "<span>{{#if (gt this.a this.b)}}<div></div>{{else}}<h1></h1>{{/if}}</span>",
    caseOne: "<div></div>",
    caseTwo: "<h1></h1>"
  });
});

// it("can handle plain basic string declaration", () => {
//   const input = `function name() { let item = "12"; return <div>{item}</div>}`;
//   assert(extractJSXComponents(input), {
//     root: "<div></div>"
//   });
// });

it("can handle components with state hook", () => {
  const input = `
	  const Headline = () => {
		  const [greeting1, setGreeting] = useState(
			'Hello Function Component!'
		  );
		
		  const handleChange = event => setGreeting(event.target.value);
		
		  return (
			<div><h1>{greeting1}</h1><input type="text" value={greeting1} onChange={handleChange} /></div>
		  );
		};
	  `;

  // {{#let (hash greeting="hello") as |ctx|}}
  //   {{let (hash updateGreeting=(action (mut ctx.greeting) value="target.value")) as |act|}}
  //      <input {{on 'change' act.updateGreeting}}>
  //   {{/let}}
  // {{/let}}
  // idea todo -> we can catch setGreeting and produce {{action (mut this.greeting)}}, or kinda
  assert(extractJSXComponents(input), {
    ArrowFunctionExpression:
      '<div><h1>{{this.greeting1}}</h1><input type="text" value={{this.greeting1}} {{on "change" this.handleChange}} /></div>',
    ArrowFunctionExpression_declarated:
      '{{#let (hash greeting1="Hello Function Component!") as |ctx|}}<div><h1>{{ctx.greeting1}}</h1><input type="text" value={{ctx.greeting1}} {{on "change" this.handleChange}} /></div>{{/let}}'
  });
});

it("can handle components with simple object state hook", () => {
  const input = `
	  const Headline = () => {
		  const [greeting12, setGreeting] = useState(
			{ a: 1, b: "2", c: [1], d: false }
		  );
		
		  const handleChange = event => setGreeting(event.target.value);
		
		  return (
			<div><h1>{greeting12}</h1><input type="text" value={greeting12} onChange={handleChange} /></div>
		  );
		};
	  `;

  assert(extractJSXComponents(input), {
    ArrowFunctionExpression:
      '<div><h1>{{this.greeting12}}</h1><input type="text" value={{this.greeting12}} {{on "change" this.handleChange}} /></div>',
    ArrowFunctionExpression_declarated:
      '{{#let (hash greeting12=(hash a=1 b="2" c=(array 1) d=false)) as |ctx|}}<div><h1>{{ctx.greeting12}}</h1><input type="text" value={{ctx.greeting12}} {{on "change" this.handleChange}} /></div>{{/let}}'
  });
});

it("can handle components with simple array state hook", () => {
  const input = `
	  const Headline = () => {
		  const [greeting12, setGreeting] = useState(
			[1,"2",false, { name : 1 }]
		  );
		
		  return (
			<h1>{greeting12}</h1>
		  );
		};
	  `;

  assert(extractJSXComponents(input), {
    ArrowFunctionExpression: "<h1>{{this.greeting12}}</h1>",
    ArrowFunctionExpression_declarated:
      '{{#let (hash greeting12=(array 1 "2" false (hash name=1))) as |ctx|}}<h1>{{ctx.greeting12}}</h1>{{/let}}'
  });
});

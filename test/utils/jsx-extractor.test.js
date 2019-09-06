"use strict";
/* eslint-env jest */
/* eslint-env node */

const {
  extractJSXComponents,
  extractComponentFromClassMethod
} = require("../../dist/utils/jsx-extractor");

function assert(left, right) {
  expect(left).toEqual(right);
}

it("can work with glimmerx template declaration", () => {
  const input = {
    type: "ClassMethod",
    start: 30,
    end: 80,
    loc: {
      start: {
        line: 2,
        column: 3
      },
      end: {
        line: 4,
        column: 5
      }
    },
    static: true,
    key: {
      type: "Identifier",
      start: 37,
      end: 45,
      loc: {
        start: {
          line: 2,
          column: 10
        },
        end: {
          line: 2,
          column: 18
        },
        identifierName: "template"
      },
      name: "template"
    },
    computed: false,
    kind: "method",
    id: null,
    generator: false,
    async: false,
    params: [],
    body: {
      type: "BlockStatement",
      start: 48,
      end: 80,
      loc: {
        start: {
          line: 2,
          column: 21
        },
        end: {
          line: 4,
          column: 5
        }
      },
      body: [
        {
          type: "ReturnStatement",
          start: 55,
          end: 74,
          loc: {
            start: {
              line: 3,
              column: 5
            },
            end: {
              line: 3,
              column: 24
            }
          },
          argument: {
            type: "JSXElement",
            start: 62,
            end: 73,
            loc: {
              start: {
                line: 3,
                column: 12
              },
              end: {
                line: 3,
                column: 23
              }
            },
            openingElement: {
              type: "JSXOpeningElement",
              start: 62,
              end: 67,
              loc: {
                start: {
                  line: 3,
                  column: 12
                },
                end: {
                  line: 3,
                  column: 17
                }
              },
              name: {
                type: "JSXIdentifier",
                start: 63,
                end: 66,
                loc: {
                  start: {
                    line: 3,
                    column: 13
                  },
                  end: {
                    line: 3,
                    column: 16
                  }
                },
                name: "div"
              },
              attributes: [],
              selfClosing: false
            },
            closingElement: {
              type: "JSXClosingElement",
              start: 67,
              end: 73,
              loc: {
                start: {
                  line: 3,
                  column: 17
                },
                end: {
                  line: 3,
                  column: 23
                }
              },
              name: {
                type: "JSXIdentifier",
                start: 69,
                end: 72,
                loc: {
                  start: {
                    line: 3,
                    column: 19
                  },
                  end: {
                    line: 3,
                    column: 22
                  }
                },
                name: "div"
              }
            },
            children: []
          }
        }
      ],
      directives: []
    }
  };

  assert(extractComponentFromClassMethod({ node: input }), "<div></div>");
});

it("support children property as yield", () => {
  const input = `export function template({children}) { return <div>{children}</div>};`;
  assert(extractJSXComponents(input), {
    template: "<div>{{this.children}}</div>",
    template_declarated: "<div>{{yield}}</div>"
  });
});

it("support children property as yield", () => {
  const input = `export function template(any) { return <div>{any.children}</div>};`;
  assert(extractJSXComponents(input), {
    template: "<div>{{this.any.children}}</div>",
    template_declarated: "<div>{{yield}}</div>"
  });
});

it("support style objects via style modifier", () => {
  const input = '<div style={{color:"red"}}></div>';
  assert(extractJSXComponents(input), {
    root: '<div {{style (hash color="red")}}></div>'
  });
});

it("support external onClick", () => {
  const input = `export function template({onClick}) {
    return   <img onClick={onClick} />;
}`;
  assert(extractJSXComponents(input), {
    template: '<img {{on "click" @onClick}} />'
  });
});

it("support optional actions", () => {
  const input = `<img onClick={optional(onClick)} />`;
  assert(extractJSXComponents(input), {
    root: '<img {{on "click" (optional onClick)}} />'
  });
});
it("support optional external actions", () => {
  const input = `export default function template({onClick}) { return <img onClick={optional(onClick)} /> }`;
  assert(extractJSXComponents(input), {
    template: '<img {{on "click" (optional @onClick)}} />'
  });
});
it("support style modifier over components", () => {
  const input = `<ConfLogo style={{width:'20px', 'background-color': 'red'}} />`;
  assert(extractJSXComponents(input), {
    root: '<ConfLogo {{style (hash width="20px" background-color="red")}} />'
  });
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
it("can support react sketchapp examples", () => {
  const input = `
  const Swatch = ({ name, hex }: SwatchProps) => (
    <View name={name} style={{ height: 96, width: 96, margin: 4, backgroundColor: hex, padding: 8 }} > <Text name="Swatch Name" style={{ color: textColor(hex), fontWeight: 'bold' }} >{name}</Text> <Text name="Swatch Hex" style={{ color: textColor(hex) }}>{hex}</Text> </View>
  );
  
  `;
  assert(extractJSXComponents(input), {
    ArrowFunctionExpression:
      '<View @name={{@name}} {{style (hash height=96 width=96 margin=4 backgroundColor=@hex padding=8)}}> <Text @name="Swatch Name" {{style (hash color=(textColor @hex) fontWeight="bold")}}>{{@name}}</Text> <Text @name="Swatch Hex" {{style (hash color=(textColor @hex))}}>{{@hex}}</Text> </View>'
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
      '{{#let (hash a=42 b="1" c=(array 1 false) d=true e=(hash name=12)) as |ctx|}}<h1>{{ctx.a}}{{ctx.b}}{{ctx.c}}{{ctx.d}}{{ctx.e}} and {{hash aa=ctx.a bb=ctx.b cc=ctx.c dd=ctx.d ee=ctx.e}}</h1>{{/let}}'
  });
});
it("can handle spread as arguments for arrow function", () => {
  const input = `
	  const Headline = ({ value }) => {
		  return <h1>{value}</h1>;
		};
	  `;
  assert(extractJSXComponents(input), {
    ArrowFunctionExpression: "<h1>{{@value}}</h1>"
  });
  // App.. = <h1>{{@value}}</h1>
});
it("can handle basic array join", () => {
  const input = `
	  const Headline = ({ value }) => {
      const result = value.join("a");
		  return <h1>{result}</h1>;
		};
	  `;
  assert(extractJSXComponents(input), {
    ArrowFunctionExpression: "<h1>{{this.result}}</h1>",
    ArrowFunctionExpression_declarated:
      '{{#let (hash result=(join @value "a")) as |ctx|}}<h1>{{ctx.result}}</h1>{{/let}}'
  });
});
it("can handle basic array includes", () => {
  const input = `
	  const Headline = ({ value }) => {
      const result = value.includes("a");
		  return <h1>{result}</h1>;
		};
	  `;
  assert(extractJSXComponents(input), {
    ArrowFunctionExpression: "<h1>{{this.result}}</h1>",
    ArrowFunctionExpression_declarated:
      '{{#let (hash result=(contains @value "a")) as |ctx|}}<h1>{{ctx.result}}</h1>{{/let}}'
  });
});
it("can handle basic array reverse", () => {
  const input = `
	  const Headline = ({ value }) => {
      const result = value.reverse();
		  return <h1>{result}</h1>;
		};
	  `;
  assert(extractJSXComponents(input), {
    ArrowFunctionExpression: "<h1>{{this.result}}</h1>",
    ArrowFunctionExpression_declarated:
      "{{#let (hash result=(reverse @value)) as |ctx|}}<h1>{{ctx.result}}</h1>{{/let}}"
  });
});
it("can handle basic array reduce", () => {
  const input = `
	  const Headline = ({ value, reducer }) => {
      const result = value.reduce(reducer, 0);
		  return <h1>{result}</h1>;
		};
	  `;
  assert(extractJSXComponents(input), {
    ArrowFunctionExpression: "<h1>{{this.result}}</h1>",
    ArrowFunctionExpression_declarated:
      "{{#let (hash result=(reduce @reducer @value 0)) as |ctx|}}<h1>{{ctx.result}}</h1>{{/let}}"
  });
});
it("can handle basic array map", () => {
  const input = `
	  const Headline = ({ value, reducer }) => {
      const result = value.map(reducer);
		  return <h1>{result}</h1>;
		};
	  `;
  assert(extractJSXComponents(input), {
    ArrowFunctionExpression: "<h1>{{this.result}}</h1>",
    ArrowFunctionExpression_declarated:
      "{{#let (hash result=(map @reducer @value)) as |ctx|}}<h1>{{ctx.result}}</h1>{{/let}}"
  });
});
it("can handle basic array slice", () => {
  const input = `
	  const Headline = ({ value }) => {
      const result = value.slice(0, 12);
		  return <h1>{result}</h1>;
		};
	  `;
  assert(extractJSXComponents(input), {
    ArrowFunctionExpression: "<h1>{{this.result}}</h1>",
    ArrowFunctionExpression_declarated:
      "{{#let (hash result=(slice 0 12 @value)) as |ctx|}}<h1>{{ctx.result}}</h1>{{/let}}"
  });
});
it("can handle basic array append", () => {
  const input = `
	  const Headline = ({ value }) => {
      const result = value.append(12);
		  return <h1>{result}</h1>;
		};
	  `;
  assert(extractJSXComponents(input), {
    ArrowFunctionExpression: "<h1>{{this.result}}</h1>",
    ArrowFunctionExpression_declarated:
      "{{#let (hash result=(append @value 12)) as |ctx|}}<h1>{{ctx.result}}</h1>{{/let}}"
  });
});
it("can handle basic array filter", () => {
  const input = `
	  const Headline = ({ value, reducer }) => {
      const result = value.filter(reducer);
		  return <h1>{result}</h1>;
		};
	  `;
  assert(extractJSXComponents(input), {
    ArrowFunctionExpression: "<h1>{{this.result}}</h1>",
    ArrowFunctionExpression_declarated:
      "{{#let (hash result=(filter @reducer @value)) as |ctx|}}<h1>{{ctx.result}}</h1>{{/let}}"
  });
});
it("can handle complex path array filter", () => {
  const input = `
	  const Headline = ({ value, reducer }) => {
      const result = value.name.filter(reducer);
		  return <h1>{result}</h1>;
		};
	  `;
  assert(extractJSXComponents(input), {
    ArrowFunctionExpression: "<h1>{{this.result}}</h1>",
    ArrowFunctionExpression_declarated:
      "{{#let (hash result=(filter @reducer @value.name)) as |ctx|}}<h1>{{ctx.result}}</h1>{{/let}}"
  });
});
it("can handle spread as arguments for named function", () => {
  const input = `
	  function Headline({ value }) {
		  return <h1>{value}</h1>;
		};
	  `;
  assert(extractJSXComponents(input), {
    Headline: "<h1>{{@value}}</h1>"
  });

  // App.. = <h1>{{@value}}</h1>

  // same for
  //  const { name } = this.props;
  //return (
  //	<p>Hello, {name}</p>
  //  );
});
it("can handle local variables composition", () => {
  const input = `
  const Headline = ({ value, reducer, matcher }) => {
    const result = value.name.map(reducer);
    const filteredResult = result.filter(matcher);
    return <h1>{filteredResult}</h1>;
  };
  `;
  assert(extractJSXComponents(input), {
    ArrowFunctionExpression: "<h1>{{this.filteredResult}}</h1>",
    ArrowFunctionExpression_declarated:
      "{{#let (hash filteredResult=(filter @matcher (map @reducer @value.name))) as |ctx|}}<h1>{{ctx.filteredResult}}</h1>{{/let}}"
  });
});
it("can handle spread for this.props", () => {
  const input = `
	  function Headline() {
		  const { value } = this.props;
		  return <h1>{value}</h1>;
		};
	  `;
  assert(extractJSXComponents(input), {
    Headline: "<h1>{{@value}}</h1>"
  });
});
it("can handle listed call chains", () => {
  const input = `
	  function Headline({data, dataMapper, dataReducer, dataFilter}) {
      const preResult = data.map(dataMapper);
      const prePreResult = preResult.reduce(dataReducer, 0);
      const result = prePreResult.filter(dataFilter);
      return <h1>{result}</h1>;
		};
	  `;
  assert(extractJSXComponents(input), {
    Headline: "<h1>{{this.result}}</h1>",
    Headline_declarated:
      "{{#let (hash result=(filter @dataFilter (reduce @dataReducer (map @dataMapper @data) 0))) as |ctx|}}<h1>{{ctx.result}}</h1>{{/let}}"
  });
});
it("can handle concatinated attribute values", () => {
  const input =
    'function Headline({foo, bar}) { let className = `${foo ? "foo" : ""} ${bar}`; return <h1 class={className}>Hi</h1>;}';
  assert(extractJSXComponents(input), {
    Headline: "<h1 class={{this.className}}>Hi</h1>",
    Headline_declarated:
      '{{#let (hash className=(concat "" (if @foo "foo" "") " " @bar "")) as |ctx|}}<h1 class={{ctx.className}}>Hi</h1>{{/let}}'
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
it("can support undefined", () => {
  const input = `
		function Headline() {
			var tag =  undefined
			return <h1>{tag}</h1>;
		  };
		`;
  assert(extractJSXComponents(input), {
    Headline: "<h1>{{this.tag}}</h1>",
    Headline_declarated:
      "{{#let (hash tag=undefined) as |ctx|}}<h1>{{ctx.tag}}</h1>{{/let}}"
  });
});
it("can support null", () => {
  const input = `
		function Headline() {
			var tag =  null
			return <h1>{tag}</h1>;
		  };
		`;
  assert(extractJSXComponents(input), {
    Headline: "<h1>{{this.tag}}</h1>",
    Headline_declarated:
      "{{#let (hash tag=null) as |ctx|}}<h1>{{ctx.tag}}</h1>{{/let}}"
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

it("can handle basic jsx classes", () => {
  const input = `
  // app/components/my-react-component.js
import React from 'react';
import WithEmberSupport from 'ember-react-components';

@WithEmberSupport
export default class extends React.Component {
  render() {
    const { name } = this.props;

    return (
      <p>Hello, {name}</p>
    );
  }
}
  `;

  assert(extractJSXComponents(input), {
    render: "<p>Hello, {{this.name}}</p>",
    render_declarated: "<p>Hello, {{@name}}</p>"
  });
});

it("can handle inline arrays in fragments", () => {
  const input = `
 export function template() {
  return  <ul class="companies">{
    [{
      name: "Widgets",
      contacts: [
        { name: "Chad", email: "345@gmail.com", phone: "123" }
      ]
	  }].map((company) => <><li class="company"><Company company={company}/></li></>)
	}</ul>;

 }
  `;

  assert(extractJSXComponents(input), {
    ArrowFunctionExpression:
      '<li class="company"><Company @company={{@company}} /></li>',
    template:
      '<ul class="companies">{{#each (array (hash name="Widgets" contacts=(array (hash name="Chad" email="345@gmail.com" phone="123")))) as |company|}}<li class="company"><Company @company={{company}} /></li>{{/each}}</ul>'
  });
});

it("can handle inline arrays", () => {
  const input = `
 export function template() {
  return  <ul class="companies">{
    [{
      name: "Widgets",
      contacts: [
        { name: "Chad", email: "345@gmail.com", phone: "123" }
      ]
	  }].map((company) => <li class="company"><Company company={company}/></li>)
	}</ul>;

 }
  `;
  assert(extractJSXComponents(input), {
    ArrowFunctionExpression:
      '<li class="company"><Company @company={{@company}} /></li>',
    template:
      '<ul class="companies">{{#each (array (hash name="Widgets" contacts=(array (hash name="Chad" email="345@gmail.com" phone="123")))) as |company|}}<li class="company"><Company @company={{company}} /></li>{{/each}}</ul>'
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
    MyTemplate:
      "<span>{{#if (gt this.a this.b)}}<div></div>{{else}}<h1></h1>{{/if}}</span>",
    caseOne: "<div></div>",
    caseTwo: "<h1></h1>"
  });
});

it("can handle complexSingleConditional fragment templates", () => {
  const input = `
    function MyTemplate() {
        let caseOne = <><div></div></>;
        return <span>{ b && caseOne }</span>
    }
  `;
  assert(extractJSXComponents(input), {
    MyTemplate: "<span>{{#if this.b}}<div></div>{{/if}}</span>",
    caseOne: "<div></div>"
  });
});

it("can handle paths from args", () => {
  const input = `
  function Mailbox({unreadMessages}) {
    return (<div><h1>Hi</h1>{unreadMessages.length > 0 && <h2>You have {unreadMessages.length}</h2>}</div>);
  };
  `;
  assert(extractJSXComponents(input), {
    Mailbox:
      "<div><h1>Hi</h1>{{#if (gt this.unreadMessages.length 0)}}<h2>You have {{this.unreadMessages.length}}</h2>{{/if}}</div>",
    Mailbox_declarated:
      "<div><h1>Hi</h1>{{#if (gt @unreadMessages.length 0)}}<h2>You have {{@unreadMessages.length}}</h2>{{/if}}</div>"
  });
});

it("can handle paths from local vars", () => {
  const input = `
  function Mailbox({unreadMessages}) {
    let user = { name: "mike" };
    return (<div><h1>Hi</h1>{unreadMessages.length > 0 && <h2>{user.name} You have {unreadMessages.length}</h2>}</div>);
  };
  `;
  assert(extractJSXComponents(input), {
    Mailbox:
      "<div><h1>Hi</h1>{{#if (gt this.unreadMessages.length 0)}}<h2>{{this.user.name}} You have {{this.unreadMessages.length}}</h2>{{/if}}</div>",
    Mailbox_declarated:
      '{{#let (hash user=(hash name="mike")) as |ctx|}}<div><h1>Hi</h1>{{#if (gt @unreadMessages.length 0)}}<h2>{{ctx.user.name}} You have {{@unreadMessages.length}}</h2>{{/if}}</div>{{/let}}'
  });
});

it("can handle paths from context", () => {
  const input = `
  function Mailbox({unreadMessages}) {
    return (<div><h1>Hi</h1>{unreadMessages.length > 0 && <h2>{this.user.name} You have {unreadMessages.length}</h2>}</div>);
  };
  `;
  assert(extractJSXComponents(input), {
    Mailbox:
      "<div><h1>Hi</h1>{{#if (gt this.unreadMessages.length 0)}}<h2>{{this.user.name}} You have {{this.unreadMessages.length}}</h2>{{/if}}</div>",
    Mailbox_declarated:
      "<div><h1>Hi</h1>{{#if (gt @unreadMessages.length 0)}}<h2>{{this.user.name}} You have {{@unreadMessages.length}}</h2>{{/if}}</div>"
  });
});

it("can handle default assign cases", () => {
  const input = `
  function Mailbox({unreadMessages}) {
    let name = unreadMessages || 12;
    return (<div>{name}</div>);
  };
  `;
  assert(extractJSXComponents(input), {
    Mailbox: "<div>{{this.name}}</div>",
    Mailbox_declarated:
      "{{#let (hash name=(or @unreadMessages 12)) as |ctx|}}<div>{{ctx.name}}</div>{{/let}}"
  });
});

it("can handle default ternary assign cases", () => {
  const input = `
  function Mailbox({unreadMessages}) {
    let name = unreadMessages > 1 ? 4 : 5;
    return (<div>{name}</div>);
  };
  `;
  assert(extractJSXComponents(input), {
    Mailbox: "<div>{{this.name}}</div>",
    Mailbox_declarated:
      "{{#let (hash name=(if (gt @unreadMessages 1) 4 5)) as |ctx|}}<div>{{ctx.name}}</div>{{/let}}"
  });
});

it("can handle complexSingleConditionalItems templates", () => {
  const input = `
    function MyTemplate() {
        let caseOne = <div></div>;
        return <span>{ b && caseOne }</span>
    }
  `;
  assert(extractJSXComponents(input), {
    MyTemplate: "<span>{{#if this.b}}<div></div>{{/if}}</span>",
    caseOne: "<div></div>"
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

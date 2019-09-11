"use strict";
/* eslint-env jest */
/* eslint-env node */

const { print } = require("@glimmer/syntax");
const { parseScriptFile } = require("../../dist/utils/js-utils");
const { cast, casterTrace } = require("../../dist/utils/jsx-caster");

it("can hanldle simple tags", () => {
  const input = `(<div></div>);`;
  assert(toHBS(input), "<div></div>");
});

it("can hanldle simple nested tags", () => {
  const input = `(<div><span></span></div>);`;
  assert(toHBS(input), "<div><span></span></div>");
});

it("can hanldle simple dyncamic values", () => {
  const input = `(<div>{foo}</div>);`;
  assert(toHBS(input), "<div>{{this.foo}}</div>");
});

it("can hanldle dyncamic values from paths", () => {
  const input = `(<div>{foo.bar.baz}</div>);`;
  assert(toHBS(input), "<div>{{this.foo.bar.baz}}</div>");
});

it("can handle simple fn calls", () => {
  const input = `(<div>{format(baz)}</div>);`;
  assert(toHBS(input), "<div>{{format baz}}</div>");
});

it("can handle simple loops", () => {
  const input = `(<div>{items.map((el)=>(<div>{el}</div>))}</div>);`;
  assert(
    toHBS(input),
    "<div>{{#each this.items as |el|}}<div>{{el}}</div>{{/each}}</div>"
  );
});

it("can hanldle ternary expressions", () => {
  const input = `(<div>{a ? b : c}</div>);`;
  assert(toHBS(input), "<div>{{if this.a this.b this.c}}</div>");
});

it("can handle ternary jsx and string", ()=>{
  const input = `<div>{a ? <br /> : "HelloWorld"}</div>`;
  assert(toHBS(input), '<div>{{#if this.a}}<br />{{else}}HelloWorld{{/if}}</div>');
});

it("can handle deep ternary jsx", ()=>{
  const input = `<div>{a ? (b ? 1 : <br />) : "HelloWorld"}</div>`;
  assert(toHBS(input), '<div>{{#if this.a}}{{#if this.b}}1{{else}}<br />{{/if}}{{else}}HelloWorld{{/if}}</div>');
});

it("can handle spread properties assign", ()=> {
  const input = `<Cmp {...{ a, b, }} />`;
  assert(toHBS(input), '<Cmp @a={{this.a}} @b={{this.b}} />');
});

it("can handle crreepy expressions #1", () => {
  const input = `<div>{foo && <Cmp />}</div>`;
  assert(toHBS(input), '<div>{{#if this.foo}}<Cmp />{{/if}}</div>');
});

it("can handle crreepy expressions #2", () => {
  const input = `<div>{foo === somevalue && <Cmp />}</div>`;
  assert(toHBS(input), '<div>{{#if (eq this.foo this.somevalue)}}<Cmp />{{/if}}</div>');
});

it("can handle crreepy expressions #3", () => {
  const input = `<div>{!foo && <Cmp />}</div>`;
  assert(toHBS(input), '<div>{{#if (not this.foo)}}<Cmp />{{/if}}</div>');
});

it("can handle crreepy expressions #4", () => {
  const input = `<div>{foo !== somevalue && <Cmp />}</div>`;
  assert(toHBS(input), '<div>{{#if (not-eq this.foo this.somevalue)}}<Cmp />{{/if}}</div>');
});

it("can handle crreepy expressions #5", () => {
  const input = `<div>{arr.length > 0 && <Cmp />}</div>`;
  assert(toHBS(input), '<div>{{#if (gt this.arr.length 0)}}<Cmp />{{/if}}</div>');
});


it("can handle crreepy expressions #6", () => {
  const input = `<div>{arr.length === 0 && <Cmp />}</div>`;
  assert(toHBS(input), '<div>{{#if (eq this.arr.length 0)}}<Cmp />{{/if}}</div>');
});


it("can handle crreepy expressions #7", () => {
  const input = `<div>{foo ? <CmpA /> : <CmpB />}</div>`;
  assert(toHBS(input), '<div>{{#if this.foo}}<CmpA />{{else}}<CmpB />{{/if}}</div>');
});

// it("can handle crreepy expressions #8", () => {
//   const input = `<div>{{
//     caseA: () => <CmpA />,
//     caseB: () => <CmpB />,
//     undefined: () => <CmpC />
//   }[switchValue]()}</div>`;
//   assert(toHBS(input), '<div>{{#if this.foo}}<CmpA />{{else}}<CmpB />{{/if}}</div>');
// });

it("can handle crreepy expressions #9", () => {
  const input = `<div>{condA ? (
    <CmpA />
  ) : condB ? (
    <CmpB />
  ) : condC ? (
    <CmpC />
  ) : (
    <CmpD />
  )}</div>`;
  assert(toHBS(input), '<div>{{#if this.condA}}<CmpA />{{else}}{{#if this.condB}}<CmpB />{{else}}{{#if this.condC}}<CmpC />{{else}}<CmpD />{{/if}}{{/if}}{{/if}}</div>');
});

it("can hanldle nested ternary expressions", () => {
  const input = `(<div>{a ? (d ? e : (g ? n : g)) : c}</div>);`;
  assert(
    toHBS(input),
    "<div>{{if this.a (if this.d this.e (if this.g this.n this.g)) this.c}}</div>"
  );
});

it("can handle functions inside ternary expressions", () => {
  const input = `(<div>{a ? b : d(c)}</div>);`;
  assert(toHBS(input), "<div>{{if this.a this.b (d c)}}</div>");
});

it("can handle simple logical expression", () => {
  const input = `(<div>{1 > 0 && <h2></h2>}</div>);`;
  assert(toHBS(input), "<div>{{#if (gt 1 0)}}<h2></h2>{{/if}}</div>");
});

it("can handle ternary string case", () => {
  const input = `(<div>User <b>{isLoggedIn ? 'logged' : 'not logged'}</b> inside admin page.</div>);`;
  assert(
    toHBS(input),
    '<div>User <b>{{if this.isLoggedIn "logged" "not logged"}}</b> inside admin page.</div>'
  );
});

it("can handle complex conditions", () => {
  const input = `(
        <div>{isLoggedIn ? (<LogoutButton onClick={this.handleLogoutClick} />) : (<LoginButton onClick={this.handleLoginClick} />)}</div>
      );`;
  assert(
    toHBS(input),
    "<div>{{#if this.isLoggedIn}}<LogoutButton @onClick={{this.handleLogoutClick}} />{{else}}<LoginButton @onClick={{this.handleLoginClick}} />{{/if}}</div>"
  );
});

it("can handle complex conditions with fragments", () => {
  const input = `(
        <div>{isLoggedIn ? (<><LogoutButton /><LogoutButton /></>) : (<><LogoutButton /><LogoutButton /></>)}</div>
      );`;
  assert(
    toHBS(input),
    "<div>{{#if this.isLoggedIn}}<LogoutButton /><LogoutButton />{{else}}<LogoutButton /><LogoutButton />{{/if}}</div>"
  );
});

it("can assign component props", () => {
  const input = `(<LogoutButton onClick={this.onClick} />);`;
  assert(toHBS(input), "<LogoutButton @onClick={{this.onClick}} />");
});

it("keep dom attrs", () => {
  const input = `(<src onClick={this.onClick} />);`;
  assert(toHBS(input), '<src {{on "click" this.onClick}} />');
});

it("can handle basic this.props values", () => {
  const input = `(<h1>Hello, {this.props.name}</h1>);`;
  assert(toHBS(input), "<h1>Hello, {{@name}}</h1>");
});

it("can handle basic props values", () => {
  const input = `(<h1>Hello, {props.name}</h1>);`;
  assert(toHBS(input), "<h1>Hello, {{@name}}</h1>");
});

it("can handle props in simple expressions", () => {
  const input = `(<h1>Hello, {props.name ? <Login /> : <Logout /> }</h1>);`;
  assert(
    toHBS(input),
    "<h1>Hello, {{#if @name}}<Login />{{else}}<Logout />{{/if}}</h1>"
  );
});

it("can handle props as component args", () => {
  const input = `(<MyComponent name={this.props.name} />);`;
  assert(toHBS(input), "<MyComponent @name={{@name}} />");
});

it("can handle boolean component arguments", () => {
  const input = `(<MyComponent name={false} />);`;
  assert(toHBS(input), "<MyComponent @name={{false}} />");
});

it("can handle string component arguments", () => {
  const input = `(<MyComponent name={"false"} />);`;
  assert(toHBS(input), '<MyComponent @name="false" />');
});

it("can handle numeric component arguments", () => {
  const input = `(<MyComponent name={42} />);`;
  assert(toHBS(input), "<MyComponent @name={{42}} />");
});

it("can transform className on html tags", () => {
  const input = `(<img className="Avatar" src={props.user.avatarUrl} alt={props.user.name}/>);`;
  assert(
    toHBS(input),
    '<img class="Avatar" src={{@user.avatarUrl}} alt={{@user.name}} />'
  );
});

it("can handle basic math, %", () => {
  const input = `(<div>{total % INTERVAL}</div>);`;
  assert(toHBS(input), "<div>{{mod this.total this.INTERVAL}}</div>");
});

it("can handle basic math, Math.round", () => {
  const input = `(<div>{Math.round(age)}</div>);`;
  assert(toHBS(input), "<div>{{round age}}</div>");
});

it("can handle basic math, Math.ceil", () => {
  const input = `(<div>{Math.ceil(age)}</div>);`;
  assert(toHBS(input), "<div>{{ceil age}}</div>");
});

it("can handle tricky math cases", () => {
  const input = `(<span>{Math.round(value/INTERVAL/60)} : </span>);`;
  assert(
    toHBS(input),
    "<span>{{round (div (div this.value this.INTERVAL) 60)}} : </span>"
  );
});

it("can handle increment case", () => {
  const input = `(<span>{i++}</span>);`;
  assert(toHBS(input), "<span>{{inc this.i}}</span>");
});

it("support nullable rendering cases", () => {
  const input = `(<div>{this.state.isDangerAlertShowed ? <DangerAlert text={'Danger'} /> : null}</div>);`;
  assert(
    toHBS(input),
    '<div>{{#if this.state.isDangerAlertShowed}}<DangerAlert @text="Danger" />{{/if}}</div>'
  );
});

it("can add modifiers for dom event handing", () => {
  const input = `(<form onSubmit={this.onSubmit}></form>);`;
  assert(toHBS(input), '<form {{on "submit" this.onSubmit}}></form>');
});

it("can convert dom attributes to normal names", () => {
  const input = `(<form tabIndex="42"></form>);`;
  assert(toHBS(input), '<form tabindex="42"></form>');
});

it("support yield", () => {
  const input = `(<form>{this.props.children}</form>);`;
  assert(toHBS(input), "<form>{{yield}}</form>");
});

it("support hashes", () => {
  const input = `(<MyComponent data={{name: 1, label: "d", key: false, value: record}} />);`;
  assert(
    toHBS(input),
    '<MyComponent @data={{hash name=1 label="d" key=false value=this.record}} />'
  );
});

it("support hashes as subparams", () => {
  const input = `(<MyComponent data={{name: { value: 42 }}} />);`;
  assert(toHBS(input), "<MyComponent @data={{hash name=(hash value=42)}} />");
});

it("support strings as hash keys", () => {
  const input = `(<MyComponent data={{["my-prop"]: 12}} />);`;
  assert(toHBS(input), "<MyComponent @data={{hash my-prop=12}} />");
});

it("support basic arrays", () => {
  const input = `(<MyComponent data={[1,"2",false,{ foo: 1 }]} />);`;
  assert(
    toHBS(input),
    '<MyComponent @data={{array 1 "2" false (hash foo=1)}} />'
  );
});

it("support nested arrays", () => {
  const input = `(<MyComponent data={[1,"2",[3, true],{ foo: [ 42, "11" ] }]} />);`;
  assert(
    toHBS(input),
    '<MyComponent @data={{array 1 "2" (array 3 true) (hash foo=(array 42 "11"))}} />'
  );
});

it("support template strings using concat", () => {
  const input = "(<MyComponent name={`foo${bar}1`} />);";
  assert(toHBS(input), '<MyComponent @name={{concat "foo" this.bar "1"}} />');
});

it("support string concatination", () => {
  const input = '(<MyComponent name={"3" + 2} />);';
  assert(toHBS(input), '<MyComponent @name={{inc "3" 2}} />');
});

it("support angle components attrs", () => {
  const input = '(<MyComponent attr-name="2" prop="42" />);';
  assert(toHBS(input), '<MyComponent name="2" @prop="42" />');
});

it("support data-attrs components", () => {
  const input = '(<MyComponent data-name="foo" />);';
  assert(toHBS(input), '<MyComponent data-name="foo" />');
});

it("support action", () => {
  const input = '(<MyComponent name={action("foo")} />);';
  assert(toHBS(input), '<MyComponent @name={{action "foo"}} />');
});

it("support this refs", () => {
  const input = "(<div>{log(this)}</div>);";
  assert(toHBS(input), "<div>{{log this}}</div>");
});

it("support ...attributes", () => {
  const input = "(<div attributes></div>);";
  assert(toHBS(input), "<div ...attributes></div>");
});

it("support modifiers for DOM elements", () => {
  const input = '(<div mod-style={{color: "face8d"}}></div>);';
  assert(toHBS(input), '<div {{style (hash color="face8d")}}></div>');
});
it("support modifiers for Components elements", () => {
  const input = '(<MyComponent mod-style={{color: "face8d"}} />);';
  assert(toHBS(input), '<MyComponent {{style (hash color="face8d")}} />');
});
it("support array as modifier argument", () => {
  const input = "(<MyComponent mod-style={[1]} />);";
  assert(toHBS(input), "<MyComponent {{style (array 1)}} />");
});
it("support modifier having multiple arguments", () => {
  const input =
    '(<MyComponent mod-style={[1],2,"3",foo,{ color: "green"}} />);';
  assert(
    toHBS(input),
    '<MyComponent {{style (array 1) 2 "3" this.foo (hash color="green")}} />'
  );
});
it("support yelding components context", () => {
  const input = `(<MyComponent as={foo,bar,baz}>{foo}</MyComponent>);`;
  assert(toHBS(input), "<MyComponent as |foo bar baz|>{{foo}}</MyComponent>");
});
it("support yelding components context deep access", () => {
  const input = `(<MyComponent as={foo}>{foo.name}</MyComponent>);`;
  assert(toHBS(input), "<MyComponent as |foo|>{{foo.name}}</MyComponent>");
});
it("support complex yield", () => {
  const input = `(<div>{yield(name, {foo:1})}</div>);`;
  assert(toHBS(input), "<div>{{yield name (hash foo=1)}}</div>");
});
it("support inline arrays join", () => {
  const input = `<li className={['carousel-item', this.state.isActived === index ? 'actived': ''].join(' ')} ></li>`;
  assert(toHBS(input), '<li class={{join (array "carousel-item" (if (eq this.state.isActived this.index) "actived" "")) " "}}></li>');
})
it("support basic yield", () => {
  const input = `(<div>{yield()}</div>);`;
  assert(toHBS(input), "<div>{{yield}}</div>");
});
it("able to support component to property assign", () => {
  const input = `(<MyComponent secondComponent={<FooBar />} />);`;
  assert(toHBS(input), '<MyComponent @secondComponent={{component "FooBar"}} />');
});
it("able handle string component params", () => {
  const input = `(<MyComponent name="alex" />);`;
  assert(toHBS(input), '<MyComponent @name="alex" />');
});
it("able to support component to property assign with params", () => {
  const input = `(<MyComponent secondComponent={<FooBar name="alex" age={-1} />} />);`;
  assert(toHBS(input), '<MyComponent @secondComponent={{component "FooBar" name="alex" age=-1}} />');
});
it("able to work with nested components assigment on props", () => {
  const input = `(<MyComponent secondComponent={<FooBar a="a" c={<BarBaz b={<Boo />} />} />} />);`;
  assert(toHBS(input), '<MyComponent @secondComponent={{component "FooBar" a="a" c=(component "BarBaz" b=(component "Boo"))}} />');
})
it("support basic props mapping with array fn", () => {
  const input = `(<ul>{props.todos.map(todo => <TodoItem key={todo.id} todo={todo} onToggle={props.onToggle} />)}</ul>);`;
  assert(
    toHBS(input),
    "<ul>{{#each @todos as |todo|}}<TodoItem @key={{todo.id}} @todo={{todo}} @onToggle={{@onToggle}} />{{/each}}</ul>"
  );
});
it("support basic props mapping with array fn as return", () => {
  const input = `(<ul>{this.props.todos.map(todo => { return <TodoItem key={todo.id} todo={todo} onToggle={props.onToggle} />})}</ul>);`;
  assert(
    toHBS(input),
    "<ul>{{#each @todos as |todo|}}<TodoItem @key={{todo.id}} @todo={{todo}} @onToggle={{@onToggle}} />{{/each}}</ul>"
  );
});
it("support basic props mapping with true fn", () => {
  const input = `(<ul>{this.props.todos.map(function(todo){ return <TodoItem key={todo.id} todo={todo} onToggle={props.onToggle} />})}</ul>);`;
  assert(
    toHBS(input),
    "<ul>{{#each @todos as |todo|}}<TodoItem @key={{todo.id}} @todo={{todo}} @onToggle={{@onToggle}} />{{/each}}</ul>"
  );
});
it("support basic props mapping with true fn and multiple returns", () => {
  const input = `(<ul>{this.props.todos.map(function(todo){ return <><TodoItem key={todo.id} todo={todo} onToggle={props.onToggle} /><div></div></>})}</ul>);`;
  assert(
    toHBS(input),
    "<ul>{{#each @todos as |todo|}}<TodoItem @key={{todo.id}} @todo={{todo}} @onToggle={{@onToggle}} /><div></div>{{/each}}</ul>"
  );
});
it("support simple computed expressions", () => {
  const input = `<div>{items[name]}</div>`;
  assert(toHBS(input), "<div>{{get this.items this.name}}</div>");
});
it("support complex computed expressions", () => {
  const input = `<div>{items[name][bar][baz]}</div>`;
  assert(
    toHBS(input),
    "<div>{{get (get (get this.items this.name) this.bar) this.baz}}</div>"
  );
});
it("support objec keys iterators", () => {
  const input = `<div>{Object.keys(colors).map(color => (<Swatch name={color} />))}</div>`;
  assert(
    toHBS(input),
    "<div>{{#each-in colors as |color|}}<Swatch @name={{color}} />{{/each-in}}</div>"
  );
});
it("support basic types", () => {
  const input = `
  <div>{item.name}</div>
  interface FooProp {
    name: string;
    X: number;
    Y: number;
  }
  `;
  assert(toHBS(input), "<div>{{this.item.name}}</div>");
});
it("can return components map from pure functions input", () => {
  const input = `
     function SuccessMessage(props) {
        return (<div className={'message message_success'}><MessageContent title={props.title}>{props.children}</MessageContent></div>);
      }
    
      function MessageContent(props) {
        return (<p className="message__content"><h3 className="message__title">{props.title}</h3><p className="message__text">{props.children}</p></p>);
      }
      function App(){
        return (<p><SuccessMessage title="Succes">Done!</SuccessMessage></p>);
      }
    `;

  let components = {};
  let functions = parseScriptFile(input, {
    filename: "dummy.tsx",
    parserOpts: { isTSX: true }
  }).program.body.filter(el => el.type === "FunctionDeclaration");

  functions.forEach(fn => {
    components[fn.id.name] = print(cast(fn.body.body[0].argument));
  });

  expect(components).toHaveProperty(
    "SuccessMessage",
    '<div class="message message_success"><MessageContent @title={{@title}}>{{yield}}</MessageContent></div>'
  );
  expect(components).toHaveProperty(
    "MessageContent",
    '<p class="message__content"><h3 class="message__title">{{@title}}</h3><p class="message__text">{{yield}}</p></p>'
  );
  expect(components).toHaveProperty(
    "App",
    '<p><SuccessMessage @title="Succes">Done!</SuccessMessage></p>'
  );
});

function fromJSX(input) {
  return cast(
    parseScriptFile(input, {
      filename: Math.random() + "-.tsx",
      parserOpts: { isTSX: true }
    }).program.body[0].expression
  );
}

function toHBS(input, debug = false) {
  if (debug) {
    casterTrace(true);
  }
  let result = fromJSX(input);
  if (debug) {
    casterTrace(false);
  }
  if (debug) {
    console.log(JSON.stringify(result));
  }
  return print(result).trim();
}

function assert(left, right) {
  expect(left).toEqual(right);
}

// do we need support this case?
// function MyComponent({name}) {
// 	let localName = "idea";
// 	let localAge = 12;
//  let external = name;
// 	let isEnabled = true;
// 	let localList = [1,"2",true,{name: 1}];
// 	return (<div>{name} {localName} {localAge} {isEnabled} {localList} {external}</div>);
// }

// {{let (hash
// 	localName = "idea"
// 	localAge = 12
// 	isEnabled = true
//  external = @name
// 	localList = (array 1 "2" true (hash name = 1))
// ) as |ctx|}}

// 	<div>{{@name}} {{ctx.localName}} {{ctx.localAge}} {{ctx.isEnabled}} {{ctx.localList}} {{ctx.name}}</div>

// {{/let}}

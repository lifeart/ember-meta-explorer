"use strict";
/* eslint-env jest */
/* eslint-env node */

const { print } = require("@glimmer/syntax");
const { parseScriptFile } = require("../../dist/utils/js-utils");
const { cast } = require("../../dist/utils/jsx-caster");

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
    "<div>{{#if this.isLoggedIn}}<LogoutButton @onClick={{this.handleLogoutClick}}></LogoutButton>{{else}}<LoginButton @onClick={{this.handleLoginClick}}></LoginButton>{{/if}}</div>"
  );
});

it("can handle complex conditions with fragments", () => {
  const input = `(
        <div>{isLoggedIn ? (<><LogoutButton /><LogoutButton /></>) : (<><LogoutButton /><LogoutButton /></>)}</div>
      );`;
  assert(
    toHBS(input),
    "<div>{{#if this.isLoggedIn}}<LogoutButton></LogoutButton><LogoutButton></LogoutButton>{{else}}<LogoutButton></LogoutButton><LogoutButton></LogoutButton>{{/if}}</div>"
  );
});

it("can assign component props", () => {
  const input = `(<LogoutButton onClick={this.onClick} />);`;
  assert(
    toHBS(input),
    "<LogoutButton @onClick={{this.onClick}}></LogoutButton>"
  );
});

it("keep dom attrs", () => {
  const input = `(<src onClick={this.onClick} />);`;
  assert(toHBS(input), '<src {{on "click" this.onClick}}></src>');
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
    "<h1>Hello, {{#if @name}}<Login></Login>{{else}}<Logout></Logout>{{/if}}</h1>"
  );
});

it("can handle props as component args", () => {
  const input = `(<MyComponent name={this.props.name} />);`;
  assert(toHBS(input), "<MyComponent @name={{@name}}></MyComponent>");
});

it("can handle boolean component arguments", () => {
  const input = `(<MyComponent name={false} />);`;
  assert(toHBS(input), "<MyComponent @name={{false}}></MyComponent>");
});

it("can handle string component arguments", () => {
  const input = `(<MyComponent name={"false"} />);`;
  assert(toHBS(input), '<MyComponent @name="false"></MyComponent>');
});

it("can handle numeric component arguments", () => {
  const input = `(<MyComponent name={42} />);`;
  assert(toHBS(input), "<MyComponent @name={{42}}></MyComponent>");
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
    "<span>{{round (dev (dev this.value this.INTERVAL) 60)}} : </span>"
  );
});

it("can handle increment case", () => {
    const input = `(<span>{i++}</span>);`;
    assert(
      toHBS(input),
      "<span>{{inc this.i}}</span>"
    );
});

it("support nullable rendering cases", () => {
  const input = `(<div>{this.state.isDangerAlertShowed ? <DangerAlert text={'Danger'} /> : null}</div>);`;
  assert(
    toHBS(input),
    '<div>{{#if this.state.isDangerAlertShowed}}<DangerAlert @text="Danger"></DangerAlert>{{/if}}</div>'
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
    assert(toHBS(input), '<form>{{yield}}</form>');
});

it("support hashes", () => {
    const input = `(<MyComponent data={{name: 1, label: "d", key: false, value: record}} />);`;
    assert(toHBS(input), '<MyComponent @data={{hash name=1 label="d" key=false value=this.record}}></MyComponent>');
});

it("support hashes as subparams", () => {
    const input = `(<MyComponent data={{name: { value: 42 }}} />);`;
    assert(toHBS(input), '<MyComponent @data={{hash name=(hash value=42)}}></MyComponent>');
});

it("support basic arrays", () => {
    const input = `(<MyComponent data={[1,"2",false,{ foo: 1 }]} />);`;
    assert(toHBS(input), '<MyComponent @data={{array 1 "2" false (hash foo=1)}}></MyComponent>');
});

it("support nested arrays", () => {
    const input = `(<MyComponent data={[1,"2",[3, true],{ foo: [ 42, "11" ] }]} />);`;
    assert(toHBS(input), '<MyComponent @data={{array 1 "2" (array 3 true) (hash foo=(array 42 "11"))}}></MyComponent>');
});

it("support template strings using concat", () => {
    const input = '(<MyComponent name={`foo${bar}1`} />);';
    assert(toHBS(input), '<MyComponent @name={{concat "foo" this.bar "1"}}></MyComponent>');
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

function toHBS(input) {
  return print(fromJSX(input)).trim();
}

function assert(left, right) {
  expect(left).toEqual(right);
}

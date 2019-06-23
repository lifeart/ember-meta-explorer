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
  assert(toHBS(input), "<src onClick={{this.onClick}}></src>");
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

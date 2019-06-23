"use strict";
/* eslint-env jest */
/* eslint-env node */

const { patternMatch, processTemplate } = require("../../dist/utils/hbs-utils");
const { cleanupEmptyArrays } = require("./helpers");

it("patternMatch works as expected: false", () => {
  assert(patternMatch({ input: 1 }, { input: 2 }), false);
  assert(patternMatch({ output: 1 }, { input: 2 }), false);
  assert(
    patternMatch({ input: { output: 12 } }, { input: { output: 11 } }),
    false
  );
  assert(
    patternMatch(
      { input: { output: 12 } },
      { input: [{ output: 11 }, { output: 14 }] }
    ),
    false
  );
});

it("patternMatch works as expected: true, for plain objects", () => {
  assert(patternMatch({ input: 1 }, { input: 1 }), true);
  assert(patternMatch({ output: 1 }, { output: 1 }), true);
  assert(
    patternMatch({ input: { output: 12 } }, { input: { output: 12 } }),
    true
  );
});

it("patternMatch works as expected: true, for arrayed objects", () => {
  assert(
    patternMatch({ input: { output: 12 } }, { input: [{ output: 12 }] }),
    true
  );
  assert(
    patternMatch(
      { input: { output: 12 } },
      { input: [{ output: 11 }, { output: 12 }] }
    ),
    true
  );
});

it("must grab classic components", () => {
  const tpl = "{{my-component}}";
  assertOutput(tpl, {
    helpers: ["my-component"]
  });
});

it("must grab classic components blocks", () => {
  const tpl = "{{#my-component}} {{/my-component}}";
  assertOutput(tpl, {
    components: ["my-component"]
  });
});

it("must grab classic components blocks with context", () => {
  const tpl = "{{#my-component as |name|}} {{/my-component}}";
  assertOutput(tpl, {
    components: ["my-component"]
  });
});

it("must grab angle components", () => {
  const tpl = "<MyComponent />";
  assertOutput(tpl, {
    components: ["MyComponent"]
  });
});

it("must grab angle components blocks", () => {
  const tpl = "<MyComponent></MyComponent>";
  assertOutput(tpl, {
    components: ["MyComponent"]
  });
});

it("must grab angle components blocks with context", () => {
  const tpl = "<MyComponent as |ctx|></MyComponent>";
  assertOutput(tpl, {
    components: ["MyComponent"]
  });
});

it("respect {{link-to}} component", () => {
  const tpl = '{{link-to "name" "uri"}}';
  assertOutput(tpl, {
    links: ["uri"]
  });
});

it('respect {{#link-to "path"}}{{/link-to}} component', () => {
  const tpl = '{{#link-to "uri"}}{{/link-to}}';
  assertOutput(tpl, {
    links: ["uri"]
  });
});

it('respect <LinkTo @route="name" /> component', () => {
  const tpl = '<LinkTo @route="name" />';
  assertOutput(tpl, {
    links: ["name"]
  });
});

it('respect <LinkTo @route="name" ></LinkTo> component', () => {
  const tpl = '<LinkTo @route="name"></LinkTo>';
  assertOutput(tpl, {
    links: ["name"]
  });
});

it('respect <LinkTo @route="name" ></LinkTo> component', () => {
  const tpl = '<LinkTo @route="name"></LinkTo>';
  assertOutput(tpl, {
    links: ["name"]
  });
});

it("support plain props", () => {
  const tpl = "{{this.name}}";
  assertOutput(tpl, { properties: ["this.name"] });
});

it("support external props", () => {
  const tpl = "{{@name}}";
  assertOutput(tpl, { arguments: ["@name"] });
});

it("support actions grabbing", () => {
  const tpl = `<div onclick={{action 'doIt'}}></div>`;
  assertOutput(tpl, { helpers: ["action"] });
});
it("support action modifiers grabbing", () => {
  const tpl = `<div {{action 'doIt'}}></div>`;
  assertOutput(tpl, {
    modifiers: [
      {
        name: "action",
        param: "doIt"
      }
    ]
  });
});
it("support ref modifiers grabbing", () => {
  const tpl = `<div {{ref this 'doIt'}}></div>`;
  assertOutput(tpl, {
    modifiers: [
      {
        name: "ref",
        param: "this"
      }
    ]
  });
});
it("support nested properties grabbing", () => {
  const tpl = `{{this.name.original.value}}`;
  assertOutput(tpl, {
    properties: ["this.name.original.value"]
  });
});
it("can extract paths from each", () => {
  const tpl = `{{#each this.items as |item|}}{{/each}}`;
  assertOutput(tpl, {
    properties: ["this.items"]
  });
});
it("can mark properties as scoped", () => {
  const tpl = `{{#each this.items as |item|}} {{item}} {{/each}}`;
  assertOutput(tpl, {
    properties: ["this.items"],
    paths: ["$item"]
  });
});
it("can mark properties as scoped for angle components", () => {
  const tpl = `<MyEach as |item|>{{item}}</MyEach>`;
  assertOutput(tpl, {
    components: ["MyEach"],
    paths: ["$item"]
  });
});

function assert(left, right) {
  expect(left).toEqual(right);
}

function assertOutput(left, right) {
  return assert(cleanupEmptyArrays(processTemplate(left)), right);
}

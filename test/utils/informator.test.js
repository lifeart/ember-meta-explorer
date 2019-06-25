"use strict";
/* eslint-env jest */
/* eslint-env node */

const {
  extractComponentInformationFromMeta,
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

function assert(left, right) {
  expect(left).toEqual(right);
}

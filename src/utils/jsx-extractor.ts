const { print, preprocess } = require("@glimmer/syntax");
const { parseScriptFile } = require("./js-utils");
const { cast, cleanDeclarationScope, getDeclarationScope } = require("./jsx-caster");
import traverse from "@babel/traverse";

var extractedComponents = {};
var declarations = {};

function hasValidJSXEntryNode(item) {
  return item && (item.type === "JSXElement" || item.type === "JSXFragment");
}

function addDeclarations(content, declarations) {
  let finalResult = content;
  let hashes = [];
  let contextName = "ctx";
  Object.keys(declarations).forEach(key => {
    let value = declarations[key];
    if (key.startsWith("this.")) {
      finalResult = finalResult.split(key).join(value);
    } else {
      finalResult = finalResult
        .split("this." + key)
        .join(`${contextName}.${key}`);
      if (typeof value === "string") {
        hashes.push(`${key}="${value}"`);
      } else if (typeof value === "number") {
        hashes.push(`${key}=${value}`);
      } else if (typeof value === "boolean") {
        hashes.push(`${key}=${value}`);
      }
    }
  });
  if (hashes.length === 0) {
    return finalResult;
  }
  let output = `{{#let (hash ${hashes.join(
    " "
  )}) as |ctx|}}${finalResult}{{/let}}`;
  return output;
}

function addComponent(name, content) {
  let uniqName = name;
  if (name in extractedComponents) {
    uniqName =
      uniqName +
      "_" +
      Math.random()
        .toString(36)
        .slice(-6);
  }
  extractedComponents[uniqName] = content;
}

function jsxComponentExtractor() {
  extractedComponents = {};
  declarations = {};
  cleanDeclarationScope();
  return {
    FunctionDeclaration(path) {
      let node = path.node;
      if (
        node.id &&
        node.id.name &&
        node.body &&
        node.body.body &&
        node.body.body.length
      ) {
        let result = node.body.body.filter(el => el.type === "ReturnStatement");
        if (result.length) {
          const arg = result[0].argument;
          if (hasValidJSXEntryNode(arg)) {
			cast(node);
            addComponent(node.id.name, print(cast(arg, result[0])));
          }
        }
      }
    },
    FunctionExpression(path) {
      let node = path.node;
      if (node.body && node.body.body && node.body.body.length) {
        let result = node.body.body.filter(el => el.type === "ReturnStatement");
        if (result.length) {
          const arg = result[0].argument;
          if (hasValidJSXEntryNode(arg)) {
            addComponent("FunctionExpression", print(cast(arg, result[0])));
          }
        }
      }
    },
    ClassMethod(path) {
      let node = path.node;
      if (
        node.key.name &&
        node.body &&
        node.body.body &&
        node.body.body.length
      ) {
        let result = node.body.body.filter(el => el.type === "ReturnStatement");
        if (result.length) {
          const arg = result[0].argument;
          if (hasValidJSXEntryNode(arg)) {
            addComponent(node.key.name, print(cast(arg, result[0])));
          }
        }
      }
    },
    VariableDeclarator(path, parent) {
	  let node = path.node;
	 
      if (node.id && node.id.type === "Identifier") {
		
        if (node.init) {
		
          if (node.init.type === "StringLiteral") {
			cast(node, parent);
            declarations[node.id.name] = node.init.value;
          } else if (node.init.type === "NumericLiteral") {
			cast(node, parent);
            declarations[node.id.name] = node.init.value;
          } else if (node.init.type === "BooleanLiteral") {
			cast(node, parent);
            declarations[node.id.name] = node.init.value;
          }
        }
      } else if (node.id && node.id.type === "ArrayPattern") {
        if (node.init && node.init.type === "CallExpression") {
          if (
            node.init.callee.type === "Identifier" &&
            node.init.callee.name === "useState"
          ) {
            node.id.elements.forEach((el, index) => {
              if (el.type === "Identifier") {
                if (node.init.arguments[index]) {
                  const argType = node.init.arguments[index].type;
                  if (
                    [
                      "StringLiteral",
                      "NumericLiteral",
                      "BooleanLiteral"
                    ].includes(argType)
                  ) {
					cast(node, parent);
                    declarations[el.name] = node.init.arguments[index].value;
                  }
                }
              }
            });
          }
        }
      } else if (node.id && node.id.type === "ObjectPattern") {
        if (node.init && node.init.type === "MemberExpression") {
          if (node.init.object.type === "ThisExpression") {
            if (node.init.property.type === "Identifier") {
              if (node.init.property.name === "props") {
                node.id.properties.forEach(prop => {
                  if (prop.key.type === "Identifier") {
					cast(node, parent);
                    declarations["this." + prop.key.name] = "@" + prop.key.name;
                  }
                });
              }
            }
          }
        }
      }
      if (node.id && node.id.name && node.init) {
        if (hasValidJSXEntryNode(node.init)) {
          addComponent(node.id.name, print(cast(node.init, node)));
        }
      }
    },
    ArrowFunctionExpression(path) {
      let node = path.node;

      if (
        node.params &&
        node.params.length === 1 &&
        node.params[0].type === "ObjectPattern"
      ) {
        node.params[0].properties.forEach(prop => {
          if (prop.type === "ObjectProperty") {
            if (prop.key.type === "Identifier") {
              declarations["this." + prop.key.name] = "@" + prop.key.name;
            }
          }
        });
      }
      if (node.body) {
        if (hasValidJSXEntryNode(node.body)) {
		  cast(node);
          addComponent("ArrowFunctionExpression", print(cast(node.body, node)));
        } else if (node.body.body && node.body.body.length) {
          let result = node.body.body.filter(
            el => el.type === "ReturnStatement"
          );
          if (result.length) {
            const arg = result[0].argument;
            if (hasValidJSXEntryNode(arg)) {
			  cast(node);
              addComponent(
                "ArrowFunctionExpression",
                print(cast(arg, result[0]))
              );
            }
          }
        }
      }
    },
    ObjectMethod(path) {
      let node = path.node;
      if (
        node.key.name &&
        node.body &&
        node.body.body &&
        node.body.body.length
      ) {
        let result = node.body.body.filter(el => el.type === "ReturnStatement");
        if (result.length) {
          const arg = result[0].argument;
          if (hasValidJSXEntryNode(arg)) {
            addComponent(node.key.name, print(cast(arg, result[0])));
          }
        }
      }
    },
    Program(path) {
      let node = path.node;
      if (node.sourceType === "module") {
        if (node.body.length && node.body[0].type === "ExpressionStatement") {
          if (hasValidJSXEntryNode(node.body[0].expression)) {
            addComponent(
              "root",
              print(cast(node.body[0].expression, node.body[0]))
            );
          }
        }
      }
    },
    ObjectProperty(path) {
      let node = path.node;
      if (node.key.name && node.value) {
        if (hasValidJSXEntryNode(node.value)) {
          addComponent(node.key.name, print(cast(node.value, node)));
        }
      }
    }
  };
}

var contextItems = {};

function astPlugin(declarations) {
	contextItems = {};
	return function buildDeclarationPatcherPlugin() {
		return {
			visitor: {
				PathExpression(node: any) {
					let original = node.original;
					let relatedDeclarations = declarations.filter(([name, value, type]) => {
						return (original === name || original === 'this.' + name) && value !== undefined && type === "local";
					});
					if (relatedDeclarations.length) {
						let dec = relatedDeclarations[0];
						node.this = false;
						node.data = false;
						node.original = 'ctx.' + node.original.replace('this.', '');
						contextItems[dec[0]] = dec[1];
					} else {
						let relatedDeclarations = declarations.filter(([name, , type]) => {
							return (original === 'this.' + name) && type === "external";
						});
						if (relatedDeclarations.length) {
							node.this = false;
							node.data = true;
							node.original = '@' + node.original.replace('this.', '');
						}
					}
				return node;
			  }
			}
		}
	};
}


export function extractJSXComponents(jsxInput) {
  let ast = parseScriptFile(jsxInput, {
    filename: "dummy.tsx",
    parserOpts: { isTSX: true }
  });
  traverse(ast, jsxComponentExtractor());
  const declarationScope = getDeclarationScope();
//   console.log('declarationScope', JSON.stringify(declarationScope));
  Object.keys(extractedComponents).forEach(componentName => {
	let template = extractedComponents[componentName];
	let result =  preprocess(template, {
		plugins: {
		  ast: [astPlugin(declarationScope)]
		}
	  } as any);
	//   console.log('declarationScope2', JSON.stringify(declarationScope));
	//   console.log('contextItems2', JSON.stringify(contextItems));
	let smartDeclaration = print(result);
	let resolvedContext = Object.keys(contextItems);
	if (resolvedContext.length) {
		let pairs = [];
		resolvedContext.forEach((el) =>{
			pairs.push({
				"type": "HashPair",
				"key": el,
				"value": contextItems[el],
				"loc": null
			  })
		});
		smartDeclaration = print({
			"type": "Template",
			"body": [
			  {
				"type": "BlockStatement",
				"path": {
				  "type": "PathExpression",
				  "original": "let",
				  "this": false,
				  "parts": [
					"let"
				  ],
				  "data": false,
				  "loc": null
				},
				"params": [
				  {
					"type": "SubExpression",
					"path": {
					  "type": "PathExpression",
					  "original": "hash",
					  "this": false,
					  "parts": [
						"hash"
					  ],
					  "data": false,
					  "loc": null
					},
					"params": [],
					"hash": {
					  "type": "Hash",
					  "pairs": pairs,
					  "loc": null
					},
					"loc": null
				  }
				],
				"hash": {
				  "type": "Hash",
				  "pairs": [],
				  "loc": null
				},
				"program": {
				  "type": "Block",
				  "body": result.body,
				  "blockParams": [
					"ctx"
				  ],
				  "loc": null
				},
				"inverse": null,
				"loc": null
			  }
			],
			"blockParams": [],
			"loc": null
		  });
	}
    const declarated = addDeclarations(
      extractedComponents[componentName],
      declarations
    );
    // if (extractedComponents[componentName] !== declarated) {
    //   extractedComponents[componentName + "_declarated"] = declarated;
    // }
    if (extractedComponents[componentName] !== smartDeclaration) {
      extractedComponents[componentName + "_declarated"] = smartDeclaration;
	}
	
	
  });

  return extractedComponents;
}

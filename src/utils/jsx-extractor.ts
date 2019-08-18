import { print, preprocess, builders } from "@glimmer/syntax";
const { parseScriptFile } = require("./js-utils");
const {
  cast,
  cleanDeclarationScope,
  getDeclarationScope
} = require("./jsx-caster");
const {
  sexpr,
  path,
  hash,
  block,
  template: astTemplate,
  blockItself,
  pair
} = builders;
import traverse from "@babel/traverse";

var extractedComponents = {};
var declarations = {};

function hasValidJSXEntryNode(item) {
  return item && (item.type === "JSXElement" || item.type === "JSXFragment");
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


export function extractComponentFromClassMethod(path) {
  const node = path.node;
  const keyName = node.key.name;
  extractedComponents = {};
  declarations = {};
  cleanDeclarationScope();
  cast(node);
  addComponent(keyName, print(cast(node.body, node)));
  cleanupExtractedComponents();
  const primaryKey = `${keyName}_declarated`;
  if (primaryKey in extractedComponents) {
    return extractedComponents[primaryKey];
  } else {
    return extractedComponents[keyName];
  }
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
        let result = node.body.body.filter(el => {
          if (el.type === "VariableDeclaration") {
            el.declarations.forEach(d => {
              cast(d, el);
            });
          }
          return el.type === "ReturnStatement";
        });
        if (result.length) {
          const arg = result[0].argument;
          if (hasValidJSXEntryNode(arg)) {
            cast(node);
            const printResult = cast(arg, result[0]);
            addComponent(node.id.name, print(printResult));
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
          } else if (node.init.type === "NumericLiteral") {
            cast(node, parent);
          } else if (node.init.type === "BooleanLiteral") {
            cast(node, parent);
          } else if (
            node.init.type === "ObjectExpression" ||
            node.init.type === "JSXElement" ||
            node.init.type === "JSXFragment" ||
            node.init.type === "CallExpression" ||
            node.init.type === "LogicalExpression" ||
            node.init.type === "ArrayExpression"
          ) {
            cast(node, parent);
          }
        }
      } else if (node.id && node.id.type === "ArrayPattern") {
        if (node.init && node.init.type === "CallExpression") {
          if (
            node.init.callee.type === "Identifier" &&
            node.init.callee.name === "useState"
          ) {
            cast(node, parent);
          }
        }
      } else if (node.id && node.id.type === "ObjectPattern") {
        if (node.init && node.init.type === "MemberExpression") {
          if (node.init.object.type === "ThisExpression") {
            if (node.init.property.type === "Identifier") {
              if (node.init.property.name === "props") {
                cast(node, parent);
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
        MustacheStatement(node: any) {
          let original = node.path.original;
          let relatedElements = declarations.filter(([name, value, type]) => {
            return (
              (original === name || original === "this." + name) &&
              (typeof value === "object" &&
                (value.type === "Template" || value.type === "ElementNode")) &&
              type === "local"
            );
          });
          if (relatedElements.length) {
            return relatedElements[0][1];
          }
          return node;
        },
        PathExpression(node: any) {
          let original = node.original;

          let relatedDeclarations = declarations.filter(
            ([name, value, type]) => {
              return (
                (original === name ||
                  original === "this." + name ||
                  original.startsWith("this." + name + ".")) &&
                value !== undefined &&
                type === "local"
              );
            }
          );
          // console.log('relatedDeclarations', JSON.stringify(relatedDeclarations));
          if (relatedDeclarations.length) {
            let dec = relatedDeclarations[0];
            node.this = false;
            node.data = false;
            node.original = "ctx." + node.original.replace("this.", "");
            contextItems[dec[0]] = dec[1];
            // console.log('contextItems', original, JSON.stringify(contextItems));
          } else {
            let relatedDeclarations = declarations.filter(([name, , type]) => {
              return (
                (original === "this." + name ||
                  original.startsWith("this." + name + ".")) &&
                type === "external"
              );
            });
            if (relatedDeclarations.length) {
              node.this = false;
              node.data = true;
              node.original = "@" + node.original.replace("this.", "");
            }
          }
          return node;
        }
      }
    };
  };
}

function cleanupExtractedComponents() {
  const declarationScope = getDeclarationScope();
  // console.log('declarationScope', JSON.stringify(declarationScope));
  Object.keys(extractedComponents).forEach(componentName => {
    let template = extractedComponents[componentName];
    let result = preprocess(template, {
      plugins: {
        ast: [astPlugin(declarationScope)]
      }
    } as any);
    //   console.log('declarationScope2', JSON.stringify(declarationScope));
    // console.log('contextItems2', JSON.stringify(contextItems));
    let smartDeclaration = print(result);
    let resolvedContext = Object.keys(contextItems);
    if (resolvedContext.length) {
      // console.log('resolvedContext', JSON.stringify(resolvedContext));
      let pairs = [];
      resolvedContext.forEach(el => {
        // console.log('el', el, contextItems[el]);
        const value = JSON.parse(JSON.stringify(contextItems[el]));
        //MustacheStatement
        if (
          value &&
          typeof value === "object" &&
          value.type === "MustacheStatement"
        ) {
          value.type = "SubExpression";
        }
        pairs.push(pair(el, value));
      });
      // console.log('pairs', JSON.stringify(pairs));
      smartDeclaration = print(
        astTemplate([
          block(
            path("let"),
            [sexpr(path("hash"), [], hash(pairs))],
            hash(),
            blockItself(result.body as any, ["ctx"])
          )
        ])
      );
      declarationScope.forEach(([name, , type]) => {
        if (type === "external") {
          smartDeclaration = smartDeclaration
            .split(` this.${name} `)
            .join(` @${name} `)
            .split(` this.${name})`)
            .join(` @${name})`)
            .split(` this.${name}.`)
            .join(` @${name}.`)
            .split(`=this.${name}.`)
            .join(`=@${name}.`)
            .split(`=this.${name} `)
            .join(`=@${name} `);
        }
      });
      // console.log('smartDeclaration', smartDeclaration, JSON.stringify(resolvedContext));
    }
    // const declarated = addDeclarations(
    //   extractedComponents[componentName],
    //   declarations
    // );
    // if (extractedComponents[componentName] !== declarated) {
    //   extractedComponents[componentName + "_declarated"] = declarated;
    // }
    if (extractedComponents[componentName] !== smartDeclaration) {
      extractedComponents[componentName + "_declarated"] = smartDeclaration;
    }
  });
}

export function extractJSXComponents(jsxInput) {
  let ast = parseScriptFile(jsxInput, {
    filename: "dummy.tsx",
    parserOpts: { isTSX: true }
  });
  traverse(ast, jsxComponentExtractor());
  cleanupExtractedComponents();
  return extractedComponents;
}

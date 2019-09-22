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
  addComponent(keyName, printComponent(cast(node.body, node)));
  cleanupExtractedComponents();
  const primaryKey = `${keyName}_declarated`;
  if (primaryKey in extractedComponents) {
    return extractedComponents[primaryKey];
  } else {
    return extractedComponents[keyName];
  }
}

var isDebugEnabled = false;


function printComponent(ast) {
  if (isDebugEnabled) {
    console.log('--------- printComponent ---------');
    console.log(JSON.stringify(ast));
    console.log('--------- printComponent ---------');
  }
  return print(ast);
}

function maybeLog(data) {
  if (isDebugEnabled) {
    console.log(JSON.stringify(data))
  }
}

function jsxComponentExtractor(debug = false) {
  isDebugEnabled = debug;
  extractedComponents = {};
  declarations = {};
  cleanDeclarationScope();
  return {
    FunctionDeclaration(path) {
      maybeLog('FunctionDeclaration');
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
            addComponent(node.id.name, printComponent(printResult));
          }
        }
      }
    },
    FunctionExpression(path) {
      maybeLog('FunctionExpression');
      let node = path.node;
      if (node.body && node.body.body && node.body.body.length) {
        let result = node.body.body.filter(el => el.type === "ReturnStatement");
        if (result.length) {
          const arg = result[0].argument;
          if (hasValidJSXEntryNode(arg)) {
            addComponent("FunctionExpression", printComponent(cast(arg, result[0])));
          }
        }
      }
    },
    ClassMethod(path) {
      maybeLog('ClassMethod');
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
            addComponent(node.key.name, printComponent(cast(arg, result[0])));
          }
        }
      }
    },
    VariableDeclarator(path, parent) {
      maybeLog(`VariableDeclarator:${path.node.id.name}`);
      let node = path.node;
      if (node.id && node.id.type === "Identifier") {
        if (node.init) {
          if (node.init.type === "ArrowFunctionExpression") {
            if (Array.isArray(node.init.body.body) && node.init.body.body.length === 1 && node.init.body.body[0].type === 'ReturnStatement') {
              if (node.init.body.body[0].argument.type === 'JSXElement' || node.init.body.body[0].argument.type === 'JSXFragment') {
                cast(node, parent);
              }
            }
          } else if (node.init.type === "StringLiteral") {
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
          addComponent(node.id.name, printComponent(cast(node.init, node)));
        }
      }
    },
    ArrowFunctionExpression(path) {
      maybeLog('ArrowFunctionExpression');
      let node = path.node;
      if (node.body) {
        if (hasValidJSXEntryNode(node.body)) {
          cast(node);
          let componentName = "ArrowFunctionExpression";
          if (path.parent && path.parent.type === 'VariableDeclarator' && path.parent.id) {
            if (path.parent.id.type === 'Identifier' && path.parent.init === path.node) {
              componentName = path.parent.id.name;
            }
          }
          addComponent(componentName, printComponent(cast(node.body, node)));
        } else if (node.body.body && node.body.body.length) {
          let result = node.body.body.filter(
            el => el.type === "ReturnStatement"
          );
          if (result.length) {
            const arg = result[0].argument;
            if (hasValidJSXEntryNode(arg)) {

              let componentName = "ArrowFunctionExpression";
              if (path.parent && path.parent.type === 'VariableDeclarator' && path.parent.id) {
                if (path.parent.id.type === 'Identifier' && path.parent.init === path.node) {
                  componentName = path.parent.id.name;
                }
              }

              cast(node);
              addComponent(
                componentName,
                printComponent(cast(arg, result[0]))
              );
            }
          }
        }
      }
    },
    ObjectMethod(path) {
      maybeLog('ObjectMethod');
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
            addComponent(node.key.name, printComponent(cast(arg, result[0])));
          }
        }
      }
    },
    Program(path) {
      maybeLog('Program');
      let node = path.node;
      if (node.sourceType === "module") {
        if (node.body.length && node.body[0].type === "ExpressionStatement") {
          if (hasValidJSXEntryNode(node.body[0].expression)) {
            addComponent(
              "root",
              printComponent(cast(node.body[0].expression, node.body[0]))
            );
          }
        }
      }
    },
    ObjectProperty(path) {
      maybeLog('ObjectProperty');
      let node = path.node;
      if (node.key.name && node.value) {
        if (hasValidJSXEntryNode(node.value)) {
          addComponent(node.key.name, printComponent(cast(node.value, node)));
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
        Block(node: any) {
          if (node.body.length === 1 && node.body[0].type === 'MustacheStatement') {
            let el = node.body[0];
            let relatedElements = declarations.filter(([name, value, type]) => {
              return ( name && name === el.path.original && type === "local" );
            });
            if (relatedElements.length) {
              let item = relatedElements[0][1];
              if (item.type === "Block") {
                return item;
              }
            }
          }
        },
        MustacheStatement(node: any) {
          let original = node.path.original;
          if (original.startsWith('this.')) {
            original = original.replace('this.', '');
          }
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
          } else {
            relatedElements = declarations.filter(([name, value, type]) => {
              return (
                (original === name) &&
                typeof value === "object" &&
                value.type === "SubExpression" &&
                type === "local"
              );
            });
            if (relatedElements.length) {
              let el = relatedElements[0][1];
              if (el.path.original === 'map' && el.params.length === 2 && el.params[0].type === "Block") {
                return block(
                  path("each"),
                  [el.params[1]],
                  hash(),
                  el.params[0]
                )
              }
            }
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

              if (node.original === '@children' || (node.original.startsWith('@') && node.original.endsWith('.children'))) {
                node.original = 'yield';
                node.parts = ['yield'];
                node.data = false;
              }
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
  if (isDebugEnabled) {
    console.log('declarationScope', JSON.stringify(declarationScope));
    console.log('extractedComponents', JSON.stringify(extractedComponents));
  }
  Object.keys(extractedComponents).forEach(componentName => {
    let template = extractedComponents[componentName];
    let result = preprocess(template, {
      plugins: {
        ast: [astPlugin(declarationScope)]
      }
    } as any);
    //   console.log('declarationScope2', JSON.stringify(declarationScope));
    // console.log('contextItems2', JSON.stringify(contextItems));
    let smartDeclaration = printComponent(result);
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
      smartDeclaration = printComponent(
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

export function extractJSXComponents(jsxInput, debug = false) {
  let ast = parseScriptFile(jsxInput, {
    filename: "dummy.tsx",
    parserOpts: { isTSX: true }
  });
  traverse(ast, jsxComponentExtractor(debug));
  cleanupExtractedComponents();
  return extractedComponents;
}

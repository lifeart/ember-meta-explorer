var scopedVariables = [];
var declaredVariables = [];

import { patternMatch } from "./hbs-utils";

var traceEnabled = false;
var traceStack = [];
export function casterTrace(state) {
  if (state === false) {
    console.log(traceStack.map((...items) => items.join(' ')).join("\n"));
    traceStack = [];
  }
  traceEnabled = state;
}

export function addASTNodeStrips(node) {
  if (traceEnabled) {
    traceStack.push(['addASTNodeStrips', JSON.stringify(node)]);
  }
  if (node.type === "MustacheStatement" || node.type === "BlockStatement") {
    const strip = { open: false, close: false };
    node.strip = strip;
    node.openStrip = strip;
    node.inverseStrip = strip;
    node.closeStrip = strip;
    if (!("escaped" in node)) {
      node.escaped = true;
    }
  }
  if (node.type === "MustacheStatement") {
    if (node.path && node.path.type === "SubExpression") {
      node.params = node.path.params;
      node.path = node.path.path;
    }
  }
  if (node.program && node.program.type && node.program.type === "Block") {
    if (
      node.program.body &&
      node.program.body.type &&
      node.program.body.type === "Template"
    ) {
      node.program.body = node.program.body.body;
    }
  }

  function fixStringLiteralsInsideBody(body) {
    body.forEach((el)=>{
      if (el.type === 'StringLiteral') {
        el.type = 'TextNode';
        el.chars = el.original;
        delete el.original;
        delete el.value;
      }
    })
  }
  
  if (node.program && node.program.body) {
    fixStringLiteralsInsideBody(node.program.body);
  }

  if (node.inverse && node.inverse.body) {
    fixStringLiteralsInsideBody(node.inverse.body);
  }

  return node;
}

function isExternalProperty(varName) {
  let results = declaredVariables.filter(([name, , type]) => {
    return (
      type === "external" &&
      (varName === name || varName.startsWith(name + "."))
    );
  });
  if (results.length) {
    return true;
  } else {
    return false;
  }
}

function isDefinedProperty(varName) {
  let results = declaredVariables.filter(([name, , type]) => {
    return type === "local" && varName === name;
  });
  if (results.length) {
    return results[0][1];
  } else {
    return false;
  }
}

function hasJSXInside(node) {
  const strNode = JSON.stringify(node);
  return strNode.includes('"JSXElement"') || strNode.includes('"JSXFragment"');
}

function hasComplexIdentifier(id) {
  if (!id) {
    return false;
  }
  if (hasJSXInside(id)) {
    return true;
  }
  if (id.type === "JSXElement") {
    return true;
  }
  if (id.type === "JSXFragment") {
    return true;
  }
  if (id.type === "Identifier") {
    let decs = declaredVariables.filter(([name, value]) => {
      return (
        name === id.name &&
        value &&
        (typeof value === "object" &&
          (value.type === "Template" || value.type === "ElementNode"))
      );
    });
    if (decs.length) {
      return decs[0][1];
    }
  }
}

function bHash() {
  return {
    type: "Hash",
    loc: null,
    pairs: []
  };
}

function hasTypes(item, types) {
  return types.includes(item.type);
}

function operatorToPath(operator, parent = null) {
  const operationMap = {
    if: "if",
    on: "on",
    "||": "or",
    "+": "inc",
    "-": "dec",
    "&&": "and",
    "*": "mult",
    ">": "gt",
    "==": "eq",
    "===": "eq",
    "!": "not",
    "!=": "not-eq",
    "!==": "not-eq",
    "++": "inc",
    "--": "dec",
    "<": "lt",
    ">=": "gte",
    "<=": "lte",
    "/": "div",
    "%": "mod"
  };

  let resolvedResult = operationMap[operator];

  return {
    type: "PathExpression",
    original: resolvedResult,
    this: false,
    parts: [resolvedResult],
    data: false,
    loc: null
  };
}

function cleanupBlockParam(node) {
  if (node.type === "SubExpression") {
    const param = node.params[node.params.length - 1];
    if (param.type !== "MustacheStatement") {
      return param;
    }
    return Object.assign({}, param, { type: "SubExpression" });
  }
  let parts = node.parts;
  parts.pop();
  if (node.original.startsWith("@")) {
    node.original = "@" + [...parts].join(".");
  } else {
    node.original = ["this", ...parts].join(".");
  }
  node.parts = parts;
  return node;
}

function pathExpressionFromParam(node) {
  const isSub =
    node.type === "SubExpression" &&
    node.path &&
    node.path.type === "PathExpression" &&
    node.path.original === "map";

  if (isSub || (node.original && node.original.endsWith(".map"))) {
    return {
      type: "PathExpression",
      original: "each",
      this: false,
      parts: ["each"],
      data: false,
      loc: null
    };
  }
  return null;
}

function flattenMemberExpression(node) {
  let parts = [];
  if (node.object.type === "Identifier") {
    parts.push(node.object.name);
  } else if (node.object.type === "MemberExpression") {
    parts = parts.concat(flattenMemberExpression(node.object));
  }
  if (node.property.type === "StringLiteral") {
    parts.push(node.property.value);
  } else if (node.property.type === "Identifier") {
    parts.push(node.property.name);
  }
  return parts;
}

export function cast(node, parent = null) {
  if (node === null || node.__casted === true) {
    return node;
  }
  const type = node.type;
  if (type in casters) {
    if (traceEnabled) {
      traceStack.push([`cast: ${node.type}`, `parent: ${parent ? parent.type : '-'}`]);
    }
    const result = casters[type](node, parent);
    if (typeof result === "object" && result !== null) {
      Object.assign(result, {
        __casted: true
      });
    }
    return result;
  } else {
    return {
      type: "Uncasted",
      node
    };
  }
}

function castToString(node, parent) {
  let preResult = cast(node, parent);
  if (preResult.type === "PathExpression") {
    return preResult.parts[0];
  }
  return preResult;
}

function hasInScope(param) {
  return scopedVariables.includes(param);
}

function increaseScope(params) {
  params.forEach(value => {
    scopedVariables.push(value);
  });
}

function decreaseScope(params) {
  params.forEach(value => {
    scopedVariables.pop();
  });
}

const casters = {
  NumericLiteral(node) {
    return {
      type: "NumberLiteral",
      loc: node.loc,
      value: node.value,
      original: node.value
    };
  },
  ConditionalExpression(node, parent) {
    const nodeType =
      parent &&
      hasTypes(parent, [
        "ConditionalExpression",
        "BinaryExpression",
        "TemplateLiteral"
      ])
        ? "SubExpression"
        : "MustacheStatement";

    let hasComplexLeft = hasComplexIdentifier(node.consequent);
    let hasComplexRight = hasComplexIdentifier(node.alternate);
    if (hasComplexLeft || hasComplexRight) {
      let result = {
        type: "BlockStatement",
        hash: bHash(),
        path: operatorToPath("if"),
        loc: node.loc,
        params: [cast(node.test, node)],
        program: {
          type: "Block",
          body:
            node.consequent.type === "JSXFragment"
              ? cast(node.consequent, node)
              : [cast(node.consequent, node)],
          blockParams: [],
          log: null
        },
        inverse: node.alternate
          ? {
              type: "Block",
              body:
                node.alternate.type === "JSXFragment"
                  ? cast(node.alternate, node)
                  : [cast(node.alternate, node)],
              blockParams: [],
              log: null
            }
          : null
      };

      if (hasComplexLeft && hasComplexLeft !== true) {
        result.program.body = [hasComplexLeft];
      }

      if (hasComplexRight && hasComplexRight !== true) {
        result.inverse.body = [hasComplexRight];
      }

      if (
        result.inverse &&
        !result.inverse.body.filter(el => el.type !== "NullLiteral").length
      ) {
        result.inverse = null;
      }

      return addASTNodeStrips(result);
    }

    return addASTNodeStrips({
      type: nodeType,
      hash: bHash(),
      loc: node.loc,
      path: operatorToPath("if"),
      params: [
        cast(node.test, node),
        cast(node.consequent, node),
        cast(node.alternate, node)
      ],
      program: [],
      inverse: []
    });
  },
  BinaryExpression(node) {
    return {
      type: "SubExpression",
      hash: bHash(),
      loc: node.loc,
      path: operatorToPath(node.operator, node),
      params: [cast(node.left, node), cast(node.right, node)]
    };
  },
  UpdateExpression(node, parent) {
    return addASTNodeStrips({
      type:
        parent && parent.type === "JSXExpressionContainer"
          ? "MustacheStatement"
          : "SubExpression",
      hash: bHash(),
      loc: node.loc,
      path: operatorToPath(node.operator),
      params: [cast(node.argument, node)]
    });
  },
  ExpressionStatement(node) {
    return cast(node.expression, node);
  },
  ArrowFunctionExpression(node) {
    node.params.forEach(param => {
      if (param.type === "Identifier") {
        let result = [param.name, undefined, "external"];
        declaredVariables.push(result);
      } else if (param.type === "ObjectPattern") {
        param.properties.forEach(prop => {
          let result = [prop.key.name, undefined, "external"];
          declaredVariables.push(result);
        });
      }
    });
    let blockParams = node.params.map(param => {
      return castToString(param, node);
    });
    increaseScope(blockParams);
    let result = {
      type: "Block",
      blockParams: blockParams,
      body:
        node.body.type === "JSXFragment"
          ? cast(node.body, node)
          : [cast(node.body, node)],
      loc: null
    };
    decreaseScope(blockParams);
    return result;
  },
  FunctionExpression(node) {
    let blockParams = node.params.map(param => {
      return castToString(param, node);
    });
    increaseScope(blockParams);
    let result = {
      type: "Block",
      blockParams: blockParams,
      body: [cast(node.body, node)],
      loc: null
    };
    decreaseScope(blockParams);
    return result;
  },

  CallExpression(node, parent) {
    if (parent && parent.type === "ObjectProperty") {
      return {
        type: "SubExpression",
        hash: bHash(),
        loc: node.loc,
        path: cast(node.callee, node),
        params: node.arguments.map(arg => cast(arg, node))
      };
    }
    if (
      parent &&
      ((hasTypes(parent, ["VariableDeclarator"]) && parent.init === node) ||
        hasTypes(parent, ["JSXExpressionContainer"]))
    ) {
      if (node.callee.type === "MemberExpression") {
        if (
          hasTypes(node.callee.object, [
            "Identifier",
            "MemberExpression",
            "ArrayExpression"
          ]) &&
          node.callee.property.type === "Identifier"
        ) {
          if (node.callee.property.name === "join" && node.arguments.length) {
            return {
              type: "SubExpression",
              hash: bHash(),
              loc: node.loc,
              path: cast(node.callee.property, node),
              params: [
                cast(node.callee.object, node.callee),
                cast(node.arguments[0], node)
              ]
            };
          } else if (
            node.callee.property.name === "includes" &&
            node.arguments.length
          ) {
            // to align with helper names
            node.callee.property.name = "contains";
            return {
              type: "SubExpression",
              hash: bHash(),
              loc: node.loc,
              path: cast(node.callee.property, node),
              params: [
                cast(node.callee.object, node.callee),
                cast(node.arguments[0], node)
              ]
            };
          } else if (
            node.callee.property.name === "reverse" &&
            node.arguments.length === 0
          ) {
            return {
              type: "SubExpression",
              hash: bHash(),
              loc: node.loc,
              path: cast(node.callee.property, node),
              params: [cast(node.callee.object, node.callee)]
            };
          } else if (node.callee.property.name === "reduce") {
            let params = [
              cast(node.arguments[0]),
              cast(node.callee.object, node.callee)
            ];
            if (node.arguments.length === 2) {
              params.push(cast(node.arguments[1]));
            }
            return {
              type: "SubExpression",
              hash: bHash(),
              loc: node.loc,
              path: cast(node.callee.property, node),
              params
            };
          } else if (node.callee.property.name === "map") {
            let params = [
              cast(node.arguments[0]),
              cast(node.callee.object, node.callee)
            ];
            return {
              type: "SubExpression",
              hash: bHash(),
              loc: node.loc,
              path: cast(node.callee.property, node),
              params
            };
          } else if (
            node.callee.property.name === "slice" &&
            node.arguments.length === 2
          ) {
            let params = [
              cast(node.arguments[0]),
              cast(node.arguments[1]),
              cast(node.callee.object, node.callee)
            ];
            return {
              type: "SubExpression",
              hash: bHash(),
              loc: node.loc,
              path: cast(node.callee.property, node),
              params
            };
          } else if (
            node.callee.property.name === "append" &&
            node.arguments.length === 1
          ) {
            let params = [
              cast(node.callee.object, node.callee),
              cast(node.arguments[0])
            ];
            return {
              type: "SubExpression",
              hash: bHash(),
              loc: node.loc,
              path: cast(node.callee.property, node),
              params
            };
          } else if (
            node.callee.property.name === "filter" &&
            node.arguments.length === 1
          ) {
            let params = [
              cast(node.arguments[0]),
              cast(node.callee.object, node.callee)
            ];
            return {
              type: "SubExpression",
              hash: bHash(),
              loc: node.loc,
              path: cast(node.callee.property, node),
              params
            };
          }
        }
      }
    }
    if (
      parent &&
      hasTypes(parent, [
        "BinaryExpression",
        "ConditionalExpression",
        "LogicalExpression"
      ])
    ) {
      increaseScope([node.callee.name]);
      let result = {
        type: "SubExpression",
        hash: bHash(),
        loc: node.loc,
        path: cast(node.callee, node),
        params: node.arguments.map(arg => cast(arg, node))
      };
      decreaseScope([node.callee.name]);
      return result;
    }
    return cast(node.callee, node);
  },
  JSXIdentifier(node) {
    return node.name;
  },
  NullLiteral(node, parent) {
    let result = {
      type: "NullLiteral",
      value: null,
      original: null,
      loc: node.log
    };
    return result;
  },
  VariableDeclarator(node) {
    if (node.id && node.id.type === "Identifier") {
      let result = [
        node.id.name,
        JSON.parse(JSON.stringify(cast(node.init, node))),
        "local"
      ];
      declaredVariables.push(result);
      return result;
    } else if (node.id && node.id.type === "ObjectPattern") {
      if (
        node.init.type === "MemberExpression" &&
        node.init.object.type === "ThisExpression" &&
        node.init.property.type === "Identifier"
      ) {
        if (
          node.init.property.name === "props" ||
          node.init.property.name === "args"
        ) {
          node.id.properties.forEach(prop => {
            if (prop.key.type === "Identifier") {
              let result = [prop.key.name, undefined, "external"];
              declaredVariables.push(result);
            }
          });
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
                    "BooleanLiteral",
                    "ObjectExpression",
                    "ArrayExpression"
                  ].includes(argType)
                ) {
                  let result = [
                    el.name,
                    cast(node.init.arguments[index], node.init),
                    "local"
                  ];
                  declaredVariables.push(result);
                }
              }
            }
          });
        }
      }
    }
  },
  MemberExpression(node, parent) {
    if (node.computed) {
      return {
        type: "SubExpression",
        path: {
          type: "PathExpression",
          original: "get",
          this: false,
          parts: ["get"],
          data: false,
          loc: null
        },
        params: [
          (function() {
            let p = cast(node.object, node);
            if (p.type === "MustacheStatement") {
              p.type = "SubExpression";
            }
            return p;
          })(),
          cast(node.property, node)
        ],
        hash: {
          type: "Hash",
          pairs: [],
          loc: null
        },
        loc: null
      };
    }
    let items = flattenMemberExpression(node);
    let prefix = hasInScope(items[0]) ? "" : "this.";
    let original = prefix + items.join(".");
    let isExternal =
      original.startsWith("this.props.") || original.startsWith("props.");
    if (isExternal) {
      // if (items[0] !== "props") {
      items.shift();
      // }
      original = original.replace("this.", "").replace("props.", "");
      original = "@" + original;
      if (original === "@children") {
        original = "yield";
      }
    }

    if (original.startsWith("this.Math.")) {
      original = original.replace("this.Math.", "");
      items = original.split(".");
    }
    const isYield = original === "yield";
    if (isYield) {
      isExternal = false;
      items = [original];
    }
    return {
      type: "PathExpression",
      original: original,
      this: isExternal ? false : prefix ? true : false,
      parts: items,
      data: isExternal,
      loc: node.loc
    };
  },
  UnaryExpression(node, parent) {
    return {
      type: "SubExpression",
      path: operatorToPath(node.operator),
      params: [cast(node.argument, node)],
      loc: node.loc,
      hash: bHash()
    };
  },
  LogicalExpression(node, parent) {
    return {
      type: "SubExpression",
      path: operatorToPath(node.operator),
      params: [cast(node.left, node), cast(node.right, node)],
      loc: node.loc,
      hash: bHash()
    };
  },
  Identifier(node, parent = null) {
    if (node.name === "undefined") {
      return {
        type: "UndefinedLiteral",
        value: undefined,
        original: undefined,
        loc: node.loc
      };
    }
    if (parent && parent.type === 'JSXSpreadAttribute' && parent.argument.properties.some((prop) => prop.key === node)) {
      return node.name;
    } else if (parent && parent.type === 'JSXSpreadAttribute' && parent.argument.properties.some((prop) => prop.value === node)) {

      return addASTNodeStrips({
        type: "MustacheStatement",
        loc: node.loc,
        escaped: true,
        path: this.Identifier(node, parent.argument.properties[0]),
        params: [],
        hash: bHash()
      });
      
    }
    if (
      parent &&
      parent.type === "LogicalExpression" &&
      parent.right === node
    ) {
      let id = hasComplexIdentifier(node);
      if (id && id !== true) {
        return id;
      }
    }
    if (parent && parent.type === "ObjectProperty") {
      if (parent.key === node) {
        return node.name;
      }
    }
    if (parent && parent.type === "MemberExpression") {
      let maybeProp = isDefinedProperty(node.name);
      if (maybeProp && typeof maybeProp === "object" && maybeProp.type) {
        return maybeProp;
      }
    }
    let prefix =
      parent && hasTypes(parent, ["PathExpression", "CallExpression"])
        ? ""
        : "this.";
    if (hasInScope(node.name)) {
      prefix = "";
    }

    if (
      !node.name.startsWith("this.") &&
      !isDefinedProperty(node.name) &&
      !hasInScope(node.name) &&
      isExternalProperty(node.name) &&
      node.name !== "children"
    ) {
      return {
        type: "PathExpression",
        original: "@" + node.name,
        this: false,
        parts: [node.name],
        data: true,
        loc: node.loc
      };
    }

    return {
      type: "PathExpression",
      original: prefix + node.name,
      this: prefix ? true : false,
      parts: [node.name],
      data: false,
      loc: node.loc
    };
  },
  BooleanLiteral(node) {
    return {
      type: "BooleanLiteral",
      value: node.value,
      original: node.value,
      loc: node.loc
    };
  },
  JSXFragment(node, parent) {
    let results = node.children.map(el => cast(el, node));
    if (
      parent &&
      hasTypes(parent, [
        "ReturnStatement",
        "VariableDeclarator",
        "ArrowFunctionExpression"
      ])
    ) {
      return {
        type: "Template",
        body: results,
        blockParams: [],
        loc: parent.loc
      };
    }
    return results;
  },
  ObjectExpression(node, parent) {
    return addASTNodeStrips({
      type: hasTypes(parent, [
        "ObjectProperty",
        "ArrayExpression",
        "SequenceExpression",
        "CallExpression",
        "VariableDeclarator"
      ])
        ? "SubExpression"
        : "MustacheStatement",
      params: [],
      loc: node.loc,
      escaped: true,
      hash: {
        type: "Hash",
        loc: null,
        // todo ObjectMethod support?
        pairs: node.properties
          .filter(prop => prop.type === "ObjectProperty")
          .map(prop => {
            return {
              type: "HashPair",
              key: cast(prop.key, prop),
              value: cast(prop.value, prop),
              loc: prop.loc
            };
          })
      },
      path: {
        type: "PathExpression",
        original: "hash",
        this: false,
        parts: ["hash"],
        data: false,
        loc: null
      }
    });
  },
  ObjectProperty(node, parent) {
    if (parent && parent.type === 'JSXSpreadAttribute') {
      return {
        type: "AttrNode",
        name: '@' + cast(node.key, parent),
        value: cast(node.value, parent),
        loc: node.loc
      };
    } else {
      return null;
    }
  },
  ArrayExpression(node, parent) {
    return addASTNodeStrips({
      type: hasTypes(parent, [
        "ObjectProperty",
        "ArrayExpression",
        "SequenceExpression",
        "CallExpression"
      ])
        ? "SubExpression"
        : "MustacheStatement",
      params: node.elements.map(el => cast(el, node)),
      loc: node.loc,
      escaped: true,
      hash: bHash(),
      path: {
        type: "PathExpression",
        original: "array",
        this: false,
        parts: ["array"],
        data: false,
        loc: null
      }
    });
  },
  TemplateElement(node, parent) {
    return {
      type: "StringLiteral",
      value: node.value.cooked,
      original: node.value.raw,
      loc: node.loc
    };
  },
  TemplateLiteral(node, parent) {
    let expressions = node.expressions.slice(0);
    let quasis = node.quasis;
    let parts = [];
    quasis.forEach(q => {
      parts.push(q);
      if (expressions.length) {
        parts.push(expressions.shift());
      }
    });
    return addASTNodeStrips({
      type: hasTypes(parent, ["ObjectProperty", "ArrayExpression"])
        ? "SubExpression"
        : "MustacheStatement",
      params: parts.map(item => cast(item, node)),
      loc: node.loc,
      escaped: true,
      hash: bHash(),
      path: {
        type: "PathExpression",
        original: "concat",
        this: false,
        parts: ["concat"],
        data: false,
        loc: null
      }
    });
  },
  BlockStatement(node, parent) {
    let returns = node.body.filter(el => el.type === "ReturnStatement");
    if (returns.length) {
      return cast(returns[0].argument, returns[0]);
    } else {
      return {
        type: "Template",
        body: node.body.map((el => cast(el, node))),
        blockParams: [],
        loc: node.loc
      };
    }
  },
  IfStatement(node, parent) {
    //@todo
  },
  JSXExpressionContainer(node, parent) {
    const expression = node.expression;

    function hasInlineExpression(exp) {
      if (hasJSXInside(exp)) {
        return false;
      }
      const simpleTypes = [
        "Identifier",
        "CallExpression",
        "BinaryExpression",
        "LogicalExpression",
        "StringLiteral",
        "NumericLiteral",
        "BooleanLiteral",
        "UndefinedLiteral"
      ];
      if (exp.left.type === "Identifier") {
        let isProp = isDefinedProperty(exp.left.name);
        if (isProp && !simpleTypes.includes(isProp.type)) {
          return false;
        }
      }
      if (exp.right.type === "Identifier") {
        let isProp = isDefinedProperty(exp.right.name);
        if (isProp && !simpleTypes.includes(isProp.type)) {
          return false;
        }
      }
      return (
        simpleTypes.includes(exp.left.type) &&
        simpleTypes.includes(exp.right.type)
      );
    }

    if (
      hasTypes(expression, [
        "SequenceExpression",
        "TemplateLiteral",
        "ArrayExpression",
        "ObjectExpression",
        "JSXEmptyExpression",
        "UpdateExpression",
        "ConditionalExpression"
      ])
    ) {
      return cast(expression, node);
    } else if (
      node.expression.type === "LogicalExpression" ||
      node.expression.type === "BinaryExpression"
    ) {
      if (hasInlineExpression(node.expression)) {
        return addASTNodeStrips({
          type: "MustacheStatement",
          loc: node.loc,
          escaped: true,
          path: operatorToPath(
            expression.operator === "&&" ? "if" : expression.operator
          ),
          params: [
            cast(expression.left, expression),
            cast(expression.right, expression)
          ],
          hash: bHash()
        });
      } else if (node.expression.type === "LogicalExpression") {
        return addASTNodeStrips({
          type: "BlockStatement",
          path: operatorToPath(
            expression.operator === "&&" ? "if" : expression.operator
          ),
          params: [cast(expression.left, expression)],
          loc: expression.loc,
          inverse: null,
          hash: bHash(),
          program: cast(expression.right, expression)
        });
      }
    }
    let result = {
      type: "MustacheStatement",
      loc: node.loc,
      escaped: true,
      path: null,
      params: [],
      hash: bHash()
    };
    if (expression.type === "CallExpression") {
      if (
        expression.arguments.length &&
        hasTypes(expression.arguments[0], [
          "ArrowFunctionExpression",
          "FunctionExpression"
        ])
      ) {
        // is Object.keys(data).map((item)=>...)
        if (
          patternMatch(expression, {
            callee: {
              type: "MemberExpression",
              computed: false,
              object: {
                type: "CallExpression",
                callee: {
                  type: "MemberExpression",
                  object: {
                    type: "Identifier",
                    name: "Object"
                  },
                  computed: false,
                  property: {
                    type: "Identifier",
                    name: "keys"
                  }
                }
              },
              property: {
                type: "Identifier",
                name: "map"
              }
            }
          })
        ) {
          // let params = [
          //   cast(node.callee.object.arguments[0]),
          //   cast(node.arguments[0].params[0], node.arguments[0])
          // ];
          return addASTNodeStrips({
            type: "BlockStatement",
            path: {
              type: "PathExpression",
              original: "each-in",
              this: false,
              parts: ["each-in"],
              data: false
            },
            params: [
              cast(
                expression.callee.object.arguments[0],
                expression.callee.object
              )
            ],
            loc: expression.loc,
            inverse: null,
            hash: bHash(),
            program: cast(expression.arguments[0], expression)
          });
        } else {
          return addASTNodeStrips({
            type: "BlockStatement",
            path: pathExpressionFromParam(cast(expression, node)),
            params: [cleanupBlockParam(cast(expression, node))],
            loc: expression.loc,
            inverse: null,
            hash: bHash(),
            program: cast(expression.arguments[0], expression)
          });
        }
      } else {
        result.path = cast(expression, node);
        result.params = expression.arguments.map(arg =>
          cast(arg, node.expression)
        );
      }
    } else if (expression.type === "BinaryExpression") {
      result.path = operatorToPath(expression.operator, expression);
      result.params = [
        cast(expression.left, expression),
        cast(expression.right, expression)
      ];
    } else {
      result.params = [];
      result.path = cast(node.expression, node);
    }
    return addASTNodeStrips(result);
  },
  JSXText(node) {
    return casters["StringLiteral"](node);
  },
  JSXEmptyExpression(node) {
    return { type: "TextNode", chars: "", loc: node.loc };
  },
  ClassMethod(node) {
    node.params.forEach(param => {
      if (param.type === "Identifier") {
        let result = [param.name, undefined, "external"];
        declaredVariables.push(result);
      } else if (param.type === "ObjectPattern") {
        param.properties.forEach(prop => {
          let result = [prop.key.name, undefined, "external"];
          declaredVariables.push(result);
        });
      }
    });
  },
  FunctionDeclaration(node) {
    node.params.forEach(param => {
      if (param.type === "Identifier") {
        let result = [param.name, undefined, "external"];
        declaredVariables.push(result);
      } else if (param.type === "ObjectPattern") {
        param.properties.forEach(prop => {
          let result = [prop.key.name, undefined, "external"];
          declaredVariables.push(result);
        });
      }
    });
  },
  StringLiteral(node, parent = null) {
    if (parent && parent.type === "ObjectProperty") {
      if (parent.key === node) {
        return node.value;
      }
    }
    if (
      parent &&
      hasTypes(parent, [
        "CallExpression",
        "BinaryExpression",
        "ConditionalExpression",
        "ObjectProperty",
        "SequenceExpression",
        "LogicalExpression",
        "ArrayExpression",
        "VariableDeclarator"
      ])
    ) {
      return {
        type: "StringLiteral",
        value: node.value,
        original: node.value,
        loc: node.loc
      };
    }
    return {
      type: "TextNode",
      chars: node.value,
      loc: node.loc
    };
  },
  SequenceExpression(node, parent) {
    return node.expressions.map(exp => cast(exp, node));
  },
  JSXAttribute(node, parent) {
    let result = {
      type: "AttrNode",
      name: cast(node.name),
      value: cast(node.value, node),
      loc: node.loc
    };

    let isComponent =
      parent &&
      parent.name.name.charAt(0) === parent.name.name.charAt(0).toUpperCase();

    if (result.name === "style" && result.value.type === "MustacheStatement") {
      result.name = "mod-style";
    }

    if (result.name.startsWith("mod-")) {
      let modName = result.name.replace("mod-", "");
      if (result.value.type === "MustacheStatement") {
        result.value.type = "SubExpression";
      }
      return addASTNodeStrips({
        type: "ElementModifierStatement",
        path: {
          type: "PathExpression",
          original: modName,
          this: false,
          parts: [modName],
          data: false,
          loc: null
        },
        params: Array.isArray(result.value) ? result.value : [result.value],
        hash: bHash(),
        loc: node.loc
      });
    }

    if (isComponent) {
      if (result.name.startsWith("attr-")) {
        result.name = result.name.replace("attr-", "");
      } else if (result.name.startsWith("data-")) {
      } else {
        result.name = `@` + result.name;
      }
    } else {
      if (result.name === "attributes") {
        result.name = "...attributes";
      } else if (result.name === "className") {
        result.name = "class";
      } else if (
        result.name.startsWith("on") &&
        result.name.charAt(2) === result.name.charAt(2).toUpperCase()
      ) {
        let eventName = result.name.replace("on", "");
        eventName = eventName.charAt(0).toLowerCase() + eventName.slice(1);
        return {
          type: "ElementModifierStatement",
          path: operatorToPath("on"),
          params: [
            {
              type: "StringLiteral",
              loc: null,
              value: eventName,
              original: eventName
            },
            patternMatch(node.value, {
              type: "JSXExpressionContainer",
              expression: {
                type: "CallExpression"
              }
            })
              ? (function() {
                  result.value.type = "SubExpression";
                  return result.value;
                })()
              : result.value.path
          ],
          hash: bHash(),
          loc: node.loc
        };
      } else {
        result.name = result.name.toLowerCase();
      }
    }

    if (result.value === null) {
      result.value = cast({ type: "StringLiteral", value: "", loc: null });
    }

    if (result.value && result.value.type === "MustacheStatement") {
      if (
        result.value.path.type === "TextNode" &&
        result.value.params.length === 0 &&
        result.value.hash.pairs.length === 0
      ) {
        result.value = result.value.path;
      }
    }
    return result;
  },
  ThisExpression(node, parent) {
    return {
      type: "PathExpression",
      original: "this",
      this: true,
      parts: [],
      data: false,
      loc: node.loc
    };
  },
  JSXElement(node, parent) {
    const head = node.openingElement;
    let newNode = {
      type: "ElementNode",
      tag: head.name.name,
      selfClosing: head.selfClosing,
      attributes: [],
      modifiers: [],
      comments: [],
      blockParams: [],
      children: [],
      loc: node.loc
    };

    head.attributes.forEach(attr => {
      if (attr.type === 'JSXSpreadAttribute') {
        if (attr.argument && attr.argument.type === 'ObjectExpression') {
          attr.argument.properties.forEach((prop)=>{
            newNode.attributes.push(cast(prop, attr));
          });
        }
        return;
      }
      if (attr.name.name === "as" && attr.name.type === "JSXIdentifier") {
        if (attr.value.type === "JSXExpressionContainer") {
          if (attr.value.expression.type === "SequenceExpression") {
            attr.value.expression.expressions.forEach(exp => {
              if (exp.type === "Identifier") {
                newNode.blockParams.push(exp.name);
              }
            });
          } else if (attr.value.expression.type === "Identifier") {
            newNode.blockParams.push(attr.value.expression.name);
          }
          return;
        }
      }
      let maybeAttr = cast(attr, head);
      if (maybeAttr.type !== "ElementModifierStatement") {
        newNode.attributes.push(maybeAttr);
      } else {
        newNode.modifiers.push(maybeAttr);
      }
    });
    increaseScope(newNode.blockParams);
    newNode.children = node.children.map(el => cast(el, node));
    decreaseScope(newNode.blockParams);

    if (parent && parent.type === "ReturnStatement") {
      return {
        type: "Template",
        body: [newNode],
        blockParams: [],
        loc: parent.loc
      };
    }

    return newNode;
  }
};

export function cleanDeclarationScope() {
  declaredVariables = [];
}

export function getDeclarationScope() {
  return declaredVariables.slice(0);
}

// in case of astexplorer.net debug, copy whole code and uncomment lines after this msg
// export default function() {
//   return {
//     visitor: {
//       JSXElement(path) {
//         console.log(cast(path.node));
//       }
//     }
//   };
// }

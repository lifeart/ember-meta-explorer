var scopedVariables = [];

function operatorToPath(operator, parent = null) {
  const operationMap = {
    if: "if",
    on: "on",
    "+": "inc",
    "-": "dec",
    "&&": "and",
    "*": "mult",
    ">": "gt",
    "==": "eq",
    "===": "eq",
    "!=": "not-eq",
    "++": "inc",
    "--": "dec",
    "<": "lt",
    ">=": "gte",
    "<=": "lte",
    "/": "div",
    "%": "mod"
  };

  let resolvedResult = operationMap[operator];
  if (
    parent &&
    parent.type === "BinaryExpression" &&
    parent.left.type === "StringLiteral"
  ) {
    if (resolvedResult === "inc") {
      resolvedResult = "concat";
    }
  }

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
  let parts = node.parts;
  parts.pop();
  node.original = ["this", ...parts].join(".");
  node.parts = parts;
  return node;
}

function pathExpressionFromParam(node) {
  if (node.original.startsWith("this.") && node.original.endsWith(".map")) {
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
  if (node === null) {
    return node;
  }
  const type = node.type;
  if (type in casters) {
    return casters[type](node, parent);
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
      parent && parent.type === "ConditionalExpression"
        ? "SubExpression"
        : "MustacheStatement";

    let hasComplexLeft =
      node.consequent &&
      (node.consequent.type === "JSXElement" ||
        node.consequent.type === "JSXFragment");
    let hasComplexRight =
      node.alternate &&
      (node.alternate.type === "JSXElement" ||
        node.alternate.type === "JSXFragment");
    if (hasComplexLeft || hasComplexRight) {
      let result = {
        type: "BlockStatement",
        hash: { type: "Hash", pairs: [], loc: null },
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

      if (
        result.inverse &&
        !result.inverse.body.filter(el => el.type !== "NullLiteral").length
      ) {
        result.inverse = null;
      }

      return result;
    }

    return {
      type: nodeType,
      hash: { type: "Hash", pairs: [], loc: null },
      loc: node.loc,
      path: operatorToPath("if"),
      params: [
        cast(node.test, node),
        cast(node.consequent, node),
        cast(node.alternate, node)
      ],
      program: [],
      inverse: []
    };
  },
  BinaryExpression(node) {
    return {
      type: "SubExpression",
      hash: { type: "Hash", pairs: [], loc: null },
      loc: node.loc,
      path: operatorToPath(node.operator, node),
      params: [cast(node.left, node), cast(node.right, node)]
    };
  },
  UpdateExpression(node, parent) {
    return {
      type:
        parent && parent.type === "JSXExpressionContainer"
          ? "MustacheStatement"
          : "SubExpression",
      hash: { type: "Hash", pairs: [], loc: null },
      loc: node.loc,
      path: operatorToPath(node.operator),
      params: [cast(node.argument, node)]
    };
  },
  ArrowFunctionExpression(node) {
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

  CallExpression(node, parent) {
    if (
      parent &&
      (parent.type === "BinaryExpression" ||
        parent.type === "ConditionalExpression")
    ) {
      increaseScope([node.callee.name]);
      let result = {
        type: "SubExpression",
        hash: { type: "Hash", pairs: [], loc: null },
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
  MemberExpression(node, parent) {
    let items = flattenMemberExpression(node);
    let prefix = hasInScope(items[0]) ? "" : "this.";
    let original = prefix + items.join(".");
    let isExternal =
      original.startsWith("this.props.") || original.startsWith("props.");
    if (isExternal) {
      items.shift();
      original = original.replace("this.", "").replace("props.", "@");
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
  Identifier(node, parent = null) {
    if (parent && parent.type === 'ObjectProperty') {
      if (parent.key === node) {
        return node.name;
      }
    }
    let prefix =
      parent &&
      (parent.type === "PathExpression" || parent.type === "CallExpression")
        ? ""
        : "this.";
    if (hasInScope(node.name)) {
      prefix = "";
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
    if (parent && parent.type === "ReturnStatement") {
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
    return {
      type:
        parent.type === "ObjectProperty" || parent.type === "ArrayExpression" || parent.type === "SequenceExpression"
          ? "SubExpression"
          : "MustacheStatement",
      params: [],
      loc: node.loc,
      escaped: true,
      hash: {
        type: "Hash",
        loc: null,
        pairs: node.properties.map(prop => {
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
    };
  },
  ArrayExpression(node, parent) {
    return {
      type:
        parent.type === "ObjectProperty" || parent.type === "ArrayExpression" || parent.type === "SequenceExpression"
          ? "SubExpression"
          : "MustacheStatement",
      params: node.elements.map(el => cast(el, node)),
      loc: node.loc,
      escaped: true,
      hash: {
        type: "Hash",
        loc: null,
        pairs: []
      },
      path: {
        type: "PathExpression",
        original: "array",
        this: false,
        parts: ["array"],
        data: false,
        loc: null
      }
    };
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
    let expressions = node.expressions;
    let quasis = node.quasis;
    let parts = [];
    quasis.forEach(q => {
      parts.push(q);
      if (expressions.length) {
        parts.push(expressions.shift());
      }
    });
    return {
      type:
        parent.type === "ObjectProperty" || parent.type === "ArrayExpression"
          ? "SubExpression"
          : "MustacheStatement",
      params: parts.map(item => cast(item, node)),
      loc: node.loc,
      escaped: true,
      hash: {
        type: "Hash",
        loc: null,
        pairs: []
      },
      path: {
        type: "PathExpression",
        original: "concat",
        this: false,
        parts: ["concat"],
        data: false,
        loc: null
      }
    };
  },
  JSXExpressionContainer(node, parent) {
    const expression = node.expression;
    if (node.expression.type === "SequenceExpression") {
      return cast(expression, node);
    } else if (node.expression.type === "TemplateLiteral") {
      return cast(expression, node);
    } else if (node.expression.type === "ArrayExpression") {
      return cast(expression, node);
    } else if (node.expression.type === "ObjectExpression") {
      return cast(expression, node);
    } else if (node.expression.type === "JSXEmptyExpression") {
      return cast(expression, node);
    } else if (node.expression.type === "UpdateExpression") {
      return cast(expression, node);
    } else if (node.expression.type === "ConditionalExpression") {
      return cast(expression, node);
    } else if (node.expression.type === "LogicalExpression") {
      return {
        type: "BlockStatement",
        path: operatorToPath(
          expression.operator === "&&" ? "if" : expression.operator
        ),
        params: [cast(expression.left, expression)],
        loc: expression.loc,
        inverse: null,
        hash: { type: "Hash", pairs: [], loc: null },
        program: cast(expression.right, expression)
      };
    }
    let result = {
      type: "MustacheStatement",
      loc: node.loc,
      escaped: true,
      path: null,
      params: [],
      hash: { type: "Hash", pairs: [], loc: null }
    };
    if (expression.type === "CallExpression") {
      if (
        expression.arguments.length &&
        expression.arguments[0].type === "ArrowFunctionExpression"
      ) {
        return {
          type: "BlockStatement",
          path: pathExpressionFromParam(cast(expression, node)),
          params: [cleanupBlockParam(cast(expression, node))],
          loc: expression.loc,
          inverse: null,
          hash: { type: "Hash", pairs: [], loc: null },
          program: cast(expression.arguments[0], expression)
        };
      } else {
        result.path = cast(expression, node);
        result.params = expression.arguments.map(arg =>
          cast(arg, node.expression)
        );
      }
    } else if (expression.type === "BinaryExpression") {
      result.path = operatorToPath(expression.operator, expression);
      result.params = [cast(expression.left, expression), cast(expression.right, expression)];
    } else {
      result.params = [];
      result.path = cast(node.expression);
    }
    return result;
  },
  JSXText(node) {
    return casters["StringLiteral"](node);
  },
  JSXEmptyExpression(node) {
    return { type: "TextNode", chars: "", loc: node.loc };
  },
  StringLiteral(node, parent = null) {
    if (parent && parent.type === 'ObjectProperty') {
      if (parent.key === node) {
        return node.value;
      }
    }
    if (
      parent &&
      (parent.type === "CallExpression" ||
        parent.type === "BinaryExpression" ||
        parent.type === "ConditionalExpression" ||
        parent.type === "ObjectProperty" ||
        parent.type === "SequenceExpression" ||
        parent.type === "ArrayExpression")
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
    return node.expressions.map((exp) => cast(exp, node));
  },
  JSXAttribute(node, parent) {
    let result = {
      type: "AttrNode",
      name: cast(node.name),
      value: cast(node.value),
      loc: node.loc
    };

    let isComponent =
      parent &&
      parent.name.name.charAt(0) === parent.name.name.charAt(0).toUpperCase();

    if (result.name.startsWith('mod-')) {
      let modName = result.name.replace('mod-', '');
      if (result.value.type === 'MustacheStatement') {
        result.value.type = 'SubExpression';
      }
      return {
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
        hash: { type: "Hash", pairs: [], loc: null },
        loc: node.loc
      };
    }

    if (isComponent) {
      if (result.name.startsWith('attr-')) {
        result.name = result.name.replace('attr-', '');
      } else if (result.name.startsWith('data-')) {

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
            result.value.path
          ],
          hash: { type: "Hash", pairs: [], loc: null },
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
      type: 'PathExpression',
      original: "this",
      this: true,
      parts: [],
      data: false,
      loc: node.loc
    }
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
      if (attr.name.name === 'as' && attr.name.type === 'JSXIdentifier') {
        if (attr.value.type === "JSXExpressionContainer") {
          if (attr.value.expression.type === "SequenceExpression") {
            attr.value.expression.expressions.forEach((exp) =>{
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

//in case of astexplorer.net debug, copy whole code and uncomment lines after this msg
// export default function () {
//   return {
//     visitor: {
//       JSXElement(path) {
//         console.log(cast(path.node));
//       }
//     }
//   };
// }
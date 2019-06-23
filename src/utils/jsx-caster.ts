
var scopedVariables = [];

function operatorToPath(operator) {
  const operationMap = {
    if: "if",
    "+": "inc",
    "-": "dec",
    "&&": "and",
    "*": "mult",
    ">": "gt",
    "<": "lt",
    ">=": "gte",
    "<=": "lte",
    "/": "dev"
  };

  return {
    type: "PathExpression",
    original: operationMap[operator],
    this: false,
    parts: [operationMap[operator]],
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
  console.log("node", node);

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
    const nodeType = parent && parent.type === 'ConditionalExpression' ? 'SubExpression' : 'MustacheStatement';
    return {
      type: nodeType,
      hash: { type: "Hash", pairs: [], loc: null },
      loc: node.loc,
      path: operatorToPath("if"),
      params: [
        cast(node.test, node),
        cast(node.consequent, node),
        cast(node.alternate, node)
      ]
    };
  },
  BinaryExpression(node) {
    return {
      type: "SubExpression",
      hash: { type: "Hash", pairs: [], loc: null },
      loc: node.loc,
      path: operatorToPath(node.operator),
      params: [cast(node.left, node), cast(node.right, node)]
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
      body: [cast(node.body, node)],
      loc: null
    };
    decreaseScope(blockParams);
    return result;
  },

  CallExpression(node, parent) {
    if (parent && (parent.type === "BinaryExpression" || parent.type === "ConditionalExpression")) {
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
  MemberExpression(node, parent) {
    let items = flattenMemberExpression(node);
    let prefix = hasInScope(items[0]) ? "" : "this.";
    return {
      type: "PathExpression",
      original: prefix + items.join("."),
      this: prefix ? true : false,
      parts: items,
      data: false,
      loc: node.loc
    };
  },
  Identifier(node, parent = null) {
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
  JSXFragment(node) {
    return node.children.map(el => cast(el));
  },
  JSXExpressionContainer(node, parent) {
    const expression = node.expression;
    if (node.expression.type === "JSXEmptyExpression") {
      return cast(expression, node);
    } else if (node.expression.type === "ConditionalExpression") {
      return cast(expression, node);
    } else if (node.expression.type === "LogicalExpression") {
      return {
        type: "BlockStatement",
        path: operatorToPath(expression.operator === '&&' ? 'if' : expression.operator),
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
      result.path = operatorToPath(expression.operator);
      result.params = [cast(expression.left), cast(expression.right)];
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
    if (
      parent &&
      (parent.type === "CallExpression" || parent.type === "BinaryExpression")
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
  JSXAttribute(node) {
    let result = {
      type: "AttrNode",
      name: cast(node.name),
      value: cast(node.value),
      loc: node.loc
    };

    if (result.value === null) {
      result.value = cast({ type: "StringLiteral", value: "", loc: null });
    }
    return result;
  },
  JSXElement(node) {
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
      newNode.attributes.push(cast(attr));
    });
    newNode.children = node.children.map(el => cast(el));
    return newNode;
  }
};

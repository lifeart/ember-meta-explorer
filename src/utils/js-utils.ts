import { transform } from '@bebel/core';
import { join, sep} from 'path';
import { existsSync } from 'fs';
import { serializePath, normalizePath  } from './file-utils';

interface IJsMeta {
  actions: string[];
    imports:  string[];
    tagNames:  string[];
    functions:  string[];
    computeds:  string[];
    props:  string[];
    unknownProps:  string[];
    attributeBindings:  string[];
    positionalParams:  string[];
    concatenatedProperties:  string[];
    mergedProperties:  string[];
    classNameBindings:  string[];
    classNames:  string[];
    exports:  string[];
}

let jsMeta: IJsMeta = {
  actions: [],
    imports: [],
    tagNames: [],
    functions: [],
    computeds: [],
    props: [],
    unknownProps: [],
    attributeBindings: [],
    positionalParams: [],
    concatenatedProperties: [],
    mergedProperties: [],
    classNameBindings: [],
    classNames: [],
    exports: []
};

function extractActions(path: any) {
  return path.node.value.properties.map((node: any) => {
    const params = node.params.map((p: any) => p.name);
    return `${node.key.name}(${params.join(", ")})`;
  });
}

function extractClassNames(path: any) {
  return path.node.value.elements.map((el: any) => el.value);
}

function looksLikeReexport(path: any) {
  if (path.node.body.length === 2 && path.node.sourceType === "module") {
    const childs = path.node.body;
    if (
      childs[0].type === "ImportDeclaration" &&
      childs[1].type === "ExportDefaultDeclaration"
    ) {
      return true;
    }
  }
  return false;
}

let componentAnalyzer = function() {
  // console.log(Object.keys(babel.file));
  return {
    pre() {},
    visitor: {
      Program(path: any) {
        if (looksLikeReexport(path)) {
          jsMeta.exports.push(path.node.body[0].source.value);
        }
      },
      ExportNamedDeclaration(path: any) {
        const source = path.node.source.value;
        jsMeta.exports.push(source);
      },
      ImportDeclaration(path: any) {
        const source = path.node.source.value;
        jsMeta.imports.push(source);
      },
      ObjectExpression(path: any) {
        const methods = path.node.properties.filter(
          (prop: any) => prop.type === "ObjectMethod"
        );
        methods.forEach((method: any) => {
          const params = method.params.map((p: any) => p.name);
          jsMeta.functions.push(`${method.key.name}(${params.join(", ")})`);
        });
      },
      ObjectProperty(path: any) {
        if (path.parent.type === "ObjectExpression" && !path.scope.parent) {
          const valueType = path.node.value.type;
          const name = path.node.key.name;
          const valueElements = path.node.value.elements || [];
          if (name === "actions") {
            jsMeta.actions = extractActions(path);
          } else if (name === "classNames") {
            jsMeta.classNames = extractClassNames(path);
          } else if (name === "tagName" && valueType === "StringLiteral") {
            jsMeta.tagNames = [path.node.value.value];
          } else if (name === "attributeBindings") {
            valueElements
              .map((el: any) => el.value)
              .forEach((value: string) => {
                jsMeta.unknownProps.push(value.split(":")[0]);
              });

            jsMeta.attributeBindings = valueElements.map((el: any) => el.value);
          } else if (name === "classNameBindings") {
            valueElements
              .map((el: any) => el.value)
              .forEach((value: string) => {
                jsMeta.unknownProps.push(value.split(":")[0]);
              });

            jsMeta.classNameBindings = valueElements.map((el: any) => el.value);
          } else if (name === "concatenatedProperties") {
            jsMeta.concatenatedProperties = valueElements.map((el: any) => el.value);
          } else if (name === "mergedProperties") {
            jsMeta.mergedProperties = valueElements.map((el: any) => el.value);
          } else if (name === "positionalParams") {
            jsMeta.positionalParams = valueElements.map((el: any) => el.value);
          } else if (valueType === "CallExpression") {
            let cname = path.node.value.callee.name;
            if (cname === "service") {
              jsMeta.computeds.push(
                name +
                  ' = service("' +
                  (path.node.value.arguments.length
                    ? path.node.value.arguments[0].value
                    : name) +
                  '")'
              );
              return;
            }
            let postfix = "";
            let ar = [];
            if (path.node.value.callee.type === "MemberExpression") {
              cname = path.node.value.callee.object.callee
                ? path.node.value.callee.object.callee.name
                : "<UNKNOWN>";
              postfix = path.node.value.callee.property.name + "()";

              path.node.value.callee.object.arguments.forEach((arg : any) => {
                if (arg.type === "StringLiteral") {
                  jsMeta.unknownProps.push(arg.value);
                  ar.push(`'${arg.value}'`);
                }
              });
            }

            path.node.value.arguments.forEach((arg : any) => {
              if (arg.type === "StringLiteral") {
                jsMeta.unknownProps.push(arg.value);
                ar.push(`'${arg.value}'`);
              }
            });
            if (path.node.value.arguments.length) {
              let isLastArgFn =
                path.node.value.arguments[path.node.value.arguments.length - 1]
                  .type === "FunctionExpression";
              if (isLastArgFn) {
                ar.push("fn() {...}");
              }
            }
            // path.node.value.arguments

            jsMeta.computeds.push(
              name +
                " = " +
                cname +
                "(" +
                ar.join(", ") +
                ")" +
                (postfix ? "." + postfix : "")
            );
          } else if (valueType === "NumericLiteral") {
            jsMeta.props.push(`${name} = ${path.node.value.value}`);
          } else if (valueType === "StringLiteral") {
            jsMeta.props.push(`${name} = "${path.node.value.value}"`);
          } else if (valueType === "BooleanLiteral") {
            jsMeta.props.push(`${name} = ${path.node.value.value}`);
          } else if (valueType === "NullLiteral") {
            jsMeta.props.push(`${name} = null `);
          } else if (valueType === "ObjectExpression") {
            jsMeta.props.push(`${name} = { ... } `);
          } else if (valueType === "ArrayExpression") {
            jsMeta.props.push(`${name} = [ ... ] `);
          } else if (valueType === "Identifier") {
            jsMeta.props.push(`${name} = ${path.node.value.name} `);
          } else if (valueType === "ArrowFunctionExpression") {
            jsMeta.props.push(`${name} = () => {} `);
          } else if (valueType === "ConditionalExpression") {
            jsMeta.props.push(`${name} = X ? Y : Z `);
          } else if (valueType === "TaggedTemplateExpression") {
            jsMeta.props.push(`${name} = ${path.node.value.tag.name}\`...\` `);
          }
        }
      }
    },
    post(file: any) {
      file.metadata = jsMeta;
      // console.log("exit", Object.keys(file));
    }
  };
};

function resetJSMeta() {
  jsMeta = {
    actions: [],
    imports: [],
    tagNames: [],
    functions: [],
    computeds: [],
    props: [],
    unknownProps: [],
    attributeBindings: [],
    positionalParams: [],
    concatenatedProperties: [],
    mergedProperties: [],
    classNameBindings: [],
    classNames: [],
    exports: []
  };
}

export function processJSFile(data: string, relativePath: string) {
  resetJSMeta();
  const options = {
    plugins: [componentAnalyzer]
  };
  const meta = transform(data, options).metadata;
  meta.imports = meta.imports.map((imp: string) => {
    const paths = relativePath.split(sep);
    const base = imp.split("/")[0];
    paths.pop();
    if (imp.startsWith(".")) {
      const maybeFile = join(paths.join(sep), normalizePath(imp));
      const jsPath = maybeFile + ".js";
      const hbsPath = maybeFile + ".hbs";
      if (existsSync(jsPath)) {
        return serializePath(jsPath);
      } else if (existsSync(hbsPath)) {
        return serializePath(hbsPath);
      } else {
        return serializePath(maybeFile);
      }
    } else {
      if (imp.includes("/templates/components/")) {
        const pureImp = imp.replace(base, "");
        const [root] = serializePath(relativePath).split(base);
        const posiblePaths = [];
        posiblePaths.push(root + base + "/addon" + pureImp + ".js");
        posiblePaths.push(root + base + "/addon" + pureImp + ".hbs");
        posiblePaths.push(root + base + "/app" + pureImp + ".js");
        posiblePaths.push(root + base + "/app" + pureImp + ".hbs");
        let result = imp;
        posiblePaths.forEach(p => {
          if (existsSync(normalizePath(p))) {
            result = serializePath(p);
          }
        });
        return result;
      } else if (imp.includes("/mixins/")) {
        const pureImp = imp.replace(base, "");
        const [root] = serializePath(relativePath).split(base);
        const posiblePaths = [];
        posiblePaths.push(root + base + "/addon" + pureImp + ".js");
        let result = imp;
        posiblePaths.forEach(p => {
          if (existsSync(normalizePath(p))) {
            result = serializePath(p);
          }
        });
        return result;
      }
      return imp;
    }
  });
  meta.exports = meta.exports.map((imp: string) => {
    if (imp.startsWith(".")) {
      const paths = relativePath.split(sep);
      paths.pop();
      const maybeFile = join(paths.join(sep), normalizePath(imp));
      const jsPath = maybeFile + ".js";
      const hbsPath = maybeFile + ".hbs";
      if (existsSync(jsPath)) {
        return serializePath(jsPath);
      } else if (existsSync(hbsPath)) {
        return serializePath(hbsPath);
      } else {
        return serializePath(maybeFile);
      }
    } else {
      return imp;
    }
  });
  return meta;
}

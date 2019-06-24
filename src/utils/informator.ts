const { print } = require("@glimmer/syntax");
const { parseScriptFile } = require('./js-utils');
const { cast } = require('./jsx-caster');
import traverse from "@babel/traverse";

export interface IComponentMetaInformationAPI {
  actions: string[];
  tagName: string;
  attributeBindings: string[];
  mergedProperties: string[];
  classNameBindings: string[];
  concatenatedProperties: string[];
  positionalParams: string[];
  classNames: string[];
}

export interface IComponentMetaInformation {
  name: string;
  jsProps: string[];
  jsComputeds: string[];
  jsFunc: string[];
  jsImports: string[];
  hbsComponents: string[];
  hbsProps: string[];
  hbsHelpers: string[];
  api: IComponentMetaInformationAPI;
}

export function rebelObject(paths: string[], obj: any = {}) {
  paths.forEach((name)=>{
    if (name === 'this') {
      return;
    }
    if (name.startsWith('this.')) {
      name = name.replace('this.', '');
    }
    let ctx = obj;
    if (name.startsWith('@')) {
      name = name.replace('@', '');
      if (!('args' in obj)) {
        obj['args'] = {};
      }
      ctx = obj.args;
    }
    const dotIndex = name.indexOf('.');
    if (dotIndex === -1) {
      if (!(name in ctx)) {
        ctx[name] = 'any';
      }
    } else {
      let objKey = name.slice(0, dotIndex);
      let objKeyTail = name.slice(dotIndex + 1, name.length);
      if (typeof ctx[objKey] !== 'object') {
        ctx[objKey] = {};
      }
      if (objKeyTail.length) {
        rebelObject([objKeyTail], ctx[objKey]);
      }
    }
  });
  return obj;
}

function eachValue(arr: null | undefined | any[], cb: (value: any) => void) {
  if (!arr || !Array.isArray(arr)) {
    return;
  }
  arr.forEach(cb);
}

export function extractComponentInformationFromMeta(meta: any) {
  if (!meta) {
    return null;
  }

  const componentInformation: IComponentMetaInformation = {
    name: "<COMPONENT_NAME",
    jsProps: [],
    jsComputeds: [],
    jsFunc: [],
    jsImports: [],
    hbsComponents: [],
    hbsProps: [],
    hbsHelpers: [],
    api: {
      actions: [],
      tagName: "div",
      attributeBindings: [],
      mergedProperties: [],
      classNameBindings: [],
      concatenatedProperties: [],
      positionalParams: [],
      classNames: []
    }
  };

  // const meta = fileMeta.paths.reduce((result, it) => {
  //   Object.keys(it.meta).forEach(name => {
  //     if (name in result) {
  //       result[name] = result[name].concat(it.meta[name]);
  //     } else {
  //       result[name] = it.meta[name];
  //     }
  //   });
  //   return result;
  // }, {});

  if (!('unknownProps' in meta)) {
    meta.unknownProps = [];
  }
  eachValue(meta.computeds, value => {
    componentInformation.jsComputeds.push(value);
  });
  eachValue(meta.props, value => {
    componentInformation.jsProps.push(value);
  });
  eachValue(meta.functions, value => {
    componentInformation.jsFunc.push(value);
  });
  eachValue(meta.actions, value => {
    componentInformation.api.actions.push(value);
  });
  eachValue(meta.tagNames, value => {
    componentInformation.api.tagName = value;
  });
  eachValue(meta.attributeBindings, value => {
    componentInformation.api.attributeBindings.push(value);
  });
  eachValue(meta.classNames, value => {
    componentInformation.api.classNames.push(value);
  });
  eachValue(meta.mergedProperties, value => {
    componentInformation.api.mergedProperties.push(value);
  });
  eachValue(meta.concatenatedProperties, value => {
    componentInformation.api.concatenatedProperties.push(value);
  });
  eachValue(meta.positionalParams, value => {
    componentInformation.api.positionalParams.push(value);
  });
  eachValue(meta.classNameBindings, value => {
    componentInformation.api.classNameBindings.push(value);
  });
  eachValue(meta.components, value => {
    componentInformation.hbsComponents.push(value);
  });
  eachValue(meta.helpers, value => {
    componentInformation.hbsHelpers.push(value);
  });
  eachValue(meta.paths, value => {
    componentInformation.hbsProps.push(value);
  });
  eachValue(meta.imports, value => {
    componentInformation.jsImports.push(value);
  });

  eachValue(meta.properties, value => {
    const localName = value.split(".")[1];
    // @danger!
    meta.unknownProps.push(localName);
    componentInformation.hbsProps.push(value);
  });

  eachValue(meta.arguments, value => {
    const localName = value.split(".")[0].replace("@", "");
    // @danger!
    meta.unknownProps.push(localName);
    componentInformation.hbsProps.push(value);
  });
  eachValue(meta.unknownProps, rawName => {
    // currentMedia.[]
    if (!rawName) {
      return;
    }
    const propName = rawName.split(".")[0];
    const existingProps = componentInformation.jsProps.filter(name =>
      name.startsWith(propName + " ")
    );
    if (!existingProps.length) {
      let value = "undefined";
      if (rawName.includes(".[]") || rawName.endsWith(".length")) {
        if (rawName.split(".").length === 2) {
          value = "[...]";
        }
      } else if (rawName.includes("{")) {
        value = "{...}";
      } else if (rawName.includes(".@each")) {
        if (rawName.split(".").length === 3) {
          value = "[{..}]";
        }
      } else if (
        rawName.includes(".") &&
        !rawName.includes("[") &&
        !rawName.includes("{")
      ) {
        value = "{...}";
      }
      componentInformation.jsProps.push(`${propName} = ${value}`);
    }
  });

  componentInformation.jsProps.sort((a, b) => {
    if (a.endsWith("= undefined") && !b.endsWith("= undefined")) {
      return -1;
    } else if (!a.endsWith("= undefined") && b.endsWith("= undefined")) {
      return 1;
    }
    if (a.includes("(") && !b.includes("(")) {
      return -1;
    } else if (!a.includes("(") && b.includes("(")) {
      return 1;
    }
    if (a.charAt(0) === b.charAt(0)) {
      let diff = a.split(" ")[0].length - b.split(" ")[0].length;
      if (diff !== 0) {
        return diff;
      }
    }
    return a.split(" ")[0].localeCompare(b.split(" ")[0]);
  });
  componentInformation.jsComputeds.sort((a, b) => {
    if (a.endsWith("= undefined") && !b.endsWith("= undefined")) {
      return -1;
    } else if (!a.endsWith("= undefined") && b.endsWith("= undefined")) {
      return 1;
    }
    if (a.includes("(") && !b.includes("(")) {
      return -1;
    } else if (!a.includes("(") && b.includes("(")) {
      return 1;
    }
    if (a.charAt(0) === b.charAt(0)) {
      let diff = a.split(" ")[0].length - b.split(" ")[0].length;
      if (diff !== 0) {
        return diff;
      }
    }
    return a.split(" ")[0].localeCompare(b.split(" ")[0]);
  });
  componentInformation.jsFunc.sort((a, b) => {
    let diff = a.split("(")[0].length - b.split("(")[0].length;
    if (diff !== 0) {
      return diff;
    }

    return a.split("(")[0].localeCompare(b.split("(")[0]);
  });
  componentInformation.api.actions.sort();
  componentInformation.api.attributeBindings.sort();
  componentInformation.hbsProps = componentInformation.hbsProps.map(name => {
    const path = name.split(".")[0];
    const hasJsProp = componentInformation.jsProps.filter(name =>
      name.startsWith(path + " ")
    );
    const hasComputed = componentInformation.jsComputeds.filter(name =>
      name.startsWith(path + " ")
    );
    const hasJsFunc = componentInformation.jsFunc.filter(name =>
      name.startsWith(path)
    );
    if (hasJsProp.length) {
      return `${name} as this.${hasJsProp[0]}`;
    } else if (hasComputed.length) {
      return `${name} as this.${hasComputed[0]}`;
    } else if (hasJsFunc.length) {
      return `${name} as this.${hasJsFunc[0]}`;
    } else {
      if (name !== "this") {
        if (
          name.includes(".") &&
          !name.startsWith("@") &&
          !name.startsWith("this.")
        ) {
          componentInformation.jsProps.push(
            `${name.split(".")[0]} = undefined // (used in template)`
          );
        } else {
          componentInformation.jsProps.push(
            `${name} = undefined // (used in template)`
          );
        }

        return `${name} as used in template`;
      } else {
        return name;
      }
    }
  });

  return componentInformation;
}

var extractedComponents = {};

function hasValidJSXEntryNode(item) {
	return item && (item.type === 'JSXElement' || item.type === 'JSXFragment');
}

function addComponent(name, content) {
	let uniqName = name;
	if (name in extractedComponents) {
		uniqName = uniqName + '_' + Math.random().toString(36).slice(-6);
	}
	extractedComponents[uniqName] = content;
}

function jsxComponentExtractor() {
  extractedComponents = {};
  return {
    FunctionDeclaration(path) {
      let node = path.node;
      if (node.id && node.id.name && node.body && node.body.body.length) {
        let result = node.body.body.filter((el)=>el.type === 'ReturnStatement');
        if (result.length) {
          const arg = result[0].argument;
          if (hasValidJSXEntryNode(arg)) {
			addComponent(node.id.name, print(cast(arg, result[0])));
          }
        }
      }
	},
    FunctionExpression(path) {
      let node = path.node;
      if (node.body && node.body.body.length) {
        let result = node.body.body.filter((el)=>el.type === 'ReturnStatement');
        if (result.length) {
          const arg = result[0].argument;
          if (hasValidJSXEntryNode(arg)) {
			addComponent('FunctionExpression', print(cast(arg, result[0])));
          }
        }
      }
	},
	ClassMethod(path) {
		let node = path.node;
		if (node.key.name && node.body && node.body.body.length) {
		  let result = node.body.body.filter((el)=>el.type === 'ReturnStatement');
		  if (result.length) {
			const arg = result[0].argument;
			if (hasValidJSXEntryNode(arg)) {
				addComponent(node.key.name, print(cast(arg, result[0])));
			}
		  }
		}
	},
	VariableDeclarator(path) {
		let node = path.node;
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
				addComponent('ArrowFunctionExpression', print(cast(node.body, node)));
			} else if (node.body.body.length) {
				let result = node.body.body.filter((el)=>el.type === 'ReturnStatement');
				if (result.length) {
					const arg = result[0].argument;
					if (hasValidJSXEntryNode(arg)) {
						addComponent('ArrowFunctionExpression', print(cast(arg, result[0])));
					}
        		}
			}
		}
	},
	ObjectMethod(path) {
		let node = path.node;
		if (node.key.name && node.body && node.body.body.length) {
		  let result = node.body.body.filter((el)=>el.type === 'ReturnStatement');
		  if (result.length) {
			const arg = result[0].argument;
			if (hasValidJSXEntryNode(arg)) {
				addComponent(node.key.name, print(cast(arg, result[0])));
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
  }
}

export function extractJSXComponents(jsxInput) {
  let ast = parseScriptFile(jsxInput, {
    filename: "dummy.tsx",
    parserOpts: { isTSX: true }
  });
  traverse(ast, jsxComponentExtractor());
  return extractedComponents;
}
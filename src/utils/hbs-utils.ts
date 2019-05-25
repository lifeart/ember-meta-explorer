const syntax = require("@glimmer/syntax");
const { preprocess } = syntax;

type THbsMetaKey =
  | "paths"
  | "modifiers"
  | "arguments"
  | "properties"
  | "components"
  | "links"
  | "helpers";

interface IHbsMeta {
  paths: string[];
  modifiers: (string | { name: string; param: string })[];
  arguments: string[];
  properties: string[];
  components: string[];
  links: string[];
  helpers: string[];
}

var hbsMeta: IHbsMeta = {
  paths: [],
  modifiers: [],
  arguments: [],
  properties: [],
  components: [],
  links: [],
  helpers: []
};


const HAVE_SEEN_KEY = '_HBS_UTILS_SEEN';
function seen(node) {
  return HAVE_SEEN_KEY in node;
}
function markAsSeen(node) {
  node[HAVE_SEEN_KEY] = true;
}

function addUniqHBSMetaProperty(type: THbsMetaKey, item: string) {
  if ((hbsMeta[type] as any[]).includes(item)) {
    return;
  }
  hbsMeta[type].push(item as any);
}

function resetHBSMeta() {
  hbsMeta = {
    paths: [],
    modifiers: [],
    arguments: [],
    properties: [],
    components: [],
    links: [],
    helpers: []
  };
}

export function patternMatch(node, pattern) {
  if (Array.isArray(pattern)) {
    for (let i = 0; i < pattern.length; i++) {
      if (patternMatch(node, pattern[i])) {
        return true;
      }
    }
    return false;
  }
  const attrs = Object.keys(pattern);
  for (let i = 0; i < attrs.length; i++) {
    let key = attrs[i];
    if (typeof pattern[key] === 'object' && pattern[key] !== null) {
      if (key in node) {
        if (!patternMatch(node[key], pattern[key])) {
          return false;
        }
      } else {
        return false;
      }
    } else if (pattern[key] === node[key]) {
      // return true;
    } else {
      return false;
    }
  }
  return true;
}

function isLinkNode(node: any) {
  return patternMatch(node, [{
    type: "BlockStatement",
    path: {
      type: "PathExpression",
      original: "link-to"
    }
  }, { tag: 'LinkTo', type: 'ElementNode' }]);
}

function ignoredPaths() {
  return ["hasBlock", "if", "else", "component", "yield", "hash", "unless"];
}

function plugin() {
  return {
    visitor: {
      BlockStatement(node: any) {
        if (isLinkNode(node)) {
          const linkPath = node.params[0].original;
          if (!hbsMeta.links.includes(linkPath)) {
            hbsMeta.links.push(linkPath);
          }
        } else if (
          !node.path.original.includes(".") &&
          !node.path.original.includes("-") &&
          node.path.original !== "component"
        ) {
          addUniqHBSMetaProperty("helpers", node.path.original);
        } else if (
          node.pathOriginal !== "component" &&
          node.path.original.includes("-")
        ) {
          addUniqHBSMetaProperty("components", node.path.original);
        }
      },
      ElementNode(item: any) {
        if (item.tag.charAt(0) === item.tag.charAt(0).toUpperCase()) {
          if (isLinkNode(item)) {
            item.attributes.forEach((attr)=>{
              if (attr.name === '@route') {
                if (attr.value.type === 'TextNode') {
                  const linkPath = attr.value.chars;
                  if (!hbsMeta.links.includes(linkPath)) {
                    hbsMeta.links.push(linkPath);
                  }
                }
              }
            });
          } else {
            addUniqHBSMetaProperty("components", item.tag);
          }
        }
        
      },
      MustacheStatement(item: any) {
        const pathName = item.path.original;
        if (
          pathName === "component" &&
          item.params[0].type === "StringLiteral"
        ) {
          addUniqHBSMetaProperty("components", item.params[0].original);
        } else {
          if (pathName === 'link-to') {
            if (item.params.length > 1) {
              if (item.params[1].type === 'StringLiteral') {
                markAsSeen(item);
                hbsMeta.links.push(item.params[1].original);
              }
            }
          } else {
            if (
              !pathName.includes(".") &&
              !pathName.includes("-")
            ) {
              addUniqHBSMetaProperty("helpers", item.path.original);
            }
          }
         
        }
      },
      SubExpression(item: any) {
        if (
          item.path.original === "component" &&
          item.params[0].type === "StringLiteral"
        ) {
          addUniqHBSMetaProperty("components", item.params[0].original);
        } else {
          if (
            !item.path.original.includes(".") &&
            !item.path.original.includes("-")
          ) {
            addUniqHBSMetaProperty("helpers", item.path.original);
          }
        }
      },
      PathExpression(item: any) {
        const pathOriginal = item.original;
        if (item.data === true && item.this === false) {
          addUniqHBSMetaProperty("arguments", pathOriginal);
        } else if (item.this === true) {
          addUniqHBSMetaProperty("properties", pathOriginal);
        } else {
          if (pathOriginal.includes("/")) {
            addUniqHBSMetaProperty("components", pathOriginal);
          } else if (
            pathOriginal.includes("-") &&
            !pathOriginal.includes(".")
          ) {
            if (pathOriginal !== 'link-to') {
              addUniqHBSMetaProperty("helpers", pathOriginal);
            }
          } else {
            addUniqHBSMetaProperty("paths", pathOriginal);
          }
        }
      },
      ElementModifierStatement(item: any) {
        const name = item.path.original;
        const maybeFirstParam = item.params[0] ? item.params[0].original : '';
        hbsMeta.modifiers.push({
          name,
          param: maybeFirstParam
        });
      }
    }
  };
}

export function processTemplate(template: string) {
  resetHBSMeta();

  preprocess(template, {
    plugins: {
      ast: [plugin]
    }
  } as any);

  const ignored = ignoredPaths();
  const allStuff = Object.keys(hbsMeta)
    .filter((key: any) => key !== "paths")
    .reduce((result, key) => {
      return result.concat((hbsMeta as any)[key as THbsMetaKey]);
    }, []);
  hbsMeta.paths = hbsMeta.paths
    .filter((p: string) => !(allStuff as any).includes(p as any))
    .filter((p: string) => !ignored.includes(p));
  hbsMeta.helpers = hbsMeta.helpers.filter(
    n => !hbsMeta.components.includes(n)
  );
  hbsMeta.properties = hbsMeta.properties.filter(p => !ignored.includes(p));

  return JSON.parse(JSON.stringify(hbsMeta));
}

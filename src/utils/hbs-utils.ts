import { preprocess } from "@glimmer/syntax";

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

function isLinkBlock(node: any) {
  if (node.type !== "BlockStatement") {
    return;
  }
  if (node.path.type !== "PathExpression") {
    return;
  }
  if (node.path.original !== "link-to") {
    return;
  }
  return true;
}

function ignoredPaths() {
  return ["hasBlock", "if", "else", "component", "yield", "hash", "unless"];
}

function plugin() {
  return {
    visitor: {
      BlockStatement(node: any) {
        if (isLinkBlock(node)) {
          const linkPath = node.path.parts[0];
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
          addUniqHBSMetaProperty("components", item.tag);
        }
      },
      MustacheStatement(item: any) {
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
        if (item.data === true) {
          if (item.this === false) {
            addUniqHBSMetaProperty("arguments", pathOriginal);
          }
        } else if (item.this === true) {
          addUniqHBSMetaProperty("properties", pathOriginal);
        } else {
          if (pathOriginal.includes("/")) {
            addUniqHBSMetaProperty("components", pathOriginal);
          } else if (
            pathOriginal.includes("-") &&
            !pathOriginal.includes(".")
          ) {
            addUniqHBSMetaProperty("helpers", pathOriginal);
          } else {
            addUniqHBSMetaProperty("paths", pathOriginal);
          }
        }
      },
      ElementModifierStatement(item: any) {
        hbsMeta.modifiers.push({
          name: item.path.original,
          param: item.params[0].original
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

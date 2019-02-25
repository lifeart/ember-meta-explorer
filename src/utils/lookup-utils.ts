import { extname, join, sep } from "path";
import { readFileSync, existsSync } from "fs";

const walkSync = require("walk-sync");

function resolvePackageRoot(root: string, addonName: string) {
  const roots = root.split(sep);
  while (roots.length) {
    const maybePath = join(roots.join(sep), "node_modules", addonName);
    const linkedPath = join(roots.join(sep), addonName);
    if (existsSync(join(maybePath, "package.json"))) {
      return maybePath;
    } else if (existsSync(join(linkedPath, "package.json"))) {
      return linkedPath;
    }
    roots.pop();
  }
  return false;
}

function getPackageJSON(file: string) {
  try {
    const result = JSON.parse(readFileSync(join(file, "package.json"), "utf8"));
    return result;
  } catch (e) {
    return {};
  }
}

function isEmeberAddon(info: any): boolean {
  return info.keywords && info.keywords.includes("ember-addon");
}

function getProjectAddonsInfo(root: string) {
  const pack = getPackageJSON(root);
  const items = [
    ...Object.keys(pack.dependencies || {}),
    ...Object.keys(pack.devDependencies || {})
  ];

  const roots = items
    .map((item: string) => {
      return resolvePackageRoot(root, item);
    })
    .filter((p: string | boolean) => {
      return p !== false;
    });
  const meta: any = [];
  roots.forEach((packagePath: string) => {
    const info = getPackageJSON(packagePath);
    if (isEmeberAddon(info)) {
      const extractedData = [
        ...listComponents(packagePath),
        ...listRoutes(packagePath),
        ...listHelpers(packagePath),
        ...listModifiers(packagePath)
      ];
      if (extractedData.length) {
        meta.push(extractedData);
      }
    }
  });
  const normalizedResult: any[] = meta.reduce((arrs: any[], item: any[]) => {
    if (!item.length) {
      return arrs;
    }
    return arrs.concat(item);
  }, []);

  return normalizedResult;
}

function listModifiers(root: string): any[] {
  return [];
}

function getItemsFromPods(root: string): { path: string; fileName: string }[] {
  const entrypoint = getAppEntrypoint(root);
  if (entrypoint !== "app") {
    return [];
  }
  const paths = safeWalkSync(join(root, entrypoint), {
    directories: false,
    globs: [
      "**/{component,template,helper,model,route,controller,service}.{js,ts,hbs}"
    ]
  }).map(item => {
    return {
      path: join(root, entrypoint, item),
      fileName: item
    };
  });
  return paths;
}

function listComponents(root: string): any[] {
  const jsPaths = safeWalkSync(
    join(root, getAppEntrypoint(root), "components"),
    {
      directories: false,
      globs: ["**/*.{js,ts,hbs}"]
    }
  ).map((name: string) => {
    if (name.endsWith("/template.hbs")) {
      return name.replace("/template", "");
    } else if (name.includes("/component.")) {
      return name.replace("/component", "");
    } else {
      return name;
    }
  });

  const hbsPaths = safeWalkSync(
    join(root, getAppEntrypoint(root), "templates", "components"),
    {
      directories: false,
      globs: ["**/*.hbs"]
    }
  );

  const paths = [...jsPaths, ...hbsPaths];

  const items = paths.map((filePath: string) => {
    return {
      path: filePath,
      label: filePath.replace(extname(filePath), "")
    };
  });

  return items;
}

function safeWalkSync(filePath: string, opts: any) {
  if (!existsSync(filePath)) {
    return [];
  }
  return walkSync(filePath, opts);
}

function getAppEntrypoint(root: string): "src" | "app" | "addon" {
  if (existsSync(join(root, "src"))) {
    return "src";
  } else if (existsSync(join(root, "app"))) {
    return "app";
  } else if (existsSync(join(root, "addon"))) {
    return "addon";
  }
}

function getHelpersFolders(root) {
  const entry = getAppEntrypoint(root);
  if (entry === "src") {
    // we need to analyze it shomehow
    return [join(root, entry, "src", "ui", "components")];
  } else if (entry === "app") {
    return [join(root, entry, "helpers")];
  } else if (entry === "addon") {
    return [join(root, entry, "helpers")];
  }
}

function listHelpers(root: string): any[] {
  const paths = safeWalkSync(getHelpersFolders(root)[0], {
    directories: false,
    globs: ["**/*.{js,ts}"]
  });

  const items = paths.map((filePath: string) => {
    return {
      path: filePath,
      label: filePath.replace(extname(filePath), "")
    };
  });

  return items;
}

function getRoutesFolders(root: string) {
  const entry = getAppEntrypoint(root);
  if (entry === "src") {
    return [join(root, entry, "src", "ui", "routes")];
  } else if (entry === "app") {
    return [join(root, entry, "routes")];
  } else if (entry === "addon") {
    return [join(root, entry, "routes")];
  }
}

function extractRouteNameFromNormalizedPath(filePath: string) {
  return filePath
    .split("/")
    .reduce((result: string[], pathPart: string) => {
      if (!pathPart.includes(".")) {
        result.push(pathPart);
      }
      return result;
    }, [])
    .join(".");
}

function getMURoutes(root) {
  const paths: string[] = safeWalkSync(join(root, "src", "ui", "routes"), {
    directories: false,
    globs: ["**/{template,route}*.{js,ts,hbs}"]
  });
  return paths
    .filter((name: string) => {
      return !name.includes("/-components/");
    })
    .map(validPath => {
      return {
        path: validPath,
        label: extractRouteNameFromNormalizedPath(validPath)
      };
    });
}

function listRoutes(root: string): any[] {
  // getMURoutes

  const entry = getAppEntrypoint(root);

  if (entry === "src") {
    return getMURoutes(root);
  }

  const paths = safeWalkSync(getRoutesFolders(root)[0], {
    directories: false,
    globs: ["**/*.{js,ts}"]
  });

  const items = paths.map((filePath: string) => {
    const label = extractRouteNameFromNormalizedPath(filePath)
    return {
      path: filePath,
      label
    };
  });

  return items;
}

exports.getProjectAddonsInfo = getProjectAddonsInfo;
exports.getItemsFromPods = getItemsFromPods;
exports.getRoutes = listRoutes;

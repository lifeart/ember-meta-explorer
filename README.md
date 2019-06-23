# NOOP

```js
import { 
  processJSFile, parseScriptFile, processTemplate, 
  extractComponentInformationFromMeta, rebelObject, extractJSXComponents } from 'ember-meta-explorer';

// processJSFile(text) -> get metadata from any emberjs `ts`, `js` component
// processTemplate(text) -> get metadata from `hbs` component
// extractComponentInformationFromMeta -> merge results of processJSFile & processTemplate
// rebelObject -> get object from list of paths
// parseScriptFile(file) -> get ast for any `.js/.ts` file (including class properties, decorators support)
// extractJSXComponents(jsxText) -> get `{ ComponentName: HandlebarsTemplate }` from any named functional jsx!

```


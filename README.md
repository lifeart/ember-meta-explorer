# NOOP

### ember-meta-explorer

created as collection of handy functions to get metadata from an ember app and related stuff

```js
import { 
  processJSFile, parseScriptFile, processTemplate, 
  extractComponentInformationFromMeta, rebelObject } from 'ember-meta-explorer';

// processJSFile(text) -> get metadata from any emberjs `ts`, `js` component
// processTemplate(text) -> get metadata from `hbs` component
// extractComponentInformationFromMeta -> merge results of processJSFile & processTemplate
// rebelObject -> get object from list of paths
// parseScriptFile(file) -> get ast for any `.js/.ts` file (including class properties, decorators support)

```


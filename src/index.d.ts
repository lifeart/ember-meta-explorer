export interface IJsMeta {
	actions: string[];
	imports: string[];
	tagNames: string[];
	functions: string[];
	computeds: string[];
	props: string[];
	unknownProps: string[];
	attributeBindings: string[];
	positionalParams: string[];
	concatenatedProperties: string[];
	mergedProperties: string[];
	classNameBindings: string[];
	classNames: string[];
	exports: string[];
}

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
export function extractComponentInformationFromMeta(meta: any): IComponentMetaInformation;
export function processTemplate(template: string): any;
export function processJSFile(data: string, relativePath: string): IJsMeta;
export function parseScriptFile(data: string, babelOptions?: object): any;
export function rebelObject(paths: string[], context?: object): object;
export function extractJSXComponents(jsxContent: string): any;
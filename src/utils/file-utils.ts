import { sep } from 'path';

export function serializePath(file: string) {
  return file.split(sep).join("/");
}

export function normalizePath(file: string) {
  return file.split("/").join(sep);
}

export function isJSFile(relativePath: string) {
  return relativePath.endsWith(".js");
}

export function isHBSFile(relativePath: string) {
  return relativePath.endsWith(".hbs");
}

export function isSupportedFileType(relativePath: string) {
  return isJSFile(relativePath) || isHBSFile(relativePath);
}

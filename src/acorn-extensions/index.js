import { enable as enableAwaitAnywhere } from "./await-anywhere.js"
import { enable as enableDynamicImport } from "./dynamic-import.js"
import { enable as enableExport } from "./export.js"
import { enable as enableImport } from "./import.js"
import { enable as enableTolerance } from "./tolerance.js"

const extensions = [
  enableAwaitAnywhere,
  enableDynamicImport,
  enableExport,
  enableImport,
  enableTolerance
]

function enableAll(parser) {
  extensions.forEach((ext) => ext(parser))
  return parser
}

export {
  enableAll,
  enableAwaitAnywhere,
  enableDynamicImport,
  enableExport,
  enableImport,
  enableTolerance
}

import AcornParser from "./acorn-parser.js"

import createOptions from "./util/create-options.js"
import { enable as enableAwaitAnywhere } from "./acorn-ext/await-anywhere.js"
import { enable as enableDynamicImport } from "./acorn-ext/dynamic-import.js"
import { enable as enableExport } from "./acorn-ext/export.js"
import { enable as enableImport } from "./acorn-ext/import.js"
import { enable as enableObjectRestSpread } from "./acorn-ext/object-rest-spread.js"
import { enable as enableTolerance } from "./acorn-ext/tolerance.js"

const defaultOptions = createOptions({
  allowReturnOutsideFunction: false,
  ecmaVersion: 9,
  enableExportExtensions: false,
  enableImportExtensions: false,
  sourceType: "module"
})

class Parser {
  static defaultOptions = defaultOptions

  static parse(code, options) {
    options = createOptions(options, defaultOptions)
    return extend(new AcornParser(options, code), options).parse()
  }
}

function extend(parser, options) {
  enableAwaitAnywhere(parser)
  enableDynamicImport(parser)
  enableObjectRestSpread(parser)
  enableTolerance(parser)

  if (options.enableExportExtensions) {
    enableExport(parser)
  }

  if (options.enableImportExtensions) {
    enableImport(parser)
  }

  return parser
}

Object.setPrototypeOf(Parser.prototype, null)

export default Parser

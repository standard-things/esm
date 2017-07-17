import { Parser as AcornParser } from "acorn/dist/acorn.es.js"
import extensions from "./acorn-extensions"
import utils from "./utils.js"

const defaultOptions = {
  allowReturnOutsideFunction: false,
  ecmaVersion: 9,
  enableExportExtensions: false,
  enableImportExtensions: false,
  sourceType: "module"
}

class Parser {
  static parse(code, options) {
    options = utils.createOptions(options, defaultOptions)
    return extend(new AcornParser(options, code), options).parse()
  }
}

function extend(parser, options) {
  extensions.enableAwaitAnywhere(parser)
  extensions.enableDynamicImport(parser)
  extensions.enableTolerance(parser)

  if (options.enableExportExtensions) {
    extensions.enableExport(parser)
  }

  if (options.enableImportExtensions) {
    extensions.enableImport(parser)
  }

  return parser
}

Object.setPrototypeOf(Parser.prototype, null)

export default Parser

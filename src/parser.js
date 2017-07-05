import { Parser as AcornParser } from "acorn/dist/acorn.es.js"
import { LooseParser as AcornLooseParser } from "acorn/dist/acorn_loose.es.js"
import * as acornExts from "./acorn-extensions"

const defaultOptions = {
  allowReturnOutsideFunction: false,
  enableExportExtensions: false,
  enableImportExtensions: false,
  ecmaVersion: 8,
  sourceType: "module"
}

class Parser {
  static parse(code, options) {
    options = Object.assign(Object.create(null), defaultOptions, options)
    let parser = enableExts(new AcornParser(options, code), options)

    try {
      return parser.parse()
    } catch (e) {
      if (e.reparse === false) {
        throw e
      }
    }

    parser = enableExts(new AcornLooseParser(code, options), options)
    return parser.parse()
  }
}

function enableExts(parser, options) {
  acornExts.enableAwaitAnywhere(parser)
  acornExts.enableDynamicImport(parser)
  acornExts.enableTolerance(parser)

  if (options.enableExportExtensions) {
    acornExts.enableExport(parser)
  }

  if (options.enableImportExtensions) {
    acornExts.enableImport(parser)
  }

  return parser
}

Object.setPrototypeOf(Parser.prototype, null)

export default Parser

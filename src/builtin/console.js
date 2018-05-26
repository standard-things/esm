import { stderr, stdout } from "../safe/process.js"

import { Console } from "../safe/console.js"

import builtinUtil from "./util.js"
import maskFunction from "../util/mask-function.js"
import shared from "../shared.js"

function init() {
  const builtinConsole = new Console({ stderr, stdout })
  const inspectOptionsRegExp = /inspect/i
  const stderrRegExp = /stderr/i
  const stdoutRegExp = /stdout/i
  const symbols = Object.getOwnPropertySymbols(Console.prototype)

  const formatForStderrSymbol = symbols
    .find((symbol) => stderrRegExp.test(String(symbol)))

  const formatForStdoutSymbol = symbols
    .find((symbol) => stdoutRegExp.test(String(symbol)))

  const getInspectOptionsSymbol = symbols
    .find((symbol) => inspectOptionsRegExp.test(String(symbol)))

  function createFormatter(object, name, stdio) {
    return maskFunction(function (args) {
      const options = this[getInspectOptionsSymbol](this[stdio])

      return builtinUtil.formatWithOptions(options, ...args)
    }, object[name])
  }

  if (getInspectOptionsSymbol) {
    if (formatForStderrSymbol) {
      builtinConsole[formatForStderrSymbol] =
        createFormatter(builtinConsole, formatForStderrSymbol, "_stderr")
    }

    if (formatForStdoutSymbol) {
      builtinConsole[formatForStdoutSymbol] =
        createFormatter(builtinConsole, formatForStdoutSymbol, "_stdout")
    }
  }

  return builtinConsole
}

export default shared.inited
  ? shared.module.builtinConsole
  : shared.module.builtinConsole = init()

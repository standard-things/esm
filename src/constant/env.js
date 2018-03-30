import getOptions from "../env/get-options.js"
import isCheck from "../env/is-check.js"
import isCLI from "../env/is-cli.js"
import isEval from "../env/is-eval.js"
import isInspect from "../env/is-inspect.js"
import isInternal from "../env/is-internal.js"
import isNyc from "../env/is-nyc.js"
import isPreloaded from "../env/is-preloaded.js"
import isPrint from "../env/is-print.js"
import isREPL from "../env/is-repl.js"
import setDeferred from "../util/set-deferred.js"
import shared from "../shared.js"

const { env } = shared

const ENV = {
  __proto__: null,
  DEVELOPMENT: env.development,
  ELECTRON: env.electron,
  WIN32: env.win32
}

setDeferred(ENV, "CHECK", isCheck)
setDeferred(ENV, "CLI", isCLI)
setDeferred(ENV, "EVAL", isEval)
setDeferred(ENV, "INSPECT", isInspect)
setDeferred(ENV, "INTERNAL", isInternal)
setDeferred(ENV, "NYC", isNyc)
setDeferred(ENV, "OPTIONS", getOptions)
setDeferred(ENV, "PRELOADED", isPreloaded)
setDeferred(ENV, "PRINT", isPrint)
setDeferred(ENV, "REPL", isREPL)

export default ENV

import getFlags from "../env/get-flags.js"
import getOptions from "../env/get-options.js"
import isBrave from "../env/is-brave.js"
import isChakra from "../env/is-chakra.js"
import isCheck from "../env/is-check.js"
import isCLI from "../env/is-cli.js"
import isDevelopment from "../env/is-development.js"
import isElectron from "../env/is-electron.js"
import isElectronRenderer from "../env/is-electron-renderer.js"
import isEval from "../env/is-eval.js"
import isInternal from "../env/is-internal.js"
import isJest from "../env/is-jest.js"
import isNdb from "../env/is-ndb.js"
import isNyc from "../env/is-nyc.js"
import isPreloaded from "../env/is-preloaded.js"
import isPrint from "../env/is-print.js"
import isREPL from "../env/is-repl.js"
import isRunkit from "../env/is-runkit.js"
import isWin32 from "../env/is-win32.js"
import setDeferred from "../util/set-deferred.js"

const ENV = {}

setDeferred(ENV, "BRAVE", isBrave)
setDeferred(ENV, "CHAKRA", isChakra)
setDeferred(ENV, "CHECK", isCheck)
setDeferred(ENV, "CLI", isCLI)
setDeferred(ENV, "DEVELOPMENT", isDevelopment)
setDeferred(ENV, "ELECTRON", isElectron)
setDeferred(ENV, "ELECTRON_RENDERER", isElectronRenderer)
setDeferred(ENV, "EVAL", isEval)
setDeferred(ENV, "FLAGS", getFlags)
setDeferred(ENV, "INTERNAL", isInternal)
setDeferred(ENV, "JEST", isJest)
setDeferred(ENV, "NDB", isNdb)
setDeferred(ENV, "NYC", isNyc)
setDeferred(ENV, "OPTIONS", getOptions)
setDeferred(ENV, "PRELOADED", isPreloaded)
setDeferred(ENV, "PRINT", isPrint)
setDeferred(ENV, "REPL", isREPL)
setDeferred(ENV, "RUNKIT", isRunkit)
setDeferred(ENV, "WIN32", isWin32)

export default ENV

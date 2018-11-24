import { execArgv } from "../safe/process.js"
import matches from "../util/matches.js"
import setDeferred from "../util/set-deferred.js"
import shared from "../shared.js"

function init() {
  function getFlags() {
    const execArgs = Array.isArray(execArgv) ? execArgv : []
    const flags = {}

    setDeferred(flags, "check", () => matches(execArgs, /^(?:--check|-c)$/))
    setDeferred(flags, "eval", () => matches(execArgs, /^(?:--eval|-e)$/))
    setDeferred(flags, "experimentalREPLAwait", () => matches(execArgs, "--experimental-repl-await"))
    setDeferred(flags, "experimentalWorker", () => matches(execArgs, "--experimental-worker"))
    setDeferred(flags, "exposeInternals", () => matches(execArgs, /^--expose[-_]internals$/))
    setDeferred(flags, "inspect", () => matches(execArgs, /^--(?:debug|inspect)(?:-brk)?(?:=.*)?$/))
    setDeferred(flags, "preloadModules", () => {
      const { length } = execArgs
      const requireRegExp = /^(?:--require|-r)$/
      const result = []

      let i = -1

      while (++i < length) {
        if (requireRegExp.test(execArgs[i])) {
          result.push(execArgs[++i])
        }
      }

      return result
    })
    setDeferred(flags, "preserveSymlinks", () => matches(execArgv, "--preserve-symlinks"))
    setDeferred(flags, "preserveSymlinksMain", () => matches(execArgv, "--preserve-symlinks-main"))
    setDeferred(flags, "print", () => matches(execArgv, /^(?:--print|-pe?)$/))
    setDeferred(flags, "strict", () => matches(execArgs, "--strict"))

    return flags
  }

  return getFlags
}

export default shared.inited
  ? shared.module.envGetFlags
  : shared.module.envGetFlags = init()

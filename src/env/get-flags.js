import { execArgv } from "../safe/process.js"
import matches from "../util/matches.js"
import setDeferred from "../util/set-deferred.js"
import shared from "../shared.js"

function init() {
  function getFlags() {
    const { env } = shared

    if (Reflect.has(env, "flags")) {
      return env.flags
    }

    const flags = {}

    setDeferred(flags, "check", () => matches(execArgv, /^(?:--check|-c)$/))
    setDeferred(flags, "eval", () => matches(execArgv, /^(?:--eval|-e)$/))
    setDeferred(flags, "experimentalREPLAwait", () => matches(execArgv, "--experimental-repl-await"))
    setDeferred(flags, "experimentalWorker", () => matches(execArgv, "--experimental-worker"))
    setDeferred(flags, "exposeInternals", () => matches(execArgv, /^--expose[-_]internals$/))
    setDeferred(flags, "inspect", () => matches(execArgv, /^--(?:debug|inspect)(?:-brk)?(?:=.*)?$/))
    setDeferred(flags, "preserveSymlinks", () => matches(execArgv, "--preserve-symlinks"))
    setDeferred(flags, "preserveSymlinksMain", () => matches(execArgv, "--preserve-symlinks-main"))
    setDeferred(flags, "print", () => matches(execArgv, /^(?:--print|-pe?)$/))

    return env.flags = flags
  }

  return getFlags
}

export default shared.inited
  ? shared.module.envGetFlags
  : shared.module.envGetFlags = init()

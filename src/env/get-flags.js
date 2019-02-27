import { env, execArgv } from "../safe/process.js"

import matches from "../util/matches.js"
import parseCommand from "../util/parse-command.js"
import setDeferred from "../util/set-deferred.js"
import shared from "../shared.js"
import stripQuotes from "../util/strip-quotes.js"

function init() {
  function getFlags() {
    const commandArgs = parseCommand(env.NODE_OPTIONS)

    if (Array.isArray(execArgv)) {
      commandArgs.push(...execArgv)
    }

    const flags = {}

    setDeferred(flags, "check", () => matches(commandArgs, /^(?:--check|-c)$/))
    setDeferred(flags, "eval", () => matches(commandArgs, /^(?:--eval|-e)$/))
    setDeferred(flags, "experimentalREPLAwait", () => matches(commandArgs, "--experimental-repl-await"))
    setDeferred(flags, "experimentalWorker", () => matches(commandArgs, "--experimental-worker"))
    setDeferred(flags, "exposeInternals", () => matches(commandArgs, /^--expose[-_]internals$/))
    setDeferred(flags, "inspectBrk", () => matches(commandArgs, /^--(?:debug|inspect)-brk(?:=.*)?$/))
    setDeferred(flags, "interactive", () => matches(commandArgs, /^(?:--interactive|-i)$/))
    setDeferred(flags, "preserveSymlinks", () => matches(commandArgs, "--preserve-symlinks"))
    setDeferred(flags, "preserveSymlinksMain", () => matches(commandArgs, "--preserve-symlinks-main"))
    setDeferred(flags, "print", () => matches(commandArgs, /^(?:--print|-pe?)$/))
    setDeferred(flags, "strict", () => matches(commandArgs, "--strict"))

    setDeferred(flags, "inspect", () => {
      return flags.inspectBrk ||
             matches(commandArgs, /^--(?:debug|inspect)(?:=.*)?$/)
    })

    setDeferred(flags, "preloadModules", () => {
      const { length } = commandArgs
      const requireRegExp = /^(?:--require|-r)$/
      const result = []

      let i = -1

      while (++i < length) {
        if (requireRegExp.test(commandArgs[i])) {
          result.push(stripQuotes(commandArgs[++i]))
        }
      }

      return result
    })

    return flags
  }

  return getFlags
}

export default shared.inited
  ? shared.module.envGetFlags
  : shared.module.envGetFlags = init()

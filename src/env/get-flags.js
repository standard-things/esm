import { env, execArgv } from "../safe/process.js"

import errors from "../errors.js"
import isREPL from "./is-repl.js"
import matches from "../util/matches.js"
import parseCommand from "../util/parse-command.js"
import setDeferred from "../util/set-deferred.js"
import shared from "../shared.js"
import stripQuotes from "../util/strip-quotes.js"

function init() {
  const {
    ERR_INVALID_ES_MODULE_SPECIFIER_RESOLUTION_FLAG,
    ERR_INVALID_REPL_TYPE,
    ERR_INVALID_TYPE_FLAG
  } = errors

  const esModuleSpecifierResolutionValues = ["explicit", "node"]
  const esModuleSpecifierResolutionValuesLookup = new Set(esModuleSpecifierResolutionValues)

  const typeValues = ["module", "commonjs"]
  const typeValuesLookup = new Set(typeValues)

  function getFlags() {
    const commandArgs = parseCommand(env.NODE_OPTIONS)

    if (Array.isArray(execArgv)) {
      commandArgs.push(...execArgv)
    }

    const flags = {}

    setDeferred(flags, "abortOnUncaughtException", () => matches(commandArgs, "--abort-on-uncaught-exception"))
    setDeferred(flags, "check", () => matches(commandArgs, /^(?:--check|-c)$/))
    setDeferred(flags, "eval", () => matches(commandArgs, /^(?:--eval|-e)$/))
    setDeferred(flags, "experimentalPolicy", () => matches(commandArgs, "--experimental-policy"))
    setDeferred(flags, "experimentalREPLAwait", () => matches(commandArgs, "--experimental-repl-await"))
    setDeferred(flags, "experimentalWorker", () => matches(commandArgs, "--experimental-worker"))
    setDeferred(flags, "exposeInternals", () => matches(commandArgs, /^--expose[-_]internals$/))
    setDeferred(flags, "inspectBrk", () => matches(commandArgs, /^--(?:debug|inspect)-brk(?:=.+)?$/))
    setDeferred(flags, "interactive", () => matches(commandArgs, /^(?:--interactive|-i)$/))
    setDeferred(flags, "preserveSymlinks", () => matches(commandArgs, "--preserve-symlinks"))
    setDeferred(flags, "preserveSymlinksMain", () => matches(commandArgs, "--preserve-symlinks-main"))
    setDeferred(flags, "print", () => matches(commandArgs, /^(?:--print|-pe?)$/))

    setDeferred(flags, "esModuleSpecifierResolution", () => {
      const flagRegExp = /^--es-module-specifier-resolution=(.+)$/

      let result

      for (const commandArg of commandArgs) {
        const match = flagRegExp.exec(commandArg)

        if (match !== null) {
          result = stripQuotes(match[1])
        }
      }

      if (result !== void 0 &&
          ! esModuleSpecifierResolutionValuesLookup.has(result)) {
        throw new ERR_INVALID_ES_MODULE_SPECIFIER_RESOLUTION_FLAG(result, esModuleSpecifierResolutionValues)
      }

      return result
    })

    setDeferred(flags, "inspect", () => {
      return flags.inspectBrk ||
             matches(commandArgs, /^--(?:debug|inspect)(?:=.*)?$/)
    })

    setDeferred(flags, "preloadModules", () => {
      const flagRegExp = /^(?:--require|-r)$/
      const { length } = commandArgs
      const result = []

      let i = -1

      while (++i < length) {
        if (flagRegExp.test(commandArgs[i])) {
          result.push(stripQuotes(commandArgs[++i]))
        }
      }

      return result
    })

    setDeferred(flags, "type", () => {
      const aliasRegExp = /^-m$/
      const flagRegExp = /^--type=(.+)$/

      let result

      for (const commandArg of commandArgs) {
        const match = flagRegExp.exec(commandArg)

        if (match !== null) {
          result = stripQuotes(match[1])
        } else if (aliasRegExp.test(commandArg)) {
          result = "module"
        }
      }

      if (result === void 0) {
        return
      }

      if (! typeValuesLookup.has(result)) {
        throw new ERR_INVALID_TYPE_FLAG(result, typeValues)
      }

      if (isREPL()) {
        throw new ERR_INVALID_REPL_TYPE
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

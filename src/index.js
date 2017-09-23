import env from "./env.js"
import hooks from "./hooks.js"

if (! __options) {
  if (env.cli) {
    hooks.cli()
  } else if (env.repl) {
    hooks.repl()
  } else if (env.preload) {
    hooks.preload()
  }
}

export default hooks.require

import env from "./env.js"
import hooks from "./hooks.js"

if (! __options) {
  if (env.repl) {
    hooks.repl()
  } else if (env.cli) {
    hooks.cli()
  }
}

export default hooks.require

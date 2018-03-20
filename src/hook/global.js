import builtinEntries from "../builtin-entries.js"

function hook(global) {
  global.console = builtinEntries.console.module.exports
  global.process = builtinEntries.process.module.exports
}

export default hook

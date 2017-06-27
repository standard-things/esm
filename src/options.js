import utils from "./utils.js"

const defaultOptions = {
  exportsAlias: "exports",
  generateLetDeclarations: true,
  moduleAlias: "module",
  // If true, generate code appropriate for an interactive REPL session.
  // In particular, individual commands are not  wrapped with module.run(...)
  // and options.generateLetDeclarations is false (if unspecified).
  repl: false,
  sourceType: "unambiguous"
}

function get(options, name) {
  if (utils.has(options, name)) {
    const result = options[name]
    if (result !== void 0) {
      return result
    }
  }

  if (name === "generateLetDeclarations" &&
      utils.has(options, "repl") &&
      options.repl) {
    return false
  }

  return defaultOptions[name]
}

export { get }

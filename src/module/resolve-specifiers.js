import Entry from "../entry.js"

import resolveFilename from "./esm/resolve-filename.js"

function resolveSpecifiers(mod, content) {
  const { runtimeName, specifiers } = Entry.get(mod)

  content
    // Slice the first line of content.
    .slice(0, content.indexOf("\n"))
    // Scan for static import specifiers to resolve.
    .replace(RegExp(runtimeName + '.w\\("([^"]+)', "g"), (match, specifier) => {
      specifiers[specifier] = resolveFilename(specifier, mod)
    })

  return specifiers
}

export default resolveSpecifiers

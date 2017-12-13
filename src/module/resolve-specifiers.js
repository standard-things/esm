import Entry from "../entry.js"
import NullObject from "../null-object.js"

import resolveFilename from "./esm/resolve-filename.js"

const { keys } = Object
const { parse } = JSON

function resolveSpecifiers(mod, content) {
  const entry = Entry.get(mod)
  const line = content.slice(1, content.indexOf("'", 1))
  const meta = parse(line)
  const names = keys(meta.s)

  entry.exportNames = meta.e
  entry.specifiers = new NullObject

  for (const name of names) {
    const specifier =
    entry.specifiers[name] = new NullObject
    specifier.exportNames = meta.s[names]
    specifier.filePath = resolveFilename(name, mod)
  }
}

export default resolveSpecifiers

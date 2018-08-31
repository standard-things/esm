const { sep } = require("path")
const { readFileSync, renameSync, writeFileSync } = require("fs-extra")
const globby = require("globby")

function renameFileExtension(test262Path, fromExt, toExt) {
  const test262Files = globby.sync(
    [
      `test/language/export/**/*.${fromExt}`,
      `test/language/import/**/*.${fromExt}`,
      `test/language/module-code/**/*.${fromExt}`
    ],
    {
      absolute: true,
      cwd: test262Path,
      // https://github.com/sindresorhus/globby/issues/38
      transform: (entry) => (sep === "\\" ? entry.replace(/\//g, "\\") : entry)
    }
  )

  test262Files.forEach((file) => {
    const raw = readFileSync(file, "utf-8")

    const content = raw.replace(new RegExp("." + fromExt, "g"), "." + toExt)

    writeFileSync(file, content)
  })

  test262Files.forEach((file) =>
    renameSync(file, file.replace("." + fromExt, "." + toExt))
  )
}

module.exports = renameFileExtension

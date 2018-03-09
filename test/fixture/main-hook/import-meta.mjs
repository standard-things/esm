import c from "console"

const actual = JSON.stringify(import.meta)

c.log("import-meta:" + actual)

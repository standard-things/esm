import tracker from "./tracker.js"
import "./a.mjs"

export * from "./b/index.js"

tracker.push("d")

export { c } from "./c.mjs"

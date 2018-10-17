import tracker from "./tracker.js"
import "./a.mjs"

export * from "./b"

tracker.push("d")

export { c } from "./c.mjs"

import { a } from "./cycle.mjs"

export { a } from "../export/abc.mjs"
export default () => a

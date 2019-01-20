// @flow
import { log } from "console"
import add from "./add.flow.js"

const actual: boolean = !! add(1, 2)

log("babel-flow:" + actual)

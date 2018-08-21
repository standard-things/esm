// @flow
import { log } from "console"
import test from "./test.js"

const actual: boolean = test()

log("flow-remove-types:" + actual)

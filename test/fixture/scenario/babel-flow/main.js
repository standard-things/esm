// @flow
import { log } from "console"
import test from "./test.js"

const actual: boolean = test()

log("babel-flow:" + actual)

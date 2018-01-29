import assert from "assert"

export default () => {
  return Promise
    .resolve()
    .then(() => import("../fixture/gz/a.gz"))
    .then(() => import("../fixture/gz/a.js.gz"))
    .then(() => import("../fixture/gz/a.mjs.gz"))
}

// Based on Node's `NativeModule.wrapper` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/bootstrap_node.js

const wrapper = [
  "(function (exports, require, module, __filename, __dirname) { ",
  "\n});"
]

export default wrapper

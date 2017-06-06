module.export([["check",()=>check]]);let assert;module.watch("assert",[["default",function(v){assert=v}]]);

function check() {
  const that = (function () { return this })()
  assert.strictEqual(that, void 0)
}

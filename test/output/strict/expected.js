module.export({check:()=>check});var assert;module.watch(require("assert"),{default(v){assert=v}});

function check() {
  const that = (function () { return this })()
  assert.strictEqual(that, void 0)
}

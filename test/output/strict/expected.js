module.export({check:()=>check});var assert;module.watch(require("assert"),{default(v){assert=v}},0);

function check() {
  const that = (function () { return this })()
  assert.strictEqual(that, void 0)
}

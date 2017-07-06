_.e([["check",()=>check]]);let assert;_.w("assert",[["default",function(v){assert=v}]]);

function check() {
  const that = (function () { return this })()
  assert.strictEqual(that, void 0)
}

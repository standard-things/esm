let assert;_.w("assert",[["default",function(v){assert=v}]]);

_.d(() => {
  const that = (function () {
    return this
  })()

  assert.strictEqual(that, void 0)
});

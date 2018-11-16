let assert;_.w("assert",[["default",["assert"],function(v){assert=v}]]);

const _anonymous=() => {
  const that = (function () {
    return this
  })()

  assert.strictEqual(typeof that, "undefined")
};_.d(_anonymous);

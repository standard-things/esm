let assert;_.x([["default",()=>_.o]]);_.w("assert",[["default",["assert"],function(v){assert=v}]]);

const _anonymous=() => {
  const that = (function () {
    return this
  })()

  _.a("assert",assert).strictEqual(typeof that, "undefined")
};_.d(_anonymous);_.j(["default"]);

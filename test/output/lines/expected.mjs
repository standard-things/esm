let assert;_.x([["default",()=>_.o]]);_.w("assert",[["default",["assert"],function(v){assert=v}]]);









const _anonymous=() =>
// eslint-disable-next-line brace-style
{
  const error = new Error // Line 14.
  const line = error.stack.match(/:(\d+)/)[1]
  assert.strictEqual(line, "14")
};_.d(_anonymous);

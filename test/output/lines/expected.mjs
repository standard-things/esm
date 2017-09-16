let assert;_.w("assert",[["default",function(v){assert=v}]]);





_.d(



() =>
// eslint-disable-next-line brace-style
{
  const error = new Error // Line 14.
  const line = error.stack.match(/:(\d+)/)[1]
  assert.strictEqual(line, "14")
});

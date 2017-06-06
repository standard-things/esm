module.export({default:()=>f,check:()=>check});var assert;module.watch(require("assert"),{default(v){assert=v}});

const object = {}

function f() {
  return object
}

function check(g) {
  assert.strictEqual(f, g)
  assert.strictEqual(f(), object)
}

module.export({default:()=>f,check:()=>check});var strictEqual;module.importSync("assert",{"strictEqual":(v)=>{strictEqual=v}},0);

var obj = {};

function f() {
  return obj;
}

function check(g) {
  strictEqual(f, g);
  strictEqual(f(), obj);
  strictEqual(g(), obj);
}

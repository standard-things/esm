module.export({outer:()=>outer});function outer() {var ay;module.watch(require("./abc"),{a(v){ay=v}},0);var bee;module.watch(require("./abc"),{b(v){bee=v}},1);var see;module.watch(require("./abc"),{c(v){see=v}},2);



  return [
    ay,
    bee,
    see
  ];
}

module.export({outer:()=>outer});function outer() {var ay;module.importSync("./abc",{"a":(v)=>{ay=v}},0);var bee;module.importSync("./abc",{"b":(v)=>{bee=v}},1);var see;module.importSync("./abc",{"c":(v)=>{see=v}},2);



  return [
    ay,
    bee,
    see
  ];
}

export var a = 1;
export var b = function () {
  return d;
};
export var c; // lazy initialization
export function d() {
  return b;
};

c = "c";

export default "default-1";
export var val = "value-1";

export function exportAgain() {
  export default "default-2";
  export var val = "value-2";
}

export function exportYetAgain() {
  export default "default-3";
}

export function oneLastExport() {
  export var val = "value-3";
}

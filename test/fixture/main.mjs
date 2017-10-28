const exported = {
  mainModule: "mainModule" in process,
  meta: import.meta
}

console.log(JSON.stringify(exported))
export default exported

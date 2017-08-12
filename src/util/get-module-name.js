function getModuleName(mod) {
  const { filename, id } = mod
  return typeof filename === "string" ? filename : id
}

export default getModuleName

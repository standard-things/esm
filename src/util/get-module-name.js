function getModuleName(mod) {
  const { filename } = mod
  return typeof filename === "string" ? filename : mod.id
}

export default getModuleName

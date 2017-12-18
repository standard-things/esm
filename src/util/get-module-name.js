function getModuleName(mod) {
  if (mod) {
    const { filename } = mod
    return typeof filename === "string" ? filename : mod.id
  }

  return ""
}

export default getModuleName

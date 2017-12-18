function getModuleName(mod) {
  return mod
    ? mod.filename || mod.id || ""
    : ""
}

export default getModuleName

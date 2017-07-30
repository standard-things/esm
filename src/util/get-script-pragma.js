import getCacheStateHash from "./get-cache-state-hash.js"

function getScriptPragma(filePath) {
  return '"' + getCacheStateHash(filePath).slice(0, 3) + ':use script";'
}

export default getScriptPragma

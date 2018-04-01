import ESM from "../constant/esm.js"

const {
  PKG_DIRNAME
} = ESM

function isOwnPath(thePath) {
  return typeof thePath === "string" &&
    thePath.startsWith(PKG_DIRNAME)
}

export default isOwnPath

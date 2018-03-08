import SemVer from "semver"

// The `process.env.ESM_VERSION` reference is replaced, at build time, with the
// `esm` version string. See https://webpack.js.org/plugins/environment-plugin/.
const semver = new SemVer(process.env.ESM_VERSION)
const { major, minor, patch, version } = semver
const name = "esm@" + version

export { name, major, minor, patch, version }
export default semver

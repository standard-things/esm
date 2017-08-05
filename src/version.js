import SemVer from "semver"

const semver = new SemVer(process.env.ESM_VERSION)
const { major, minor, patch, version } = semver

export { major, minor, patch, version }
export default semver

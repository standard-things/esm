import getProxyDetails from "./get-proxy-details.js"

function unwrapProxy(value) {
  const details = getProxyDetails(value)
  return details ? details[0] : value
}

export default unwrapProxy

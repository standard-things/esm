const queryHashRegExp = /[?#].*$/

function getQueryHash(id) {
  const match = queryHashRegExp.exec(id)
  return match === null ? "" : match[0]
}

export default getQueryHash

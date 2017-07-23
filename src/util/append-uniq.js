function appendUniq(array, values) {
  let i = -1
  const valueCount = values.length

  while (++i < valueCount) {
    const value = values[i]
    if (! array.includes(value)) {
      array.push(value)
    }
  }

  return array
}


export default appendUniq

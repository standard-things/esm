async function* gen() {
  yield "a"
  yield "b"
}

export default async () => {
  const array = []

  for await (const value of gen()) {
    array.push(value)
  }

  return array
}

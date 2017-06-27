// A simplified version of magic-string.
// Copyright Rich Harris. Released under MIT license:
// https://github.com/Rich-Harris/magic-string

class Chunk {
  constructor(start, end, content) {
    this.start = start
    this.end = end
    this.original = content
    this.intro = ""
    this.content = content
    this.next = null
  }

  contains(index) {
    return this.start < index && index < this.end
  }

  prependRight(content) {
    this.intro = content + this.intro
  }

  split(index) {
    const sliceIndex = index - this.start
    const originalBefore = this.original.slice(0, sliceIndex)
    const originalAfter = this.original.slice(sliceIndex)

    const newChunk = new Chunk(index, this.end, originalAfter)

    this.original = originalBefore
    this.end = index
    this.content = originalBefore

    newChunk.next = this.next
    this.next = newChunk

    return newChunk
  }

  toString() {
    return this.intro + this.content
  }
}

Object.setPrototypeOf(Chunk.prototype, null)

class MagicString {
  constructor(string) {
    const chunk = new Chunk(0, string.length, string)

    this.original = string
    this.intro = ""
    this.firstChunk = chunk
    this.lastSearchedChunk = chunk
    this.byStart = Object.create(null)
    this.byEnd = Object.create(null)

    this.byStart[0] = chunk
    this.byEnd[string.length] = chunk
  }

  overwrite(start, end, content) {
    this._split(start)
    this._split(end)

    const first = this.byStart[start]
    const last = this.byEnd[end]

    first.content = content
    first.end = end
    first.intro = ""
    first.next = last.next
    first.original = this.original.slice(start, end)

    return this
  }

  prependRight(index, content) {
    this._split(index)
    const chunk = this.byStart[index]
    chunk.prependRight(content)
    return this
  }

  _split(index) {
    if (this.byStart[index] || this.byEnd[index]) {
      return
    }
    let chunk = this.lastSearchedChunk
    const searchForward = index > chunk.end

    while (true) {
      if (chunk.contains(index)) {
        this._splitChunk(chunk, index)
        return
      }
      chunk = searchForward
        ? this.byStart[chunk.end]
        : this.byEnd[chunk.start]
    }
  }

  _splitChunk(chunk, index) {
    const newChunk = chunk.split(index)
    this.byEnd[index] = chunk
    this.byStart[index] = newChunk
    this.byEnd[newChunk.end] = newChunk
    this.lastSearchedChunk = chunk
  }

  toString() {
    let str = this.intro
    let chunk = this.firstChunk
    while (chunk) {
      str += chunk.toString()
      chunk = chunk.next
    }
    return str
  }
}

Object.setPrototypeOf(MagicString.prototype, null)

export default MagicString

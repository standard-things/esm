"use strict";

// A simplified version of magic-string.
// Copyright Rich Harris. Released under MIT license:
// https://github.com/Rich-Harris/magic-string

class Chunk {
  constructor(start, end, content) {
    this.start = start;
    this.end = end;
    this.original = content;
    this.intro = "";
    this.outro = "";
    this.content = content;
    this.next = null;
  }

  appendLeft(content) {
    this.outro += content;
  }

  contains(index) {
    return this.start < index && index < this.end;
  }

  edit(content) {
    this.content = content;
    this.intro = "";
    this.outro = "";
    return this;
  }

  prependRight(content) {
    this.intro = content + this.intro;
  }

  split(index) {
    const sliceIndex = index - this.start;
    const originalBefore = this.original.slice(0, sliceIndex);
    const originalAfter = this.original.slice(sliceIndex);

    const newChunk = new Chunk(index, this.end, originalAfter);
    newChunk.outro = this.outro;

    this.original = originalBefore;
    this.outro = "";
    this.end = index;
    this.content = originalBefore;

    newChunk.next = this.next;
    this.next = newChunk;

    return newChunk;
  }

  toString() {
    return this.intro + this.content + this.outro;
  }
};

Object.setPrototypeOf(Chunk.prototype, null);

class MagicString {
  constructor(string) {
    const chunk = new Chunk(0, string.length, string);

    this.original = string;
    this.outro = "";
    this.intro = "";
    this.firstChunk = chunk;
    this.lastSearchedChunk = chunk;
    this.byStart = {};
    this.byEnd = {};

    this.byStart[0] = chunk;
    this.byEnd[string.length] = chunk;
  }

  appendLeft(index, content) {
    this._split(index);
    const chunk = this.byEnd[index];
    chunk.appendLeft(content);
    return this;
  }

  overwrite(start, end, content) {
    this._split(start);
    this._split(end);

    const first = this.byStart[start];
    const last = this.byEnd[end];

    first.edit(content);

    first.next = last.next;
    first.original = this.original.slice(start, end);
    first.end = end;

    return this;
  }

  prependRight(index, content) {
    this._split(index);
    const chunk = this.byStart[index];
    chunk.prependRight(content);
    return this;
  }

  _split(index) {
    if (this.byStart[index] || this.byEnd[index]) {
      return;
    }
    let chunk = this.lastSearchedChunk;
    const searchForward = index > chunk.end;

    while (true) {
      if (chunk.contains(index)) {
        this._splitChunk(chunk, index);
        return;
      }
      chunk = searchForward
        ? this.byStart[chunk.end]
        : this.byEnd[chunk.start];
    }
  }

  _splitChunk(chunk, index) {
    const newChunk = chunk.split(index);
    this.byEnd[index] = chunk;
    this.byStart[index] = newChunk;
    this.byEnd[newChunk.end] = newChunk;
    this.lastSearchedChunk = chunk;
  }

  toString() {
    let str = this.intro;
    let chunk = this.firstChunk;
    while (chunk) {
      str += chunk.toString();
      chunk = chunk.next;
    }
    return str + this.outro;
  }
};

Object.setPrototypeOf(MagicString.prototype, null);

module.exports = MagicString;

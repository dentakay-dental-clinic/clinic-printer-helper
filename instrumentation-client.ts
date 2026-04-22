if (!Array.prototype.at) {
  Object.defineProperty(Array.prototype, "at", {
    configurable: true,
    writable: true,
    value(index: number) {
      const length = this.length >>> 0;
      let relativeIndex = Math.trunc(index) || 0;
      if (relativeIndex < 0) {
        relativeIndex += length;
      }
      if (relativeIndex < 0 || relativeIndex >= length) {
        return undefined;
      }
      return this[relativeIndex];
    },
  });
}

module.exports = (...variants) => {
  function SumType() {}

  function Variant(name, args) {
    this._name = name;
    this._args = args;
  }

  Variant.prototype = Object.create(SumType.prototype);

  Variant.prototype.cases = function(opts) {
    if (opts[this._name]) return opts[this._name](...this._args);
    else if (opts._) return opts._();
    else throw new Error(`cases: missing case for "${this._name}"`);
  };

  variants.forEach(name => {
    SumType[name] = (...args) => new Variant(name, args);
  });

  return SumType;
};

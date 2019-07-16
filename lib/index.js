export default (...variants) => {
  // `SumType` is a "dummy constructor". We could use a simple object
  // literal here, but we want to be able to associate its prototype
  // with that of the `Variant` constructor defined below.
  function SumType() {}

  function Variant(name, args) {
    this._name = name;
    this._args = args;
  }

  // We want values defined on the prototype of `SumType` to be
  // accessible to values created by the `Variant` constructor.
  Variant.prototype = Object.create(SumType.prototype);

  Variant.prototype.cases = function(opts) {
    if (opts[this._name]) return opts[this._name](...this._args);
    else if (opts._) return opts._();
    else throw new Error(`cases: missing case for "${this._name}"`);
  };

  // Here we attach a number of "static methods" to `SumType` -- one
  // for each variant.
  variants.forEach(name => {
    SumType[name] = (...args) => new Variant(name, args);
  });

  return SumType;
};

# brief-cases
## A small utility for working with sum datatypes

Many datatypes, particularly those having inductive definitions, are conveniently represented as "sum types", also known as "discriminated unions" or "variant records".
Such datatypes describe values that might be of one or the other of several alternative types.
While it is not difficult to represent values of such types (using object literals with string tags, for instance), they are often cumbersome to use.

The purpose of this utility is to make using sum datatypes simple and elegant.
It is extremely easy to use, and not much harder to [understand in full](DOC.md).

### Usage
This utility is exposed as a single function.
For instance, one could `require` it as `createSumType`:

```javascript
const createSumType = require('brief-cases');
```

It is quite easy to use.
Suppose one wishes to define the classic `Maybe` datatype.
This is a simple matter of calling `createSumType` with the names of the desired variant constructors:

```javascript
const Maybe = createSumType('Nothing', 'Just');
```

The value `Maybe` has two "static methods" named `Nothing` and `Just` that can be used to construct values as follows:

```javascript
const justAThree = Maybe.Just('3');
const nothingAtAll = Maybe.Nothing();
const justAnObject = Maybe.Just({ test: 'value' });
```

To use these values, one can employ the `cases` method to call a function based on the name of the variant to which the value belongs:

```javascript
Maybe.Just(3).cases({
  Just   : value => `Just a ${value.toString()}`,
  Nothing: ()    => 'Nothing at all'
}); // => 'Just a 3'
```

More likely, one would use `cases` within a function, say, for "mapping" over values of type `Maybe`, or transforming such values to `String`s:

```javascript
const mapMaybe = (mVal, fn) => mVal.cases({
  Just: value => Maybe.Just(fn(value)),
  _   : ()    => Maybe.Nothing()
});

const showMaybe = mVal => mVal.cases({
  Just   : value => `Just (${value.toString()})`,
  Nothing: ()    => 'Nothing'
});

showMaybe(mapMaybe(Maybe.Just('test'), v => v.toUpperCase())); // => 'Just (TEST)'
```

Here we have also introduced a "catch-all" handler, associated with `_`.

In many cases, one would prefer to define functions like `mapMaybe` and `showMaybe` as methods, so that the above expression could be rendered more readably as:

```javascript
Maybe.Just('test').map(v => v.toUpperCase()).show(); // => 'Just (TEST)'
```

As it turns out, the variant constructors `Maybe.Nothing` and `Maybe.Just` have the same prototype as `Maybe` itself.
Thus, values assigned to `Maybe`'s prototype are available to values created by `Maybe.Nothing` and `Maybe.Just`.
Here is how one might create a more usable version of the `Maybe` datatype:

```javascript
const Maybe = createSumType('Nothing', 'Just');

// of : a -> Maybe a
Maybe.of = Maybe.Just;

// map : Maybe a ~> (a -> b) -> Maybe b
Maybe.prototype.map = function(f) {
  return this.cases({
    Just: v  => Maybe.of(f(v)),
    _   : () => this
  });
};

// chain : Maybe a ~> (a -> Maybe b) -> Maybe b
Maybe.prototype.chain = function(f) {
  return this.cases({
    Just: f,           // a point-free/eta equivalent of: v => f(v)
    _   : () => this
  });
};

// toString : Maybe a ~> String
Maybe.prototype.toString = function() {
  return this.cases({
    Just   : v  => `Just (${v.toString()})`,
    Nothing: () => 'Nothing'
  });
};
```

These methods are then available on values created by the variant constructors `Maybe.Nothing` and `Maybe.Just`:

```javascript
const div = d => n => d === 0 ? Maybe.Nothing() : Maybe.of(n / d);

const square = n => n * n;

Maybe.of(12)
     .chain(div(3))
     .map(square)
     .toString(); // => 'Just (16)'

Maybe.of(7)
     .chain(div(0))
     .map(square)
     .toString(); // => 'Nothing'
```

### Another Example
As another example, consider how one might represent expressions in the *lambda calculus*.
The possible expressions are `Name`s, consisting of a `String`, `Abs`tractions, consisting of an identifier of type `String` along with a "body" that is itself a lambda calculus expression, and `App`lications, consisting of two lambda calculus expressions.

We can construct the `Expr`ession type as follows:

```javascript
const Expr = createSumType('Name', 'Abs', 'App');
```

Individual expressions are now a cinch to create:

```javascript
const { Name, Abs, App } = Expr;

// id = \x . x
const id = Abs('x', Name('x'));

// konst = \x . \y . x
const konst = Abs('x', Abs('y', Name('x')));

// subst = \x . \y . \z . ((x z) (y z))
const subst =
Abs('x',
  Abs('y',
    Abs('z',
      App(App(Name('x'), Name('z')), App(Name('y'), Name('z')))
    )
  )
);
```

Additionally, as above, we can define methods that are available on all values created by any of the variant constructors:

```javascript
Expr.prototype.toString = function() {
  return this.cases({
    Name: name          => name,
    Abs : (id, body)    => `(lambda (${id}) ${body.toString()})`,
    App : (rator, rand) => `(${rator.toString()} ${rand.toString()})`
  });
};

id.toString();
// => '(lambda (x) x)'

konst.toString();
// => '(lambda (x) (lambda (y) x))'

subst.toString();
// => '(lambda (x) (lambda (y) (lambda (z) ((x z) (y z)))))'
```

### Details
In general, to create a sum datatype having variants named `<v1>`, `<v2>`, ..., `<vn>` (where the `<vi>`'s are `String`s), one should evaluate `createSumType(<v1>, <v2>, ..., <vn>)`.
This produces an object with "static methods" named `<v1>`, `<v2>`, ..., `<vn>`.
These are the "variant constructors" and are used to create values belonging to a certain variant.
Each of these static methods takes any number of arguments (that is, it is the caller's responsibility to ensure that these methods are called with the proper arguments).
Any value produced by these variant constructors has a `cases` method.

This `cases` method should be called with an object having a function associated with each variant name, and/or a function associated with the catch-all method `_`.
The function associated with the name of the variant to which the value belongs will be called with the original arguments used to construct the value.
If no function has been provided for the variant in question and no "catch-all" function has been provided, then an error will be thrown indicating a non-exhaustive use of the `cases` method.

Lastly, any properties added to the object created by calling `createSumType(<v1>, <v2>, ..., <vn>)` (including its `prototype`) will be available to values created by the variant constructors themselves.
This makes it very convenient to define methods shared by all variants of a particular type.

For more information, see the [documentation](DOC.md) of the [source code](lib/index.js).

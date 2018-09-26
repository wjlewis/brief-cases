# Understanding this utility

Our aim is to be able to represent "sum datatypes", that is, sets of values where each value consists of some information and a "tag" indicating that it belongs to a certain variation of the datatype.
As an example, consider the challenge of representing binary trees: we must be able to represent both *leaves* and *interior nodes* (which consist of a label of type `String` along with a left and right child, each of which is itself a binary tree).

Our first approach might be to use object literals with a property for each datum we are interested in and a `varType` property indicating to which variant type (i.e. either `Leaf` or `InteriorNode`) the value belongs. For instance, using this strategy we represent a leaf as:

```javascript
const leaf = { varType: 'Leaf' };
```

We can also represent the tree

```
    'first'
     /   \
    /     \
'second'   *
  /  \
 *    *
```

as:

```javascript
const tree = {
  varType: 'InteriorNode',
  label: 'first',
  leftChild: {
    varType: 'InteriorNode',
    label: 'second',
    leftChild: { varType: 'Leaf' },
    rightChild: { varType: 'Leaf' }
  },
  rightChild: {
    varType: 'Leaf'
  }
};
```

While these are cumbersome to write by hand, we can easily write two functions to spare us the toil:

```javascript
const Leaf = () => ({ varType: 'Leaf' });

const InteriorNode = (label, leftChild, rightChild) => ({
  varType: 'InteriorNode',
  label,
  leftChild,
  rightChild
});
```

Now our previous trees are quite easily described by:

```javascript
const leaf = Leaf();

const tree =
  InteriorNode('first', InteriorNode('second', Leaf(), Leaf()), Leaf());
```

However, we still have not skirted the main source of difficulty here, which is *working* with these values once they have been created.
For instance, if we wish to transform a tree to a `String` representation, we are forced to deal explicitly with the names of the tag and data properties:

```javascript
const treeToString = tree => {
  if (tree.varType === 'Leaf') {
    return 'Leaf';
  } else if (tree.varType === 'InteriorNode') {
    return `(${tree.label} ${treeToString(tree.leftChild)} ${treeToString(tree.rightChild)})`;
  } else {
    throw new Error(`unrecognized variant type: "${tree.varType}"`);
  }
};
```

Furthermore, if we wish to define methods that are available to *both* variants, we must create two separate definitions for each method: one for the `Leaf` constructor, and the other for the `InteriorNode` constructor.
Obviously, these methods will contain different content, but we must be careful not to accidentally define a method for one but not the other.
For instance, we can reincarnate `treeToString` as a method by redefining our constructors:

```javascript
const Leaf = () => ({
  varType: 'Leaf',
  toString: () => 'Leaf'
});

const InteriorNode = (label, leftChild, rightChild) => ({
  varType: 'InteriorNode',
  label,
  leftChild,
  rightChild,
  toString: () => `(${label} ${leftChild.toString()} ${rightChild.toString()})`
});
```

This is a definite improvement, but the original problems remain.
In short, we would like to create a utility that would allow us to
1. Easily define sum datatypes
2. Easily act on values based on the variant to which they belong
3. Easily add methods shared by all variants

We quickly engage in some wishful thinking: it would be great to (somehow) be able to work with values in the following way:

```javascript
const tree =
  InteriorNode('first', InteriorNode('second', Leaf(), Leaf()), Leaf());

const treeToString = tree => tree.cases({
  Leaf        : ()            => 'Leaf',
  InteriorNode: (label, l, r) => `(${label} ${treeToString(l)} ${treeToString(r)})`
});
```

That is, we wouldn't need to know the names of any keys with which data is associated (such as `'label'` or `'leftChild'`), just the order in which this data is expected.
Our first move is to rewrite the `Leaf` and `InteriorNode` constructors to include such a method:

```javascript
const Leaf = () => ({
  cases: opts => {
    if (opts.Leaf) return opts.Leaf();
    else throw new Error('cases: missing case for "Leaf"');
  }
});

const InteriorNode = (label, leftChild, rightChild) => ({
  cases: opts => {
    if (opts.InteriorNode) return opts.InteriorNode(label, leftChild, rightChild);
    else throw new Error('cases: missing case for "InteriorNode"');
  }
});
```

Values created using these two constructors now behave exactly as we envisioned!
The `cases` method simply accepts an `opts` ("options") object, consisting of a number of keys paired with functions.
If, in the case of the `Leaf` constructor, this `opts` object contains a function associated with a `Leaf` key, the `cases` method will return the value produced by this function called with no arguments.
This behavior is nearly identical in the case of the `InteriorNode` constructor, except that a function associated with a key called `InteriorNode` is expected, and this function is called with the input data (`label`, `leftChild`, `rightChild`).
Notice that in both cases, if no function has been associated with the required key, an `Error` is thrown.

We note several similarities between the two `cases` methods: they both take the same type of argument, they both check for a method with a certain name, and, if found, call it with the arguments that were provided to the function in which they reside, and they both throw an `Error` if the `opts` object doesn't contain a suitable function.
We can extract this shared functionality as follows:

```javascript
const Variant = (name, args) => ({
  cases: opts => {
    if (opts[name]) return opts[name](...args);
    else throw new Error(`cases: missing case for "${name}"`);
  }
});

const Leaf = () => Variant('Leaf', []);

const InteriorNode = (label, leftChild, rightChild) => (
  Variant('InteriorNode', [label, leftChild, rightChild])
);
```

We can make a few more improvements at this time as well.
For instance, instead of creating a new `cases` method each time we call the `Variant` function, we can define it on the prototype of a JavaScript "constructor function", as in:

```javascript
function Variant(name, args) {
  this._name = name;
  this._args = args;
}
Variant.prototype.cases = function(opts) {
  if (opts[this._name]) return opts[this._name](...this._args);
  else throw new Error(`cases: missing case for "${this._name}"`);
};
```

We can also add a "catch-all" key for convenience, so that if we don't wish to supply a function for every possible variant, we can supply one as a "catch-all handler" and avoid the `Error`.
This catch-all function will only be called in the event that a function associated with the variant's name was not supplied in the `opts` argument to the `cases` method.
This is trivial to incorporate:

```javascript
function Variant(name, args) {
  this._name = name;
  this._args = args;
}
Variant.prototype.cases = function(opts) {
  if (opts[this._name]) return opts[this._name](...this._args);
  else if (opts._) return opts._();  // *** "catch-all"
  else throw new Error(`cases: missing case for "${this._name}"`);
};
```

Now, in addition to providing a function for each variant type, one can associate a function with `_`, and it will be called in the event that no function has been associated with the name of the variant of the value in question.

As a small improvement, we can also avoid the need to define the functions `Leaf` and `InteriorNode` by hand.
Instead, we can simply provide their names and have them generated on-the-fly.
For example:

```javascript
const createSumType = (...variants) => variants.reduce((result, name) => ({
  ...result,
  [name]: (...args) => new Variant(name, args)
}), {});

// Now, we simply provide the desired constructor names to 'createSumType':
const BinTree = createSumType('Leaf', 'InteriorNode');

const leaf = BinTree.Leaf();

const tree =
  BinTree.InteriorNode('first',
    BinTree.InteriorNode('second', BinTree.Leaf(), BinTree.Leaf()),
    BinTree.Leaf()
  );
```

We have now achieved two of our three objectives: it is now incredibly easy to create sum datatypes (we simply call `createSumType` with the names of the desired constructor functions), and values created using the utility are very easy to work with, thanks to the `cases` method that we have built in to each value.
Achieving the third goal requires a bit of trickery.

Continuing with the example above, we would like to be able to add properties to `BinTree`'s `prototype`, and have them made available to all values created by `BinTree.Leaf` and `BinTree.InteriorNode`.
However, at the moment we have two problems: first, `createSumType` produces a (non-function) object, and thus it does not have a `prototype` property, and second, the values created by the constructor functions (e.g. `BinTree.InteriorNode`) have `Variant.prototype` as their `prototype` (we certainly don't want to affect `Variant.prototype`, since we only want methods to be available to variants that are part of the same datatype).
To solve the first problem, we can create a "dummy" constructor function within `createSumType` and return this instead.
We will add the constructor functions as "static methods" to this function:

```javascript
const createSumType = (...variants) => {
  function SumType() {}

  variants.forEach(name => {
    SumType[name] = (...args) => new Variant(name, args);
  });

  return SumType;
}
```

We have now solved the first problem: since `createSumType` now returns a *function* (`SumType`), the value of say `BinTree.prototype` is no longer `undefined`.
We can freely add and remove values to it, just as we desired.
To solve the final problem, we simply need to ensure that `SumType.prototype` is somewhere along the prototype chain for instances of `Variant`.
This is quite easy to do, provided we include the definition of `Variant` within the definition of `createSumType`:

```javascript
const createSumType = (...variants) => {
  function SumType() {}

  function Variant(name, args) {
    this._name = name;
    this._args = args;
  }

  // All values defined on 'SumType.prototype' will be available to
  // instances of 'Variant':
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
```

It is now straightforward to add methods, such as our `toString` method, to all variants of a particular sum datatype:

```javascript
const BinTree = createSumType('Leaf', 'InteriorNode');

BinTree.prototype.toString = function() {
  return this.cases({
    Leaf        : ()            => 'Leaf',
    InteriorNode: (label, l, r) => `(${label} ${l.toString()} ${r.toString()})`
  });
};

const tree =
  BinTree.InteriorNode('first',
    BinTree.InteriorNode('second', BinTree.Leaf(), BinTree.Leaf()),
    BinTree.Leaf()
  );

tree.toString(); // => '(first (second Leaf Leaf) Leaf)'
```

And that, in short, is all there is to this utility.

import createSumType from '../lib/index';

const Tree = createSumType('Leaf', 'Inner');

test('`createSumType` creates the appropriate variant constructors', () => {
  expect(Tree.Leaf).toBeInstanceOf(Function);
  expect(Tree.Inner).toBeInstanceOf(Function);
});

test('values created with variant constructors have a `cases` method', () => {
  const t1 = Tree.Leaf(3);
  const t2 = Tree.Inner('root', Tree.Leaf(0), Tree.Leaf(4));
  expect(t1.cases).toBeInstanceOf(Function);
  expect(t2.cases).toBeInstanceOf(Function);
});

test('the `cases` method calls the function associated with the appropriate variant', () => {
  const t1 = Tree.Leaf(3);
  expect(t1.cases({
    Leaf: label => label * label,
    Inner: (name, left, right) => name.toUpperCase(),
  })).toBe(9);

  const t2 = Tree.Inner('root', Tree.Leaf(0), Tree.Leaf(4));
  expect(t2.cases({
    Leaf: label => label * label,
    Inner: (name, left, right) => name.toUpperCase(),
  })).toBe('ROOT');
});

test('the `cases` method throws an error if no appropriate function is provided', () => {
  const t1 = Tree.Leaf(3);
  expect(t1.cases.bind(t1, {
    Inner: (name, left, right) => name.toUpperCase(),
  })).toThrow();
});

test('the catch-all (_) handler is called if no appropriate function is provided', () => {
  const t1 = Tree.Inner('root', Tree.Leaf(0), Tree.Leaf(4));
  expect(t1.cases({
    Leaf: label => label * label,
    _: () => 'called',
  })).toBe('called');
});

Tree.prototype.mapLeaf = function(fn) {
  return this.cases({
    Leaf: l => Tree.Leaf(fn(l)),
    Inner: (n, l, r) => Tree.Inner(n, l.mapLeaf(fn), r.mapLeaf(fn)),
  });
};

test('values added to the type\'s prototype are available on values created by the variant constructors', () => {
  const t1 = Tree.Inner('root', Tree.Leaf(0), Tree.Leaf(4));
  const res = Tree.Inner('root', Tree.Leaf(0), Tree.Leaf(8));
  expect(t1.mapLeaf(x => x * 2)).toEqual(res);
});

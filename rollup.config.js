import babel from 'rollup-plugin-babel';
import { uglify } from 'rollup-plugin-uglify';

module.exports = [{
  input: 'src/index.js',
  output: {
    file: 'dist/bundle.umd.js',
    format: 'umd',
    name: 'brief-cases',
  },
  plugins: [
    babel({
      exclude: 'node_modules/**',
    }),
    uglify(),
  ],
}, {
  input: 'src/index.js',
  output: {
    file: 'dist/bundle.cjs.js',
    format: 'cjs',
  },
}];

import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

const inputs = ['js-capitalise.ts', 'js-test.ts']

const config = [];
inputs.forEach((x) => {
  config.push({
    input: 'src/' + x,
    output: {
      dir: 'lib',
      format: 'iife',
      name: 'Module',
      sourcemap: false
    },
    plugins: [typescript(), nodeResolve()]
  });
});

export default config;

import typescript from '@rollup/plugin-typescript'
import pkg from './package.json'

/** @type {import('rollup').RollupOptions} */
const config = {
  input: 'src/index.ts',
  output: [
    { file: pkg.main, format: 'cjs', sourcemap: false, exports: 'auto' },
    { file: pkg.module, format: 'es', sourcemap: false },
  ],
  plugins: [
    /**
     * @type {import('@rollup/plugin-typescript').RollupTypescriptOptions}
     */
    typescript({
      outputToFilesystem: true,
      sourceMap: false,
      tsconfig: './tsconfig.json',
    }),
  ],
  external: Object.keys(pkg.dependencies),
}

export default config

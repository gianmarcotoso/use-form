import typescript from '@rollup/plugin-typescript'
import multiInput from 'rollup-plugin-multi-input'

export default {
	input: ['src/*.ts'],
	output: {
		dir: './dist',
		entryFileNames: '[name].js',
		format: 'es',
	},
	external: ['react', 'ramda', 'immer'],
	plugins: [multiInput(), typescript()],
}

import { value } from '../src/value.function'

describe('value function', () => {
	it('returns the passed value', () => {
		const result = value(1)

		expect(result).toBe(1)
	})

	it('returns an empty string when the value is undefined', () => {
		const result = value(undefined)

		expect(result).toBe('')
	})
})

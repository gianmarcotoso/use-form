import { act, renderHook } from '@testing-library/react-hooks'
import { ChangeEvent } from 'react'

import { DeepPartial, useForm, useFormList, useNestedForm } from '../src/use-form.hook'

type TestFormStateTodo = {
	completed?: string
	name: string
	id: number
}

type TestFormState = {
	foo: string
	baz: string
	num: number
	flag: boolean
	nest: {
		some: string
		tags: string[]
		todos?: TestFormStateTodo[]
	}
	todos: TestFormStateTodo[]
}

describe('use-form.hook', () => {
	it('initializes an empty state', () => {
		const { result } = renderHook(() => useForm<TestFormState>({}))

		expect(result.current[0]).toEqual({})
	})

	it('initializes an empty state even when no initial value is provided', () => {
		const { result } = renderHook(() => useForm<TestFormState>())

		expect(result.current[0]).toEqual({})
	})

	it('empties the state to a null value when null is passed to the setter function with the replace flag set to true', () => {
		const { result } = renderHook(() => useForm<TestFormState>({}))
		const [, setData] = result.current

		act(() => {
			setData(null, true)
		})

		expect(result.current[0]).toEqual(null)
	})

	it('does nothing when the setter function is called with null and the replace flag is set to false', () => {
		const { result } = renderHook(() => useForm<TestFormState>())

		act(() => {
			;(result.current[1] as any)(null)
		})

		expect(result.current[0]).toEqual({})
	})

	it('updates the state when the setter function is called with a delta object', () => {
		const { result } = renderHook(() => useForm<TestFormState>({}))
		const [, setData] = result.current

		act(() => setData({ foo: 'bar' }))

		expect(result.current[0]).toEqual({ foo: 'bar' })
	})

	it('updates a specific property when the setter function is called with a key and a new value for that key', () => {
		const { result } = renderHook(() => useForm<TestFormState>({}))
		const [, setData] = result.current

		act(() => setData('foo', 'bar'))

		expect(result.current[0]).toEqual({ foo: 'bar' })
	})

	it('updates a specific property when the setter function is called with an event', () => {
		const { result } = renderHook(() => useForm<TestFormState>({}))
		const [, setData] = result.current

		act(() =>
			setData({
				nativeEvent: new Event('input'),
				target: {
					name: 'foo',
					value: 'bar',
				},
			} as ChangeEvent<HTMLInputElement>),
		)

		expect(result.current[0]).toEqual({ foo: 'bar' })
	})

	it('updates a specific property when the setter function is called with an event from a checkbox', () => {
		const { result } = renderHook(() => useForm<TestFormState>({}))
		const [, setData] = result.current

		act(() =>
			setData({
				nativeEvent: new Event('input'),
				target: {
					name: 'flag',
					checked: true,
					type: 'checkbox',
				},
			} as ChangeEvent<HTMLInputElement>),
		)

		expect(result.current[0]).toEqual({ flag: true })
	})

	it('replaces the state when the setter function is called with a new state and the second parameter set to true', () => {
		const { result } = renderHook(() =>
			useForm<TestFormState>({
				foo: 'baz',
			}),
		)
		const [, setData] = result.current

		act(() => setData({ foo: 'bar' }, true))

		expect(result.current[0]).toEqual({ foo: 'bar' })
	})

	it('applies the middleware function passed to as the second parameter of the hook', () => {
		const middleware = (data: DeepPartial<TestFormState>) => {
			data.baz = 'qux'

			return data
		}
		const { result } = renderHook(() => useForm<TestFormState>({}, middleware))

		expect(result.current[0].baz).toBe('qux')
	})

	it('applies the middleware on every update', () => {
		const middleware = (data: DeepPartial<TestFormState>) => {
			data.baz = 'qux'
			data.num! += 1

			return data
		}
		const { result } = renderHook(() => useForm<TestFormState>({ num: 0 }, middleware))

		act(() => {
			result.current[1]({ foo: 'bar' })
			result.current[1]({ baz: 'lol' })
		})

		expect(result.current[0].baz).toBe('qux')
		expect(result.current[0].num).toBe(3)
	})

	it('updates the value of a nested record when its key is passed using dot notation', () => {
		const { result } = renderHook(() => useForm<TestFormState>({}))
		const [, setData] = result.current

		act(() => setData('nest.some', 'foo'))

		expect(result.current[0].nest).toEqual({ some: 'foo' })
	})

	it('allows to focus on a nested object using the useNestedForm hook', () => {
		function useNestedFormHookTest() {
			const [data, setData] = useForm<TestFormState>({})
			const [nestedData, setNestedData] = useNestedForm([data, setData], 'nest')

			return { data, nestedData, setData, setNestedData }
		}

		const { result } = renderHook(() => useNestedFormHookTest())

		act(() => result.current.setNestedData('some', 'foo'))

		expect(result.current.nestedData).toEqual({ some: 'foo' })
		expect(result.current.data).toEqual({ nest: { some: 'foo' } })
		expect(result.current.data.nest).toBe(result.current.nestedData)
	})

	it('allows to focus on an array using the useFormList hook', () => {
		function useFormListHookTest() {
			const [data, setData] = useForm<TestFormState>({
				todos: [],
			})
			const [todos, todosHandlers] = useFormList([data, setData], 'todos', (i) => i.id)

			return { data, todos, setData, todosHandlers }
		}

		const { result } = renderHook(() => useFormListHookTest())

		expect(result.current.todos).toHaveLength(0)
		expect(result.current.todos).toBe(result.current.data.todos)
	})

	it('allows to focus on an array even when the array has not yet been initialized', () => {
		function useFormListHookTest() {
			const [data, setData] = useForm<TestFormState>({})
			const [todos, todosHandlers] = useFormList([data, setData], 'todos', (i) => i.id)

			return { data, todos, setData, todosHandlers }
		}

		const { result } = renderHook(() => useFormListHookTest())

		expect(result.current.todos).toHaveLength(0)
		expect(result.current.data.todos).toBeUndefined()
	})

	it('allows to add an item on a focused array', () => {
		function useFormListHookTest() {
			const [data, setData] = useForm<TestFormState>({
				todos: [],
			})
			const [todos, todosHandlers] = useFormList([data, setData], 'todos', (i) => i.id)

			return { data, todos, setData, todosHandlers }
		}

		const { result } = renderHook(() => useFormListHookTest())

		act(() => result.current.todosHandlers.onAdd({ id: 1, name: 'foo' }))

		expect(result.current.todos).toHaveLength(1)
		expect(result.current.todos[0]).toEqual({ id: 1, name: 'foo' })
	})

	it('allows to edit an item on a focused array', () => {
		function useFormListHookTest() {
			const [data, setData] = useForm<TestFormState>({
				todos: [
					{ id: 1, name: 'foo' },
					{ id: 2, name: 'bar' },
				],
			})
			const [todos, todosHandlers] = useFormList([data, setData], 'todos', (i) => i.id)

			return { data, todos, setData, todosHandlers }
		}

		const { result } = renderHook(() => useFormListHookTest())

		act(() => result.current.todosHandlers.onEdit(result.current.todos[0], { id: 1, name: 'bar' }))

		expect(result.current.todos).toHaveLength(2)
		expect(result.current.todos[0]).toEqual({ id: 1, name: 'bar' })
	})

	it('allows to remove an item on a focused array', () => {
		function useFormListHookTest() {
			const [data, setData] = useForm<TestFormState>({
				todos: [{ id: 1, name: 'foo' }],
			})
			const [todos, todosHandlers] = useFormList([data, setData], 'todos', (i) => i.id)

			return { data, todos, setData, todosHandlers }
		}

		const { result } = renderHook(() => useFormListHookTest())

		act(() => result.current.todosHandlers.onRemove(result.current.todos[0]))

		expect(result.current.todos).toHaveLength(0)
	})

	it('allows to focus on a nested array by calling useFormList and providing a path using dot notation', () => {
		function useFormListHookTest() {
			const [data, setData] = useForm<TestFormState>({
				nest: {
					tags: [],
				},
			})
			const [tags, tagsHandlers] = useFormList([data, setData], 'nest.tags', (i) => i)

			return { data, tags, setData, tagsHandlers }
		}

		const { result } = renderHook(() => useFormListHookTest())

		expect(result.current.tags).toHaveLength(0)
		expect(result.current.tags).toBe(result.current.data.nest?.tags)
	})

	it('allows to add a value to a focused nested array', () => {
		function useFormListHookTest() {
			const [data, setData] = useForm<TestFormState>({
				nest: {
					tags: [],
				},
			})
			const [tags, tagsHandlers] = useFormList([data, setData], 'nest.tags', (i) => i)

			return { data, tags, setData, tagsHandlers }
		}

		const { result } = renderHook(() => useFormListHookTest())

		act(() => result.current.tagsHandlers.onAdd('foo'))

		expect(result.current.tags).toHaveLength(1)
		expect(result.current.tags[0]).toEqual('foo')
	})

	it('allows to edit a value on a focused nested array of strings', () => {
		function useFormListHookTest() {
			const [data, setData] = useForm<TestFormState>({
				nest: {
					tags: ['hello', 'world'],
				},
			})
			const [tags, tagsHandlers] = useFormList([data, setData], 'nest.tags', (i) => i)

			return { data, tags, setData, tagsHandlers }
		}

		const { result } = renderHook(() => useFormListHookTest())

		act(() => result.current.tagsHandlers.onEdit(result.current.tags[0], 'zaz'))

		expect(result.current.tags).toHaveLength(2)
		expect(result.current.tags[0]).toBe('zaz')
	})

	it('allows to edit a value on a focused nested array of objects', () => {
		function useFormListHookTest() {
			const [data, setData] = useForm<TestFormState>({
				nest: {
					todos: [{ id: Math.random(), name: 'foo' }],
				},
			})
			const [todos, todosHandlers] = useFormList([data, setData], 'nest.todos', (i) => i.id)

			return { data, todos, setData, todosHandlers }
		}

		const { result } = renderHook(() => useFormListHookTest())

		act(() => result.current.todosHandlers.onEdit(result.current.todos[0], { name: 'bar' }))

		expect(result.current.todos).toHaveLength(1)
		expect(result.current.todos[0]).toHaveProperty('name', 'bar')
	})

	it('allows to replace a value on a focused nested array of objects', () => {
		function useFormListHookTest() {
			const [data, setData] = useForm<TestFormState>({
				nest: {
					todos: [{ id: Math.random(), name: 'foo' }],
				},
			})
			const [todos, todosHandlers] = useFormList([data, setData], 'nest.todos', (i) => i.id)

			return { data, todos, setData, todosHandlers }
		}

		const { result } = renderHook(() => useFormListHookTest())

		act(() => result.current.todosHandlers.onEdit(result.current.todos[0], { id: 42 }, true))

		expect(result.current.todos).toHaveLength(1)
		expect(result.current.todos[0]).not.toHaveProperty('name')
		expect(result.current.todos[0]).toHaveProperty('id', 42)
	})

	it('does nothing when attempting to edit a non existing item', () => {
		function useFormListHookTest() {
			const [data, setData] = useForm<TestFormState>({
				nest: {
					todos: [{ id: Math.random(), name: 'foo' }],
				},
			})
			const [todos, todosHandlers] = useFormList([data, setData], 'nest.todos', (i) => i.id)

			return { data, todos, setData, todosHandlers }
		}

		const { result } = renderHook(() => useFormListHookTest())

		act(() => result.current.todosHandlers.onEdit({ id: 12, name: 'baz' }, { name: 'bar' }))

		expect(result.current.todos).toHaveLength(1)
		expect(result.current.todos[0]).toHaveProperty('name', 'foo')
	})

	it('allows to remove a value on a focused nested array of strings', () => {
		function useFormListHookTest() {
			const [data, setData] = useForm<TestFormState>({
				nest: {
					tags: ['foo'],
				},
			})
			const [tags, tagsHandlers] = useFormList([data, setData], 'nest.tags', (i) => i)

			return { data, tags, setData, tagsHandlers }
		}

		const { result } = renderHook(() => useFormListHookTest())

		act(() => result.current.tagsHandlers.onRemove(result.current.tags[0]))

		expect(result.current.tags).toHaveLength(0)
	})

	it('allows to remove a value on a focused nested array of objects', () => {
		function useFormListHookTest() {
			const [data, setData] = useForm<TestFormState>({
				nest: {
					todos: [{ id: Math.random(), name: 'foo' }],
				},
			})
			const [todos, todosHandlers] = useFormList([data, setData], 'nest.todos', (i) => i.id)

			return { data, todos, setData, todosHandlers }
		}

		const { result } = renderHook(() => useFormListHookTest())

		act(() => result.current.todosHandlers.onRemove(result.current.todos[0]))

		expect(result.current.todos).toHaveLength(0)
	})

	it('does nothing when attempting to remove a non-existing item', () => {
		function useFormListHookTest() {
			const [data, setData] = useForm<TestFormState>({
				nest: {
					todos: [{ id: Math.random(), name: 'foo' }],
				},
			})
			const [todos, todosHandlers] = useFormList([data, setData], 'nest.todos', (i) => i.id)

			return { data, todos, setData, todosHandlers }
		}

		const { result } = renderHook(() => useFormListHookTest())

		act(() => result.current.todosHandlers.onRemove({ id: 0, name: 'baz' }))

		expect(result.current.todos).toHaveLength(1)
	})

	it('should not mutate nested objects within the source object when replacing the state', () => {
		function useFormListHookTest() {
			const [data, setData] = useForm<TestFormState>({})

			return { data, setData }
		}

		const originalObject: Partial<TestFormState> = {
			nest: {
				some: 'billy',
				tags: ['foo'],
			},
		}

		const { result } = renderHook(() => useFormListHookTest())

		act(() => result.current.setData(originalObject, true))
		act(() => result.current.setData('nest.some', 'hello'))

		expect(result.current.data.nest.some).toEqual('hello')
		expect(originalObject.nest!.some).toEqual('billy')
	})
})

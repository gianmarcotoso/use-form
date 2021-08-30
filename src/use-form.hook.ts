import { identity, lensPath, mergeDeepLeft, path, set } from 'ramda'
import { ChangeEvent, useCallback, useMemo, useState } from 'react'

export type DeepPartial<T> = {
	[P in keyof T]?: DeepPartial<T[P]>
}
export type ArrayItem<R> = R extends Array<infer Q> ? Q : never

// Hats off to https://twitter.com/diegohaz/status/1309644466219819008
export type PathImpl<T, K extends keyof T> = K extends string
	? T[K] extends Record<string, any>
		? T[K] extends ArrayLike<any>
			? K | `${K}.${PathImpl<T[K], Exclude<keyof T[K], keyof any[]>>}`
			: K | `${K}.${PathImpl<T[K], keyof T[K]>}`
		: K
	: never
export type Path<T> = PathImpl<T, keyof T> | keyof T
export type PathValue<T, P extends Path<T>> = P extends `${infer K}.${infer Rest}`
	? K extends keyof T
		? Rest extends Path<T[K]>
			? PathValue<T[K], Rest>
			: never
		: never
	: P extends keyof T
	? T[P]
	: never

export type MiddlewareFunction<T> = (data: DeepPartial<T>) => DeepPartial<T>
export type HandleUpdateFunction<T> = (delta: DeepPartial<T>, replace?: boolean) => void

export type HandleChangeFunction<T> = {
	(event: ChangeEvent): void
	(delta: DeepPartial<T>, replace?: boolean): void
	(path: Path<T>, value: DeepPartial<PathValue<T, Path<T>>>, replace?: boolean): void
}

export type Form<T> = [DeepPartial<T>, HandleChangeFunction<T>]

function UpdateOnPathAndValue<T>(handleUpdate: HandleUpdateFunction<T>, key: string, value: any, replace?: boolean) {
	const splittedKey = key.split('.')
	const pathLens = lensPath(splittedKey)

	let nextData = set(pathLens, value, {})

	handleUpdate(nextData, replace)
}

function UpdateOnEvent<T>(handleUpdate: HandleUpdateFunction<T>, event: ChangeEvent) {
	const target = event.currentTarget as HTMLInputElement
	const value = target.type === 'checkbox' ? target.checked : target.value

	UpdateOnPathAndValue(handleUpdate, target.name, value)
}

function Update<T>(
	handleUpdate: HandleUpdateFunction<T>,
	eventOrDeltaOrPath: any,
	replaceOrValue?: any,
	replace?: boolean,
) {
	if (!eventOrDeltaOrPath) {
		return
	}

	const event = eventOrDeltaOrPath as ChangeEvent
	if (event.nativeEvent instanceof Event) {
		UpdateOnEvent(handleUpdate, event)

		return
	}

	if (typeof eventOrDeltaOrPath === 'string' && typeof replaceOrValue !== 'undefined') {
		UpdateOnPathAndValue(handleUpdate, eventOrDeltaOrPath, replaceOrValue, replace)

		return
	}

	handleUpdate(eventOrDeltaOrPath, replaceOrValue)
}

export function useForm<T>(initialValue: DeepPartial<T> = {}, middlewareFn: MiddlewareFunction<T> = identity): Form<T> {
	const [data, setData] = useState<DeepPartial<T>>(middlewareFn(initialValue))

	const handleUpdate = useCallback((delta: DeepPartial<T>, replace?: boolean) => {
		setData((data) => {
			if (replace) {
				return middlewareFn(delta)
			}

			let nextData = mergeDeepLeft(delta, data) as DeepPartial<T>
			nextData = middlewareFn(nextData)

			return nextData
		})
	}, [])

	const handleChange = useCallback(
		function handleChange(eventOrDeltaOrPath: any, replaceOrValue?: any, replace?: boolean) {
			Update(handleUpdate, eventOrDeltaOrPath, replaceOrValue, replace)
		},
		[data, handleUpdate],
	)

	return [data, handleChange]
}

export function useNestedForm<T, K extends Path<T>, N extends PathValue<T, K>>(
	form: Form<T>,
	key: K,
): [DeepPartial<N>, HandleChangeFunction<N>] {
	const [data, onChange] = form
	const currentValue: DeepPartial<N> = useMemo(() => {
		return path((key as string).split('.'), data) ?? {}
	}, [data])

	const handleUpdate = useCallback(
		(delta: DeepPartial<N>, replace?: boolean) => {
			onChange(key, delta, replace)
		},
		[onChange],
	)

	const handleChange = useCallback(
		function handleChange(eventOrDeltaOrPath: any, replaceOrValue?: any, replace?: boolean) {
			Update(handleUpdate, eventOrDeltaOrPath, replaceOrValue, replace)
		},
		[currentValue, handleUpdate],
	)

	return [currentValue, handleChange]
}

export type HandleAddItemFunction<I> = (item: DeepPartial<I>) => void
export type HandleRemoveItemFunction<I> = (item: I) => void
export type HandleUpdateItemFunction<I> = (item: I, delta: DeepPartial<I>, replace?: boolean) => void
export type HandleChangeItemFunction<I> = {
	(item: I, event: ChangeEvent): void
	(item: I, delta: DeepPartial<I>, replace?: boolean): void
	(item: I, path: Path<I>, value: DeepPartial<PathValue<I, Path<I>>>, replace?: boolean): void
}
export type ArrayForm<I> = [
	Array<I>,
	{ onAdd: HandleAddItemFunction<I>; onEdit: HandleChangeItemFunction<I>; onRemove: HandleRemoveItemFunction<I> },
]

export function useFormList<T, K extends Path<T>, Q extends PathValue<T, K>, I extends ArrayItem<Q>>(
	form: Form<T>,
	key: K,
	identifier: (item: I) => any,
): ArrayForm<I> {
	const [data, onChange] = form
	const currentValue: I[] = useMemo(() => {
		return path((key as string).split('.'), data) ?? []
	}, [data, key])

	function handleAddItem(item: DeepPartial<I>) {
		const updatedArray = [...currentValue, item]

		onChange(key, updatedArray)
	}

	function handleRemoveItem(item: I) {
		const updatedArray = currentValue.filter((i) => identifier(i) !== identifier(item))

		onChange(key, updatedArray)
	}

	function handleUpdateItem(item: I, delta: DeepPartial<I>, replace?: boolean) {
		const updatedArray = currentValue.map((i) => {
			if (identifier(i) === identifier(item)) {
				if (typeof i === 'object' && !replace) {
					return mergeDeepLeft(delta, i)
				}

				return delta
			}

			return i
		})

		onChange(key, updatedArray)
	}

	function handleChange(item: I, eventOrDeltaOrPath: any, replaceOrValue?: any, replace?: boolean) {
		Update(handleUpdateItem.bind(undefined, item), eventOrDeltaOrPath, replaceOrValue, replace)
	}

	return [currentValue, { onAdd: handleAddItem, onEdit: handleChange, onRemove: handleRemoveItem }]
}

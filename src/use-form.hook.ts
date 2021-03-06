import produce, { Draft } from 'immer'
import { identity, lensPath, mergeDeepLeft, path, set } from 'ramda'
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

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
	(path: Path<T> | null, value: DeepPartial<PathValue<T, Path<T>>>, replace?: boolean): void
}

export type Form<T> = [T, HandleChangeFunction<T>]

function UpdateOnPathAndValue<T>(handleUpdate: HandleUpdateFunction<T>, key: string, value: any, replace?: boolean) {
	const splittedKey = key.split('.')
	const pathLens = lensPath(splittedKey)

	const nextData = set(pathLens, value, {})

	handleUpdate(nextData, replace)
}

function UpdateOnEvent<T>(handleUpdate: HandleUpdateFunction<T>, event: ChangeEvent) {
	const target = event.target as HTMLInputElement
	const value = target.type === 'checkbox' ? target.checked : target.value

	UpdateOnPathAndValue(handleUpdate, target.name, value)
}

function Update<T>(
	handleUpdate: HandleUpdateFunction<T>,
	eventOrDeltaOrPath: any,
	replaceOrValue?: any,
	replace?: boolean,
) {
	const event = eventOrDeltaOrPath as ChangeEvent
	if (event?.nativeEvent instanceof Event) {
		UpdateOnEvent(handleUpdate, event)

		return
	}

	if (typeof eventOrDeltaOrPath === 'string' && typeof replaceOrValue !== 'undefined') {
		UpdateOnPathAndValue(handleUpdate, eventOrDeltaOrPath, replaceOrValue, replace)

		return
	}

	handleUpdate(eventOrDeltaOrPath, replaceOrValue)
}

function useStableCallback<T>(callback: (...args: any[]) => T) {
	const callbackRef = useRef(callback)

	useEffect(() => {
		callbackRef.current = callback
	}, [callback])

	return useCallback(callbackRef.current, [])
}

export function useForm<T>(initialValue: DeepPartial<T> = {}, middlewareFn: MiddlewareFunction<T> = identity): Form<T> {
	const [data, setData] = useState<DeepPartial<T> | null>(middlewareFn(initialValue))

	const handleUpdate = useCallback((delta: DeepPartial<T>, replace?: boolean) => {
		if (delta === null && replace) {
			setData(null)
			return
		}

		setData((data) => {
			if (replace) {
				return middlewareFn(delta)
			}

			let nextData = mergeDeepLeft(delta, data!) as DeepPartial<T>
			nextData = middlewareFn(nextData)

			return nextData
		})
	}, [])

	const handleChange = useStableCallback(function handleChange(
		eventOrDeltaOrPath: any,
		replaceOrValue?: any,
		replace?: boolean,
	) {
		Update(handleUpdate, eventOrDeltaOrPath, replaceOrValue, replace)
	})

	return [data as T, handleChange]
}

export function useNestedForm<T, K extends Path<T>, N extends PathValue<T, K>>(
	[data, onChange]: Form<T>,
	key: K,
): [N, HandleChangeFunction<N>] {
	const currentValue: DeepPartial<N> = useMemo(() => {
		return path((key as string).split('.'), data) ?? {}
	}, [data])

	const handleUpdate = useCallback(
		(delta: DeepPartial<N>) => {
			onChange(key, delta, false)
		},
		[onChange],
	)

	const handleChange = useStableCallback(function handleChange(
		eventOrDeltaOrPath: any,
		replaceOrValue?: any,
		replace?: boolean,
	) {
		Update(handleUpdate, eventOrDeltaOrPath, replaceOrValue, replace)
	})

	return [currentValue as N, handleChange]
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
		const updatedArray = produce<I[]>(currentValue, (draft) => {
			draft.push(item as Draft<I>)
		})

		onChange(key, updatedArray)
	}

	function handleRemoveItem(item: I) {
		const updatedArray = produce<I[]>(currentValue, (draft) => {
			const index = draft.findIndex((i) => identifier(i as I) === identifier(item))
			if (index === -1) {
				return
			}

			draft.splice(index, 1)
		})

		onChange(key, updatedArray)
	}

	function handleUpdateItem(item: I, delta: DeepPartial<I>, replace?: boolean) {
		const updatedArray = produce<I[]>(currentValue, (draft) => {
			const index = draft.findIndex((i) => identifier(i as I) === identifier(item))

			if (index === -1) {
				return
			}

			if (typeof item === 'string') {
				draft[index] = delta as Draft<I>
				return
			}

			if (replace) {
				draft[index] = delta as Draft<I>
				return
			}

			//@ts-ignore
			draft[index] = mergeDeepLeft(delta, draft[index])
		})

		onChange(key, updatedArray)
	}

	function handleChange(item: I, eventOrDeltaOrPath: any, replaceOrValue?: any, replace?: boolean) {
		Update(handleUpdateItem.bind(undefined, item), eventOrDeltaOrPath, replaceOrValue, replace)
	}

	return [currentValue, { onAdd: handleAddItem, onEdit: handleChange, onRemove: handleRemoveItem }]
}

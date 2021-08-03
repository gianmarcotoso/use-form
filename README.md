# `use-form`

A UI agnostic hook for handling local form state.

## Installation

```bash
npm i @polaritybit/use-form
```

## Basic Usage

You can initialize a new form state by calling the `useForm` hook and passing it an initial state. If no initial state is passed, an empty object will be used:

```tsx
import { useForm } from '@gianmarcotoso/use-form'

type Person = {
	name: string
	surname: string
}

function MyForm() {
	const [data, setData] = useForm<Person>({})

	// ...
}
```

The hook will return the current form state and a setter function. The setter function can be used to update the form state at any time, in different ways.

### Updating state programmatically

Calling the setter function with a _delta_ object will update the specified portion of the state accordingly:

```tsx
function handleUpdateName(name: string) {
	setData({ name: name })
}
```

By passing a second parameter set to `true` the state will be _replaced_ completely instead:

```tsx
function MyForm({ person }) {
	const [data, setData] = useForm<Person>(person)

	useEffect(() => {
		// Replace the old state with a new one when
		// the _person_ prop changes

		setData(person, true)
	}, [person])

	// ...
}
```

The setter function can also be called by passing the _key_ you want to update, with its new value as the second parameter:

```tsx
function handleUpdateName(name: string) {
	setData('name', name)
}
```

### Updating the state from an input

The setter function can also be passed to any regular `onChange` event, and it will update the state whenever the event is fired:

```tsx
function MyForm() {
	const [data, setData] = useForm<Person>(person)

	return (
		<div>
			<input name="name" value={data.name} onChange={setData} />
			<input name="surname" value={data.surname} onChange={setData} />
		</div>
	)
}
```

> When passing the setter function to an `onChange` event, remember to also set the `name` property of the input, as it's used internally to determine which part of the state needs to be updated!

## Nested State

If your state has nested objects, the setter function can be used to update nested properties by using the dot notation:

```tsx
type Person = {
	name: string
	surname: string
	address: {
		city: string
		street: string
		zip: number
	}
}

function MyForm() {
	const [data, setData] = useForm<Person>({})

	return (
		<div>
			<input name="name" value={data.name} onChange={setData} />
			<input name="surname" value={data.surname} onChange={setData} />
			<input name="address.city" value={data.address?.city} onChange={setData} />
		</div>
	)
}
```

The setter function can also receive a nested property name as the key when calling it with directly:

```tsx
function handleUpdateCity(city: string) {
	setData('address.city', city)
}
```

You can also use the `useNestedForm` hook to _focus_ on a nested portion of the state and obtain a reference to that portion and a setter function that acts on that nested portion of the state (and all nested portions inside it).

`useNestedForm` requires the parent form _tuple_ as its first parameter, and the
path of the nested state as the second (dot notation is supported):

```tsx
type Person = {
	name: string
	surname: string
	address: {
		city: string
		street: string
		zip: number
	}
}

function MyForm() {
	const [data, setData] = useForm<Person>({})
	const [address, setAddress] = useNestedForm([data, setData], 'address')

	return (
		<div>
			<input name="name" value={data.name} onChange={setData} />
			<input name="surname" value={data.surname} onChange={setData} />
			<input name="city" value={address.city} onChange={setAddress} />
		</div>
	)
}
```

`useNestedForm` can be used recursively to focus on deep portions of the state, as many times as required:

```tsx
type Person = {
	name: string
	surname: string
	address: {
		city: string
		street: string
		zip: number
		contacts: {
			phone: number
			email: string
		}
	}
}

function MyForm() {
	const [data, setData] = useForm<Person>({})
	const [address, setAddress] = useNestedForm([data, setData], 'address')
	const [contacts, setContacts] = useNestedForm([address, setAddress], 'contacts')

	// This is equivalent:
	// const [contacts, setContacts] = useNestedForm([data, setData], 'address.contacts')

	return (
		<div>
			<input name="name" value={data.name} onChange={setData} />
			<input name="surname" value={data.surname} onChange={setData} />
			<input name="city" value={address.city} onChange={setAddress} />
			<input name="email" value={contacts.email} onChange={setContacts} />
		</div>
	)
}
```

The setter function returned by `useNestedForm` has the same signature of the setter function returned by `useForm` and can be used in the same way programmatically:

```tsx
function handleUpdateCity(city: string) {
	// Either
	setAddress({
		city: city,
	})

	// Or
	setAddress('city', city)

	// Replace state also works
	setAddress({}, true)
}
```

## Lists

If your state has a nested array, you can use the `useFormList` hook to focus on it and interact with it:

```tsx
type Todo = {
	id: number
	text: string
	completed: boolean
}

type Person = {
	name: string
	todos: Todo[]
}

function MyForm() {
	const [data, setData] = useForm<Person>({})
	const [todos, todosHandlers] = useFormList([data, setData], 'todos', (i) => i.id)

	// ...
}
```

The `useFormList` receives the tuple of the parent form (it can be either the main form or a nested one), the path to the array (dot notation is supported) and an identifier function that returns a _unique_ property for each item in the array. This function _can_ but _should not_ be the identity function (`i => i`) unless your array contains primitive values such as strings or numbers.

The `useFormList` hook returns a reference to the array, as well as an object containing three handlers to interact with the list: `onAdd`, `onRemove`, `onEdit`.

The `onAdd` handler can be used to add items to the array:

```tsx
function handleAddTodo(text: string) {
	onAdd({ id: Math.random(), text, completed: false })
}
```

The `onRemove` handler can be used to remove items from the array:

```tsx
function handleRemoveTodo(todo: Todo) {
	onRemove(todo)
}
```

The `onEdit` handler can be used to update an item in the array. The signature is _similar_ to that of the setter functions of the other two hooks, but with an additional starting argument that indicates the item that needs to be updated:

```tsx
function handleUpdateTodo(todo: Todo, text: string) {
	// This works
	onEdit(todo, { text: text })

	// Replacing also works
	onEdit(todo, { id: todo.id, text: text, completed: false }, true)

	// You can also use a key and a new value
	// for that key. Dot notation is supported.
	onEdit(todo, 'text', text)
}
```

The `onEdit` function can be bound to a specific item and passed to any `onChange` event as well:

```tsx
function TodoListItem({ todo, onEdit, onRemove }) {
	const boundOnEdit = onEdit.bind(undefined, todo)

	return (
		<tr>
			<td>
				<input name="text" value={todo.text} onChange={boundOnEdit} />
			</td>
			<td>
				<input type="checkbox" name="completed" checked={todo.completed} onChange={boundOnEdit} />
			</td>
			<td>
				<button onClick={() => onRemove(todo)}>Remove</button>
			</td>
		</tr>
	)
}

function MyForm() {
	const [data, setData] = useForm<Person>({})
	const [todos, { onEdit, onRemove }] = useFormList([data, setData], 'todos', (i) => i.id)

	return (
		<table>
			<thead>
				<tr>
					<th>Text</th>
					<th>Done</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{todos.map((todo) => (
					<TodoListItem key={todo.id} todo={todo} onEdit={onEdit} onRemove={onRemove} />
				))}
			</tbody>
		</table>
	)
}
```

## Middlewares

The `useForm` hook supports a _middleware_ as a second parameter. A middleware is a function that gets the _next_ value of the state before it is set, and can mutate it before returning it:

```tsx
const [data, setData] = useForm<Person>({}, (data) => {
	data.name = data.name?.toUpperCase() ?? ''

	return data
})
```

The middleware will be called at the end of _every_ update, including those triggered by the `useNestedForm` or `useFormList` hooks!

## Miscellaneous

### The `value` helper

Setting an empty form state and using the setter function to handle `onChange` events will probably fill your console with warnings about how you are making uncontrolled components controlled. To avoid this, either set a _complete_ initial state or use the `value` helper to wrap all your `value` props:

```tsx
<input name="whatever" value={value(data.whatever)} onChange={setData} />
```

The `value` helper will return the value or an empty string if the value is either `null` or `undefined`.

### Dot Notation

You can use dot notation to traverse nested properties in the state, but attempting to use it to traverse arrays _will_ break things, so avoid doing it. If you're using TypeScript you should get an error when attempting to do so.

```tsx
// This is ok
setData('address.contacts.email', 'hello@example.com')

// This is NOT ok
setData('todos.0.completed', true)
```

Internally, arrays are _always_ replaced, as I couldn't find a reliable and consistent way to update them (this might change in the future though).

### What about validation?

This library focuses on local form state management, and validation is out of its scope. Since you always have access to your form's state, you can use any validation library to validate it either after every update or before submitting. [joi](https://github.com/sideway/joi) is an excellent choice:

```tsx
function MyForm({ onSubmit }) {
	const [data, setData] = useForm()
	const [validationStatus, setValidationStatus] = useState(null)

	function handleSubmit() {
		const { value, error } = Joi.object({
			name: Joi.string().required(),
		}).validate(data)

		if (!error) {
			setValidationStatus(null)
			onSubmit(data)
		} else {
			setValidationStatus(error)
		}
	}

	// ...
}
```

### Is this library maintained?

This is a rewrite of a custom hook I've been using in many projects since hooks came out in beta. I have evolved it throughout the years and fixed many bugs, but the rewrite, which was mainly me wanting to have consistent typings, may have introduced some issues (TypeScript can be hard!). I don't plan on evolving this beyond what's already here unless I find a feature that _really_ needs to be added, so unless there are bugs don't expect many updates.

If you find something that breaks and/or have ideas on additional features, I'll be happy to hear about it in the issues or through a PR! :)

### Previous Work

-   [react-attire](https://github.com/gianmarcotoso/react-attire) was my attempt at doing something similar using render props. It was much more limited but it did its job, even though I haven't used it since hooks have become available.
-   [react-ui-formalize](https://github.com/gianmarcotoso/react-ui-formalize) was my first attempt at tackling the "form" issue, using higher order components. Very old, very deprecated...

## License

MIT

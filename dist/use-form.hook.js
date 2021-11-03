import { identity, mergeDeepLeft, path, lensPath, set } from 'ramda';
import { useState, useCallback, useMemo } from 'react';

function UpdateOnPathAndValue(handleUpdate, key, value, replace) {
    const splittedKey = key.split('.');
    const pathLens = lensPath(splittedKey);
    let nextData = set(pathLens, value, {});
    handleUpdate(nextData, replace);
}
function UpdateOnEvent(handleUpdate, event) {
    const target = event.currentTarget;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    UpdateOnPathAndValue(handleUpdate, target.name, value);
}
function Update(handleUpdate, eventOrDeltaOrPath, replaceOrValue, replace) {
    const event = eventOrDeltaOrPath;
    if ((event === null || event === void 0 ? void 0 : event.nativeEvent) instanceof Event) {
        UpdateOnEvent(handleUpdate, event);
        return;
    }
    if (typeof eventOrDeltaOrPath === 'string' && typeof replaceOrValue !== 'undefined') {
        UpdateOnPathAndValue(handleUpdate, eventOrDeltaOrPath, replaceOrValue, replace);
        return;
    }
    handleUpdate(eventOrDeltaOrPath, replaceOrValue);
}
function useForm(initialValue = {}, middlewareFn = identity) {
    const [data, setData] = useState(middlewareFn(initialValue));
    const handleUpdate = useCallback((delta, replace) => {
        if (delta === null && replace) {
            setData(null);
            return;
        }
        setData((data) => {
            if (replace) {
                return middlewareFn(delta);
            }
            let nextData = mergeDeepLeft(delta, data);
            nextData = middlewareFn(nextData);
            return nextData;
        });
    }, []);
    const handleChange = useCallback(function handleChange(eventOrDeltaOrPath, replaceOrValue, replace) {
        Update(handleUpdate, eventOrDeltaOrPath, replaceOrValue, replace);
    }, [data, handleUpdate]);
    return [data, handleChange];
}
function useNestedForm(form, key) {
    const [data, onChange] = form;
    const currentValue = useMemo(() => {
        var _a;
        return (_a = path(key.split('.'), data)) !== null && _a !== void 0 ? _a : {};
    }, [data]);
    const handleUpdate = useCallback((delta, replace) => {
        onChange(key, delta, replace);
    }, [onChange]);
    const handleChange = useCallback(function handleChange(eventOrDeltaOrPath, replaceOrValue, replace) {
        Update(handleUpdate, eventOrDeltaOrPath, replaceOrValue, replace);
    }, [currentValue, handleUpdate]);
    return [currentValue, handleChange];
}
function useFormList(form, key, identifier) {
    const [data, onChange] = form;
    const currentValue = useMemo(() => {
        var _a;
        return (_a = path(key.split('.'), data)) !== null && _a !== void 0 ? _a : [];
    }, [data, key]);
    function handleAddItem(item) {
        const updatedArray = [...currentValue, item];
        onChange(key, updatedArray);
    }
    function handleRemoveItem(item) {
        const updatedArray = currentValue.filter((i) => identifier(i) !== identifier(item));
        onChange(key, updatedArray);
    }
    function handleUpdateItem(item, delta, replace) {
        const updatedArray = currentValue.map((i) => {
            if (identifier(i) === identifier(item)) {
                if (typeof i === 'object' && !replace) {
                    return mergeDeepLeft(delta, i);
                }
                return delta;
            }
            return i;
        });
        onChange(key, updatedArray);
    }
    function handleChange(item, eventOrDeltaOrPath, replaceOrValue, replace) {
        Update(handleUpdateItem.bind(undefined, item), eventOrDeltaOrPath, replaceOrValue, replace);
    }
    return [currentValue, { onAdd: handleAddItem, onEdit: handleChange, onRemove: handleRemoveItem }];
}

export { useForm, useFormList, useNestedForm };

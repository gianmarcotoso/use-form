import { ChangeEvent } from 'react';
export declare type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
};
export declare type ArrayItem<R> = R extends Array<infer Q> ? Q : never;
export declare type PathImpl<T, K extends keyof T> = K extends string ? T[K] extends Record<string, any> ? T[K] extends ArrayLike<any> ? K | `${K}.${PathImpl<T[K], Exclude<keyof T[K], keyof any[]>>}` : K | `${K}.${PathImpl<T[K], keyof T[K]>}` : K : never;
export declare type Path<T> = PathImpl<T, keyof T> | keyof T;
export declare type PathValue<T, P extends Path<T>> = P extends `${infer K}.${infer Rest}` ? K extends keyof T ? Rest extends Path<T[K]> ? PathValue<T[K], Rest> : never : never : P extends keyof T ? T[P] : never;
export declare type MiddlewareFunction<T> = (data: DeepPartial<T>) => DeepPartial<T>;
export declare type HandleUpdateFunction<T> = (delta: DeepPartial<T>, replace?: boolean) => void;
export declare type HandleChangeFunction<T> = {
    (event: ChangeEvent): void;
    (delta: DeepPartial<T>, replace?: boolean): void;
    (path: Path<T> | null, value: DeepPartial<PathValue<T, Path<T>>>, replace?: boolean): void;
};
export declare type Form<T> = [T, HandleChangeFunction<T>];
export declare function useForm<T>(initialValue?: DeepPartial<T>, middlewareFn?: MiddlewareFunction<T>): Form<T>;
export declare function useNestedForm<T, K extends Path<T>, N extends PathValue<T, K>>([data, onChange]: Form<T>, key: K): [N, HandleChangeFunction<N>];
export declare type HandleAddItemFunction<I> = (item: DeepPartial<I>) => void;
export declare type HandleRemoveItemFunction<I> = (item: I) => void;
export declare type HandleUpdateItemFunction<I> = (item: I, delta: DeepPartial<I>, replace?: boolean) => void;
export declare type HandleChangeItemFunction<I> = {
    (item: I, event: ChangeEvent): void;
    (item: I, delta: DeepPartial<I>, replace?: boolean): void;
    (item: I, path: Path<I>, value: DeepPartial<PathValue<I, Path<I>>>, replace?: boolean): void;
};
export declare type ArrayForm<I> = [
    Array<I>,
    {
        onAdd: HandleAddItemFunction<I>;
        onEdit: HandleChangeItemFunction<I>;
        onRemove: HandleRemoveItemFunction<I>;
    }
];
export declare function useFormList<T, K extends Path<T>, Q extends PathValue<T, K>, I extends ArrayItem<Q>>(form: Form<T>, key: K, identifier: (item: I) => any): ArrayForm<I>;

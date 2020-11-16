export type ExtractValuesFromType<T> = { [I in keyof T]: T[I] }[keyof T];

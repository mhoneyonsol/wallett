declare module 'immutable-tuple' {
  export default function tuple<T extends unknown[]>(...args: T): T;
}

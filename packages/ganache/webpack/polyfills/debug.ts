// patches multiple versions of debug
export const debug = () => () => {};
debug.debug = () => () => {};
export default debug;

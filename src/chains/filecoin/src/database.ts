export type DatabaseOptions = {};

export default class Database implements DatabaseOptions {
  constructor(options: DatabaseOptions) {
    Object.assign(this, options);
  }
}

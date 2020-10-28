import { Definitions } from "@ganache/options";

export type DatabaseConfig = {
  options: {
    /**
     * Specify an alternative database instance, for instance MemDOWN.
     */
    readonly db: {
      type: string | object;
    };
    /**
     * Specify a path to a directory to save the chain database. If a database
     * already exists, that chain will be initialized instead of creating a new
     * one.
     */
    readonly dbPath: {
      type: string;
    };
  };
  exclusiveGroups: [["db", "dbPath"]];
};

export const DatabaseOptions: Definitions<DatabaseConfig> = {
  db: {
    normalize: rawInput => rawInput
  },
  dbPath: {
    normalize: rawInput => rawInput,
    legacyName: "db_path"
  }
};

import { normalize } from "./helpers";
import { Definitions } from "@ganache/options";

export type DatabaseConfig = {
  options: {
    /**
     * Specify an alternative database instance, like MemDOWN
     */
    db: {
      type: string | object;
    };
    /**
     * Specify a path to a directory to save the chain database. If a database
     * already exists, that chain will be initialized instead of creating a new
     * one.
     */
    dbPath: {
      type: string;
    };
  };
  exclusiveGroups: [["db", "dbPath"]];
};

export const DatabaseOptions: Definitions<DatabaseConfig> = {
  db: {
    normalize,
    cliDescription: "Specify an alternative database instance, like MemDOWN",
    disableInCLI: true,
    conflicts: ["dbPath"]
  },
  dbPath: {
    normalize,
    cliDescription: "Specify a path to a directory to save the chain database.",
    cliAliases: ["db"],
    cliType: "string",
    conflicts: ["db"]
  }
};

import { spawnSync } from "child_process";

const spawnCwd =
  process.env.LERNA_ROOT_PATH !== ""
    ? process.env.LERNA_ROOT_PATH
    : process.cwd();

export function replaceSpecialStrings(args: string[]): string[] {
  return args.map(arg =>
    arg.replace(/_PACKAGEDIR_/g, process.cwd()).replace(/_ROOTDIR_/g, spawnCwd)
  );
}

export function LernaExec(command?: string, args?: string[]) {
  if (!command) {
    command = process.argv[2];
  }
  if (!args) {
    args = replaceSpecialStrings(process.argv.slice(3));
  }

  const result = spawnSync(command, args, {
    cwd: spawnCwd,
    stdio: ["inherit", "inherit", "inherit"]
  });

  process.exit(result.status);
}

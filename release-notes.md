# Release notes

## feat: improved user experience for detached instances with prefix matching and suggestions

Detached instances are pretty awesome, but they have long names that you have to type all the time!

With fuzzy matching (and some helpful suggestions), you can get by without typing so much:

```
$ ganache instances stop hot_lim_cheesecacke

hot_lim_cheesecacke not found.

Did you mean:
 - hot_lime_cheesecake
 - hot_lemon_loaf

$ ganache instances stop hot_li
hot_lime_cheesecake stopped
```

note: now you only need to enter the unique prefix of the instance name. Ganache will use this prefix to identify the instance.

## feat: access logs from detached instances

No longer will you have to squint at your screen trying to decipher what's going on in your detached instances - with this new feature, you can access logs with just a few keystrokes. Simply use the command `ganache instances logs <instance-name>` and filter your logs by timestamp using `--from <timestamp>` or `--to <timestamp>`. You can use a linux timestamp, a formatted date, or even a duration (yes, you read that right - a duration!) to filter your logs. Try out `--follow` to continue to stream logs as they are output from the instance.

## feat: naming detached instances

Gone are the days of trying to keep track of multiple detached instances with meaningless names. With our new feature, you can use the `--name <name>` or `--tag <name>` argument to give your instance a meaningful name that makes sense to you. No more guessing or confusion!

## feat: `instances` command aliased to `i`

You can now type `ganache i` instead of `ganache instances`. And it doesn't stop there - you can even use the `i` alias when accessing instance logs. For example, `ganache i logs` is now just a few keystrokes away!

#! /usr/bin/env node

const args = process.argv.slice(2);

const pullArg = (key) => {
  const index = args.indexOf(key);
  const value = index !== -1 && args[index + 1];
  if (value) {
    args.splice(index, 2);
    return value;
  }
};

const outfile = pullArg("-o");
const name = pullArg("-n");

require(".")({ classes: args, outfile, name });

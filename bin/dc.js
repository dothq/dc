#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');

const fs = require("fs");
const path = require("path");

program.version('1.0.0');

const log = (chan, pl) => {
    const channels = {
        ERROR: chalk.red.bold,
        WARN: chalk.yellow.bold,
        INFO: chalk.blue.bold,
        SUCCESS: chalk.green.bold
    }

    console.log(`${channels[chan](chan)}`, pl)
}

program
  .command('build [destination]')
  .description('build chromium to the specified destination')
  .action((destination) => {
    if(destination) destination = destination.split("/");
    destination = destination.filter(e => e.length !== 0)
    if(destination.length == 1) return log("ERROR", `The output folder (\`${destination[0]}\`) must have include another build directory inside.`)
    if(!destination) destination = ["out", "Default"]

    if(!fs.existsSync(path.resolve(process.cwd(), "buildtools"))) return log("ERROR", "The folder `./buildtools` could not be resolved.")
    if(!destination) log("WARN", "Output missing, defaulting to `out/Default`...")

    if(!fs.existsSync(path.resolve(process.cwd(), ...destination))) {
      log("WARN", "Output folder does not exist, creating...")

      if(!fs.existsSync(path.resolve(process.cwd(), destination[0]))) fs.mkdirSync(path.resolve(process.cwd(), destination[0]))
      if(!fs.existsSync(path.resolve(process.cwd(), ...destination))) fs.mkdirSync(path.resolve(process.cwd(), ...destination))
    }

    if(!fs.existsSync(path.resolve(process.cwd(), ...destination, "build.ninja"))) {
      log("WARN", "`build.ninja` does not exist, creating...")
    }
  });

program.parse(process.argv)
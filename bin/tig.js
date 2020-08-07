#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');

const fs = require("fs");
const http = require('isomorphic-git/http/node')
const path = require("path");
const axios = require('axios');

const commandExists = require('command-exists').sync;

const git = require('isomorphic-git')
const hg = require("hg");
const { exec } = require('child_process');

program.version('1.0.0');

const log = (chan, pl, upPrev, nl) => {
    const channels = {
        ERROR: chalk.red.bold,
        WARN: chalk.yellow.bold,
        INFO: chalk.blue.bold,
        SUCCESS: chalk.green.bold,
        PROCESS: chalk.magenta.bold,
        HELPER: chalk.cyan.bold
    }

    if(upPrev) {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(`${channels[chan](chan)} ` + pl);
    } else {
      console.log(`${nl ? "\n" : ""}${channels[chan](chan)}`, pl) 
    }
}

const fancyTime = (duration) => {
  var milliseconds = parseInt((duration % 1000) / 100),
    seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return hours + ":" + minutes + ":" + seconds;
}

const runShell = (cmd) => {
  const exec = require('child_process').exec;

  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.warn(error);
      }

      resolve(stdout ? stdout : stderr);
    });
  });
}

program
  .command('fetch <hgProject> <gitProject>')
  .description('fetch a project')
  .action((hgProject, gitProject, sw) => {
    var t = Date.now();

    log("INFO", `Checking if Mercurial is installed on your system...`, true)
    const mercurialInstalled = commandExists("hg");

    log("INFO", `Checking if Git is installed on your system...`, true)
    const gitInstalled = commandExists("git");

    if(!mercurialInstalled) {
      log("ERROR", `For \`tig\` to work, you will need to install Mercurial.`)

      var platform = require("os").platform

      const hash = platform == "win32" ? "#Windows" : platform == "darwin" ? "#Mac_OS_X" : ""

      return log("ERROR", `Mercurial can be installed for your \`${require("os").platform}\` machine by following the instructions at https://www.mercurial-scm.org/wiki/Download${hash}.`)
    }

    if(!gitInstalled) {
      log("ERROR", `For \`tig\` to work, you will need to install Git.`)

      const platform = require("os").platform

      const path = platform == "win32" ? "win" : platform == "darwin" ? "mac" : "linux"

      return log("ERROR", `Git can be installed for your \`${require("os").platform}\` machine by downloading Git at https://git-scm.com/download/${path}.`)
    }

    if(!hgProject.startsWith("http") || !hgProject.startsWith("https")) hgProject = `https://` + hgProject;

    const repo = hgProject.split("://")[1].split("/");
    repo.shift()

    log("HELPER", `Preparing \`${repo.join("/")}\` for mercurial clone at server \`${hgProject.split("://")[1].split("/").shift()}\`.`, false, true)

    const projectName = repo.join("/").split("/").pop();

    if(!gitProject.startsWith("http") || !gitProject.startsWith("https")) gitProject = `https://` + gitProject;

    const gitRepo = gitProject.split("://")[1].split("/");
    gitRepo.shift()

    const dir = path.join(process.cwd(), projectName)

    if(!done) {
      log("PROCESS", `Starting clone of mercurial repository \`${repo.join("/")}\` located at \`${hgProject.split("://")[1].split("/").shift()}\`, this may take a while...`, false, false)
    }

    var int = setInterval(() => {
      log("INFO", `[${fancyTime(Date.now() - t)}] Tig is still cloning...`, true)
    }, 1000)

    var failed = false;
    var done = false;

    hg.clone(hgProject, dir, async (e, out) => {      
      if(e) {
        done = true;
        failed = true;

        log("ERROR", e.message, false, true)

        return clearInterval(int)
      }

      if(!failed && out) {
        done = true;
        log("SUCCESS", `Cloned mercurial repository \`${repo.join("/")}\` in \`${fancyTime(Date.now() - t)}s\`.`, true, true)
        clearInterval(int)

        int = null;
        
        await runShell(`cd ${repo.join("/")} && git init && git remote add origin ${gitProject} && git remote -v`).then(o => {
          if(o.includes(gitProject)) log("SUCCESS", `Added \`${gitRepo.join("/")}\` remote to \`${repo.join("/")}\` Mercurial repository.`, false, true)
          else return log("WARN", `Something might've gone wrong.\n` + o, false, true)
        })

        nt = Date.now();

        console.log("\n");
        log("PROCESS", `Fetching files for git repository \`${gitRepo.join("/")}\` located at \`${gitProject.split("://")[1].split("/").shift()}\`, this may take a while...`, false, false)
    
        var fetchInt = setInterval(() => {
          log("INFO", `[${fancyTime(Date.now() - nt)}] Fetching files at \`${gitRepo.join("/")}\` remote...`, true)
        }, 1000)

        await runShell(`cd ${repo.join("/")} && git fetch --all && git reset --hard origin/master`).then(o => {
          clearInterval(fetchInt)

          if(o.includes("HEAD is now at")) {
            const currentState = o.split("HEAD is now at ")[1].split("\n")[0];

            log("SUCCESS", `Fetched files at git repository \`${gitRepo.join("/")}\` in \`${fancyTime(Date.now() - nt)}s\`.`, true, true)
            log("INFO", `Last commit for \`${gitRepo.join("/")}\` was \`${currentState}\``, false, true)

            log("SUCCESS", `Done in \`${fancyTime(Date.now() - nt)}s\`.`, true, true)
          } else return log("WARN", `Something might've gone wrong.\n` + o, false, true)
        })
      }
    });

  });

program.parse(process.argv)
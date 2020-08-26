const fs = require("fs");
const { resolve } = require("path");
const chalk = require("chalk");

const { grabManifest } = require("./download-manifest");
const { runCppHook } = require("./cpp-hook");
const { log } = require("./console");
const rimraf = require("rimraf");
const { fancyTime } = require("./time");
const commandExists = require("command-exists");
const merge = require('merge-dirs');

const sleep = () => {
  return new Promise((resolve) => {
      setTimeout(resolve, 2000);
  });
}
const preGet = async (tag, manifestOverride) => {
    var t = Date.now();

    const { name, id, author, targets, builder, requires } = await grabManifest(tag, manifestOverride);

    if(!name || !id || !author || !builder || !targets || !targets.base || !targets.patch || !requires) { 
      log("ERROR", `Failed to load build script \`${tag}\`. It seems to be malformed.`)

      const home = require('os').homedir();
      const cache = resolve(home, ".cache");

      rimraf.sync(resolve(resolve(cache, "dot", tag)))

      log("INFO", `I've cleared the cache for the build script \`${tag}\`. Please run the command again.`)
      process.exit(-1)
    }

    const friendlyPackageNames = {
      git: "Git - (https://git-scm.com)",
      hg: "Mercurial - (https://www.mercurial-scm.org)"
    }

    const r = requires.map(require => {
      if(!commandExists(require)) {
        if(friendlyPackageNames[require]) return friendlyPackageNames[require]
        else return require;
      }
    }).filter(Boolean)

    if(r.length !== 0) {
      log("ERROR", `The build script \`${tag}\` requires you have the following packages installed:`)
      console.log("          * " + r.join("\n          * "))

      process.exit(0)
    }

    log("INFO", `Setting up \`${name} (${id})\` by \`${author}\`.`)
  
    rimraf.sync(resolve(process.cwd(), tag))

    let patches = [];

    for (const [targetName, targetData] of Object.entries(targets)) {
      const loc = resolve(process.cwd(), tag);

      if(fs.existsSync(loc)) {
        patches.push({ folder: "dotbuildtarget-"+targetName+"-"+targetData.type, targetName })
        await runCppHook(targetData, targetName, resolve(process.cwd(), tag, "dotbuildtarget-"+targetName+"-"+targetData.type));
      }
      else await runCppHook(targetData, targetName, loc);
    }

    for (const patch of patches) {
      console.log(patch)

      const patchLocation = resolve(process.cwd(), tag, patch.folder);
      const newLocation = resolve(process.cwd(), tag);

      var t = Date.now()
      log("INFO", `Merging \`${patch.targetName}\` with \`${Object.entries(targets)[0][0]}\`...`)

      merge(patchLocation, newLocation, 'overwrite')

      // merge(patchLocation, newLocation).then(r => {
      //   log("SUCCESS", `Merged \`${patch.targetName}\` with \`${Object.entries(targets)[0][0]}\` in \`${fancyTime(Date.now() - t)}s\`.`, true, false)
      // }).catch(e => {
      //   log("ERROR", `Failed merging \`${patch.targetName}\` with \`${Object.entries(targets)[0][0]}\`: ${e}`)
      // })
    }

    await sleep(2500);

    console.log(chalk.strikethrough("\n―――――――――――――――――――――――――――――――――――――――――――――――――――――――――\n"))
    log("SUCCESS", `🎉 You are now ready to build ${chalk.bold("⭘  Dot Browser")}!`)
    console.log()
    log("INFO", `Total time took: ${chalk.bold(fancyTime(Date.now() - t))}.`)
    log("INFO", `Targets cloned: ${chalk.bold(Object.entries(targets).length)}.`)
    console.log(chalk.strikethrough("\n―――――――――――――――――――――――――――――――――――――――――――――――――――――――――\n"))

    process.exit(0);
}

module.exports = { preGet }
async function run(cmdName, context) {
  context.stdout.write(cmdName + ': ' + context.args.map(arg => arg.toUpperCase()).join(','));
  return 1;
}

var Module = (() => {
  return { run };
})();

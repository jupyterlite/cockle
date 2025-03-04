async function run(cmdName, context) {
  context.stdout.write(cmdName + ': ' + context.args.join(','));
  return 0;
}

var Module = (() => {
  return { run };
})();

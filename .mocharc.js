module.exports = {
  require: '@babel/register',
  'check-leaks': true,
  recursive: true,
  ui: 'bdd',
  reporter: 'nyan',
  timeout: 2000,
};

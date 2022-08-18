const ARGV = process.argv.slice(2);
console.log(process.argv.slice(0,2));
const {atob} = require("../js/helpers");
console.log(atob(ARGV[0]));
console.log(ARGV[1]);

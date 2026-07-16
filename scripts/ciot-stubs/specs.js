/** Specs aggregator — exports all subject specs as a single array. */
const part1 = require('./specs-part1');
const part2 = require('./specs-part2');
const part3 = require('./specs-part3');

module.exports = [...part1, ...part2, ...part3];

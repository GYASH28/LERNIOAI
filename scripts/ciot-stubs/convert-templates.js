/**
 * Smarter converter: line-by-line, identifies long string fields and converts
 * the wrapping single quotes to backticks (template literals).
 * Handles embedded single quotes inside the value.
 */
const fs = require('fs');

const FILES = [
  __dirname + '/specs-part1.js',
  __dirname + '/specs-part2.js',
];

const LONG_FIELDS = ['theory', 'problem', 'solution', 'explanation', 'modelAnswer', 'content'];

FILES.forEach(file => {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const out = lines.map(line => {
    // Match pattern: optional ws, field name, colon, ws, opening ', then content, then closing ' followed by , or } or ) at EOL
    const m = line.match(/^(\s+)(\w+):\s+'(.*)',?\s*$/);
    if (!m) return line;
    const [, indent, field, rawContent] = m;
    if (!LONG_FIELDS.includes(field)) return line;

    // rawContent is everything between the opening ' and the closing ',?
    // The original line ends with `'` or `',` — the regex consumed the closing ' and optional ,
    // We need to determine if there was a trailing comma
    const trailingComma = /',\s*$/.test(line) ? ',' : '';
    // Convert content (with escaped quotes) to template literal safe form
    let content = rawContent
      .replace(/\\\\/g, '\x00')           // protect \\
      .replace(/\\'/g, "'")               // \' → '
      .replace(/`/g, '\\`')               // ` → \`
      .replace(/\$\{/g, '\\${')           // ${ → \${
      .replace(/\x00/g, '\\\\');          // restore \\ as \\\\
    return `${indent}${field}: \`${content}\`${trailingComma}`;
  });
  fs.writeFileSync(file, out.join('\n'), 'utf8');
  console.log('Converted:', file);
});

const fs = require("fs"), ts = require("typescript"), path = require("path");
function visitDir(dir) { for (const name of fs.readdirSync(dir)) {
 const file = path.join(dir, name); if (fs.statSync(file).isDirectory()) { visitDir(file); continue; }
 if (!file.endsWith(".tsx")) continue;
 const text = fs.readFileSync(file, "utf8"), ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), edits = [];
 function visit(node) { if (node.kind === ts.SyntaxKind.JsxText && /['"]/.test(node.getFullText(ast))) {
 const start = node.getFullStart(), end = node.end; edits.push({ start, end, value: text.slice(start, end).replace(/'/g, "&apos;").replace(/"/g, "&quot;") });
 } ts.forEachChild(node, visit); } visit(ast);
 if (edits.length) { let out = text; for (const edit of edits.reverse()) out = out.slice(0,edit.start) + edit.value + out.slice(edit.end); fs.writeFileSync(file,out); }
}}
visitDir("src");

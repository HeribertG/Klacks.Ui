"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var dryRun = process.argv.includes('--dry-run');
function replaceNgIf(content, filePath) {
    var regex = /<([\w-]+)\s+\*ngIf="([^"]+)"([^>]*)>([\s\S]*?)<\/\1>/g;
    var hasMatch = false;
    var replaced = content.replace(regex, function (_, tag, condition, attributes, inner) {
        hasMatch = true;
        return "@if (".concat(condition, ") {\n  <").concat(tag).concat(attributes, ">").concat(inner, "</").concat(tag, ">\n}");
    });
    if (hasMatch) {
        console.log("".concat(dryRun ? '🔍 DRY-RUN:' : '✔️ Geändert:', " ").concat(filePath));
    }
    return replaced;
}
function processFile(filePath) {
    var content = fs.readFileSync(filePath, 'utf-8');
    var updated = replaceNgIf(content, filePath);
    if (!dryRun && content !== updated) {
        fs.writeFileSync(filePath, updated, 'utf-8');
    }
}
function walk(dir) {
    for (var _i = 0, _a = fs.readdirSync(dir); _i < _a.length; _i++) {
        var entry = _a[_i];
        var fullPath = path.join(dir, entry);
        var stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walk(fullPath);
        }
        else if (entry.endsWith('.html')) {
            processFile(fullPath);
        }
    }
}
// 🟢 Starte hier
var baseDir = process.argv[2] || __dirname;
walk(baseDir);

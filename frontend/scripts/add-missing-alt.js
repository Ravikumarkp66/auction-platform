const fs = require('fs');
const path = require('path');
const glob = require('fast-glob');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

async function run() {
    const root = path.resolve(__dirname, '..');
    const patterns = [
        'src/**/*.jsx',
        'src/**/*.js',
        'src/**/*.tsx',
        'src/**/*.ts'
    ];

    const files = await glob(patterns, { cwd: root, absolute: true });
    let changed = 0;

    for (const file of files) {
        let code = fs.readFileSync(file, 'utf8');
        let ast;
        try {
            ast = parser.parse(code, {
                sourceType: 'module',
                plugins: [
                    'jsx',
                    'classProperties',
                    'objectRestSpread',
                    'optionalChaining',
                    'nullishCoalescingOperator',
                    'typescript'
                ]
            });
        } catch (err) {
            // skip files that fail to parse
            continue;
        }

        let fileChanged = false;

        traverse(ast, {
            JSXElement(path) {
                const opening = path.node.openingElement;
                const name = opening.name;
                let isImg = false;
                if (t.isJSXIdentifier(name) && name.name === 'img') isImg = true;
                if (!isImg) return;

                const hasAlt = opening.attributes.some(attr => {
                    return t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name === 'alt';
                });

                if (!hasAlt) {
                    const altAttr = t.jsxAttribute(t.jsxIdentifier('alt'), t.stringLiteral(''));
                    opening.attributes.push(altAttr);
                    fileChanged = true;
                }
            }
        });

        if (fileChanged) {
            const out = generate(ast, { retainLines: true }, code).code;
            fs.writeFileSync(file, out, 'utf8');
            changed++;
            console.log('Updated:', path.relative(root, file));
        }
    }

    console.log(`Done. Files changed: ${changed}`);
}

run().catch(err => { console.error(err); process.exit(1); });

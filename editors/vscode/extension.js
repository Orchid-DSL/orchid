const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

let orchidTerminal = null;

function getOrCreateTerminal() {
    if (orchidTerminal && !orchidTerminal.exitStatus) {
        return orchidTerminal;
    }
    orchidTerminal = vscode.window.createTerminal({ name: 'Orchid' });
    return orchidTerminal;
}

function findOrchidCommand(filePath) {
    const dir = path.dirname(filePath);
    let current = dir;

    while (true) {
        const binShim = path.join(current, 'node_modules', '.bin',
            process.platform === 'win32' ? 'orchid.cmd' : 'orchid');
        if (fs.existsSync(binShim)) {
            return `"${binShim}"`;
        }

        const cliJs = path.join(current, 'dist', 'cli.js');
        const pkgJson = path.join(current, 'package.json');
        if (fs.existsSync(cliJs) && fs.existsSync(pkgJson)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
                if (pkg.name === '@orchid-dsl/orchid') {
                    return `node "${cliJs}"`;
                }
            } catch (_) {}
        }

        const nmCli = path.join(current, 'node_modules', '@orchid-dsl', 'orchid', 'dist', 'cli.js');
        if (fs.existsSync(nmCli)) {
            return `node "${nmCli}"`;
        }

        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
    }

    return 'orchid';
}

function activate(context) {
    const runFile = vscode.commands.registerCommand('orchid-dsl.runFile', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const filePath = editor.document.fileName;
        if (!filePath.endsWith('.orch')) {
            vscode.window.showErrorMessage('Not an Orchid (.orch) file');
            return;
        }

        editor.document.save().then(() => {
            const cmd = findOrchidCommand(filePath);
            const provider = vscode.workspace.getConfiguration('orchid').get('provider', 'claude');
            const providerFlag = provider !== 'console' ? ` --provider ${provider}` : '';
            const terminal = getOrCreateTerminal();
            terminal.show();
            terminal.sendText(`${cmd}${providerFlag} "${filePath}"`);
        });
    });

    context.subscriptions.push(runFile);

    vscode.window.onDidCloseTerminal((t) => {
        if (t === orchidTerminal) {
            orchidTerminal = null;
        }
    });
}

function deactivate() {
    orchidTerminal = null;
}

module.exports = { activate, deactivate };

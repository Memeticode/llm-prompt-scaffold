import * as vscode from 'vscode';
import ignore from 'ignore';

export class GitignoreParser {
    private ig: ReturnType<typeof ignore>;
    private filePath: vscode.Uri;

    constructor(workspaceRoot: vscode.Uri, fileName: string) {
        this.ig = ignore();
        this.filePath = vscode.Uri.joinPath(workspaceRoot, fileName);
        this.loadRules();
    }

    public async loadRules(): Promise<void> {
        this.ig = ignore();
        const fileContent = await vscode.workspace.fs.readFile(this.filePath);
        const gitignoreContent = Buffer.from(fileContent).toString('utf8');
        this.ig.add(gitignoreContent);
        // try {
        //     const fileContent = await vscode.workspace.fs.readFile(this.filePath);
        //     const gitignoreContent = Buffer.from(fileContent).toString('utf8');
        //     this.ig.add(gitignoreContent);
        // } catch (error) {
        //     if (error instanceof vscode.FileSystemError && error.code !== 'FileNotFound') {
        //         throw error;
        //     }
        //     // If file doesn't exist, we just use an empty ignore ruleset
        // }
    }

    public shouldIgnore(filePath: string): boolean {
        return this.ig.ignores(filePath);
    }

    public getIgnore(): ReturnType<typeof ignore> {
        return this.ig;
    }
}

export class ContextGitignoreParser {
    private includeParser: GitignoreParser;
    private excludeParser: GitignoreParser;

    constructor(workspaceRoot: vscode.Uri, includeFileName: string, excludeFileName: string) {
        this.includeParser = new GitignoreParser(workspaceRoot, includeFileName);
        this.excludeParser = new GitignoreParser(workspaceRoot, excludeFileName);
    }

    public async loadRules(): Promise<void> {
        await Promise.all([ 
            this.includeParser.loadRules(),
            this.excludeParser.loadRules()
        ]);
    }

    public shouldInclude(filePath: string): boolean {
        return this.includeParser.shouldIgnore(filePath) || !this.excludeParser.shouldIgnore(filePath);
    }

    public filterFiles(files: string[]): string[] {
        return files.filter(file => this.shouldInclude(file));
    }
}
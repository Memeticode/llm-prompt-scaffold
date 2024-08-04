import * as vscode from 'vscode';
import ignore from 'ignore';

export interface FileFilter {
    shouldIncludeAsync(uri: vscode.Uri): Promise<boolean>;
}


export class CompositeFileFilter implements FileFilter {
    constructor(private filters: FileFilter[]) {}

    async shouldIncludeAsync(uri: vscode.Uri): Promise<boolean> {
        for (const filter of this.filters) {
            if (!(await filter.shouldIncludeAsync(uri))) {
                return false;
            }
        }
        return true;
    }
}

export class GitignoreParser implements FileFilter {
    private ig: ReturnType<typeof ignore>;

    constructor(private workspaceRoot: vscode.Uri, private fileName: string) {
        this.ig = ignore();
    }

    async loadRules(): Promise<void> {
        const filePath = vscode.Uri.joinPath(this.workspaceRoot, this.fileName);
        try {
            const fileContent = await vscode.workspace.fs.readFile(filePath);
            const gitignoreContent = Buffer.from(fileContent).toString('utf8');
            this.ig.add(gitignoreContent);
        } catch (error) {
            if (error instanceof vscode.FileSystemError && error.code !== 'FileNotFound') {
                throw error;
            }
            // If file doesn't exist, we just use an empty ignore ruleset
        }
    }

    async shouldIncludeAsync(uri: vscode.Uri): Promise<boolean> {
        const relativePath = vscode.workspace.asRelativePath(uri, false);
        return !this.ig.ignores(relativePath);
    }
}

export class IncludeExcludeGitignoreParser implements FileFilter {
    private constructor(
        private includeParser: GitignoreParser,
        private excludeParser: GitignoreParser
    ) {}

    async shouldIncludeAsync(uri: vscode.Uri): Promise<boolean> {
        return (await this.includeParser.shouldIncludeAsync(uri)) 
            || !(await this.excludeParser.shouldIncludeAsync(uri));
    }

    static async create(workspaceRoot: vscode.Uri, includeFileName: string, excludeFileName: string): Promise<IncludeExcludeGitignoreParser> {
        const includeParser = new GitignoreParser(workspaceRoot, includeFileName);
        const excludeParser = new GitignoreParser(workspaceRoot, excludeFileName);
        await Promise.all([
            includeParser.loadRules(), 
            excludeParser.loadRules()
        ]);
        return new IncludeExcludeGitignoreParser(includeParser, excludeParser);
    }
}


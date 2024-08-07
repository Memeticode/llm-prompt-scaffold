// src/shared/utility/fileFilters.ts

import * as vscode from 'vscode';
import ignore from 'ignore';
import * as path from 'path';

export interface IFileFlagger {
    loadRulesAsync(): Promise<void>;
    isFlaggedAsync(uri: vscode.Uri): Promise<boolean>;
}

export class GitIgnoreFlagger implements IFileFlagger {
    private ig: ReturnType<typeof ignore>;
    private workspaceRoot: string;

    constructor(private gitignoreUri: vscode.Uri) {
        this.ig = ignore();
        this.workspaceRoot = path.dirname(gitignoreUri.fsPath);
    }

    async loadRulesAsync(): Promise<void> {
        try {
            const fileContent = await vscode.workspace.fs.readFile(this.gitignoreUri);
            const gitignoreContent = Buffer.from(fileContent).toString('utf8');
            this.ig.add(gitignoreContent);
        } catch (error) {
            if (error instanceof vscode.FileSystemError && error.code !== 'FileNotFound') {
                throw error;
            }
            // If file doesn't exist, we just use an empty ignore ruleset
        }
    }

    async isFlaggedAsync(uri: vscode.Uri): Promise<boolean> {
        const relativePath = path.relative(this.workspaceRoot, uri.fsPath);
        return this.ig.ignores(relativePath);
    }
}

export class VscodeSettingsFlagger implements IFileFlagger {
    private excludePatterns: string[] = [];

    constructor(private workspaceFolder: vscode.WorkspaceFolder) {}

    async loadRulesAsync(): Promise<void> {
        const settingsUri = vscode.Uri.joinPath(this.workspaceFolder.uri, '.vscode', 'settings.json');
        try {
            const content = await vscode.workspace.fs.readFile(settingsUri);
            const settings = JSON.parse(content.toString());
            const filesExclude = settings['files.exclude'] || {};
            this.excludePatterns = Object.keys(filesExclude).filter(key => filesExclude[key]);
        } catch (error) {
            if (error instanceof vscode.FileSystemError && error.code !== 'FileNotFound') {
                throw error;
            }
            // If file doesn't exist, we just use an empty exclude patterns array
        }
    }

    async isFlaggedAsync(uri: vscode.Uri): Promise<boolean> {
        const relativePath = path.relative(this.workspaceFolder.uri.fsPath, uri.fsPath);
        return this.excludePatterns.some(pattern => 
            new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$').test(relativePath)
        );
    }
}

export class ExcludeIncludeFlagger implements IFileFlagger {
    constructor(
        private excludeFlagger: IFileFlagger,
        private includeFlagger: IFileFlagger
    ) {}

    async loadRulesAsync(): Promise<void> {
        await Promise.all([this.excludeFlagger.loadRulesAsync(), this.includeFlagger.loadRulesAsync()]);
    }
    async isFlaggedAsync(uri: vscode.Uri): Promise<boolean> {
        const isExcluded = await this.excludeFlagger.isFlaggedAsync(uri);
        const isIncluded = await this.includeFlagger.isFlaggedAsync(uri);
        return isExcluded && !isIncluded;
    }
}

export class FileFlaggerFactory {
    static async createGitIgnoreFlagger(workspaceFolder: vscode.WorkspaceFolder): Promise<IFileFlagger> {
        const gitignoreUri = vscode.Uri.joinPath(workspaceFolder.uri, '.gitignore');
        const flagger = new GitIgnoreFlagger(gitignoreUri);
        await flagger.loadRules();
        return flagger;
    }

    static async createVscodeSettingsFlagger(workspaceFolder: vscode.WorkspaceFolder): Promise<IFileFlagger> {
        const flagger = new VscodeSettingsFlagger(workspaceFolder);
        await flagger.loadSettings();
        return flagger;
    }

    static createExtensionStorageFlagger(workspaceFolder: vscode.WorkspaceFolder, extensionStoragePath: string): IFileFlagger {
        return {
            isFlaggedAsync: async (uri: vscode.Uri) => uri.fsPath.startsWith(path.join(workspaceFolder.uri.fsPath, extensionStoragePath))
        };
    }

    static async createStructureFlagger(workspaceFolder: vscode.WorkspaceFolder, includeFileName: string, excludeFileName: string): Promise<IFileFlagger> {
        const includeUri = vscode.Uri.joinPath(workspaceFolder.uri, includeFileName);
        const excludeUri = vscode.Uri.joinPath(workspaceFolder.uri, excludeFileName);

        const includeFlagger = new GitIgnoreFlagger(includeUri);
        const excludeFlagger = new GitIgnoreFlagger(excludeUri);

        await Promise.all([includeFlagger.loadRules(), excludeFlagger.loadRules()]);

        return new ExcludeIncludeFlagger(excludeFlagger, includeFlagger);
    }


    static async createExcludeIncludeFlagger(
        workspaceFolder: vscode.WorkspaceFolder, 
        excludeFileName: string, 
        includeFileName: string
    ): Promise<IFileFlagger> {
        const excludeUri = vscode.Uri.joinPath(workspaceFolder.uri, excludeFileName);
        const includeUri = vscode.Uri.joinPath(workspaceFolder.uri, includeFileName);

        const excludeFlagger = new GitIgnoreFlagger(excludeUri);
        const includeFlagger = new GitIgnoreFlagger(includeUri);

        await Promise.all([excludeFlagger.loadRulesAsync(), includeFlagger.loadRulesAsync()]);

        return new ExcludeIncludeFlagger(excludeFlagger, includeFlagger);
    }
}
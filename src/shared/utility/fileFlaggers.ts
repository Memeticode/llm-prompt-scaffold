// src/shared/utility/fileFlaggers.ts

import * as vscode from 'vscode';
import * as path from 'path';
import ignore from 'ignore';
import { FileSystemUtils } from './fileSystemUtils';

export interface IFileFlagger {
    loadRulesAsync(): Promise<void>;
    isFlaggedAsync(uri: vscode.Uri): Promise<boolean>;
}

export class PatternFlagger implements IFileFlagger {
    private patterns: string[] = [];

    constructor(private workspaceRoot: string) {}

    async loadRulesAsync(): Promise<void> {
        // This method can be overridden in subclasses if needed
    }

    setPatterns(patterns: string[]): void {
        this.patterns = patterns;
    }

    async isFlaggedAsync(uri: vscode.Uri): Promise<boolean> {
        if (!this.patterns || this.patterns.length === 0) { 
            return false; 
        }
        const relativePath = path.relative(this.workspaceRoot, uri.fsPath);
        return this.patterns.some(pattern => 
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
        return !isExcluded || isIncluded;
    }
}

export enum CompositeLogic {
    AND,
    OR
}

export class CompositeFlagger implements IFileFlagger {
    private flaggers: IFileFlagger[];

    constructor(private logic: CompositeLogic = CompositeLogic.AND) {
        this.flaggers = [];
    }

    addFlagger(flagger: IFileFlagger): void {
        this.flaggers.push(flagger);
    }

    async loadRulesAsync(): Promise<void> {
        await Promise.all(this.flaggers.map(flagger => flagger.loadRulesAsync()));
    }

    async isFlaggedAsync(uri: vscode.Uri): Promise<boolean> {
        if (this.flaggers.length === 0) {
            return true; // If no flaggers, everything is flagged
        }

        if (this.logic === CompositeLogic.AND) {
            for (const flagger of this.flaggers) {
                if (!(await flagger.isFlaggedAsync(uri))) {
                    return false; // Short-circuit on first false for AND logic
                }
            }
            return true; // All flaggers returned true
        } else { // CompositeLogic.OR
            for (const flagger of this.flaggers) {
                if (await flagger.isFlaggedAsync(uri)) {
                    return true; // Short-circuit on first true for OR logic
                }
            }
            return false; // No flagger returned true
        }
    }
}


export class GitIgnoreFlagger implements IFileFlagger {
    private ig: ReturnType<typeof ignore>;
    private gitignoreDir: string;

    constructor(private gitignoreUri: vscode.Uri) {
        this.ig = ignore();
        this.gitignoreDir = path.dirname(gitignoreUri.fsPath);
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
        // Only apply this gitignore if the file is in this gitignore's directory or its subdirectories
        if (!uri.fsPath.startsWith(this.gitignoreDir)) {
            return true; // Files outside this gitignore's scope are always flagged
        }
        
        let relativePath = path.relative(this.gitignoreDir, uri.fsPath);
        
        // If the relativePath is empty, it means the file is in the same directory as .gitignore
        // In this case, we use the filename itself
        if (relativePath === '') {
            relativePath = path.basename(uri.fsPath);
        }
        
        // The ignore package expects forward slashes, even on Windows
        relativePath = relativePath.replace(/\\/g, '/');
        
        return !this.ig.ignores(relativePath);
    }
}

export class VscodeSettingsFlagger extends ExcludeIncludeFlagger {
    private excludePatternFlagger: PatternFlagger;
    private includePatternFlagger: PatternFlagger;

    constructor(private settingsUri: vscode.Uri) {
        const workspaceRoot = path.dirname(settingsUri.fsPath);
        const excludeFlagger = new PatternFlagger(workspaceRoot);
        const includeFlagger = new PatternFlagger(workspaceRoot);
        super(excludeFlagger, includeFlagger);
        this.excludePatternFlagger = excludeFlagger;
        this.includePatternFlagger = includeFlagger;
    }

    async loadRulesAsync(): Promise<void> {
        try {
            const content = await FileSystemUtils.readFileIfExistsAsync(this.settingsUri) ?? '{}';
            const settings = JSON.parse(content.toString());
            
            const filesExclude = settings['files.exclude'] || {};
            const excludePatterns = Object.keys(filesExclude).filter(key => filesExclude[key]);
            this.excludePatternFlagger.setPatterns(excludePatterns);
            
            const filesInclude = settings['files.include'] || {};
            const includePatterns = Object.keys(filesInclude).filter(key => filesInclude[key]);
            this.includePatternFlagger.setPatterns(includePatterns);
        } catch (error) {
            if (error instanceof vscode.FileSystemError && error.code !== 'FileNotFound') {
                throw error;
            }
            // If file doesn't exist, we just use empty arrays for patterns
        }
    }

    
    async isFlaggedAsync(uri: vscode.Uri): Promise<boolean> {
        const res = await super.isFlaggedAsync(uri);
        return res;
    }
}

export class FileFlaggerFactory {
    
    static async createGitIgnoreFlaggerAsync(workspaceFolder: vscode.WorkspaceFolder, loadRules: boolean = false): Promise<IFileFlagger> {
        const gitignoreUri = vscode.Uri.joinPath(workspaceFolder.uri, '.gitignore');
        const flagger = new GitIgnoreFlagger(gitignoreUri);
        if (loadRules) 
        {
            await flagger.loadRulesAsync();
        }
        return flagger;
    }

    static async createVscodeSettingsFlaggerAsync(workspaceFolder: vscode.WorkspaceFolder, loadRules: boolean = false): Promise<IFileFlagger> {
        const settingsUri = vscode.Uri.joinPath(workspaceFolder.uri, '.vscode', 'settings.json');
        const flagger = new VscodeSettingsFlagger(settingsUri);
        if (loadRules) 
        {
            await flagger.loadRulesAsync();
        }
        return flagger;
    }

    static async createExcludeIncludeGitignoreFlaggerAsync(
        workspaceFolder: vscode.WorkspaceFolder, 
        excludeFileName: string, 
        includeFileName: string,
        loadRules: boolean = false
    ): Promise<IFileFlagger> {
        const excludeUri = vscode.Uri.joinPath(workspaceFolder.uri, excludeFileName);
        const includeUri = vscode.Uri.joinPath(workspaceFolder.uri, includeFileName);

        const excludeFlagger = new GitIgnoreFlagger(excludeUri);
        const includeFlagger = new GitIgnoreFlagger(includeUri);

        const flagger = new ExcludeIncludeFlagger(excludeFlagger, includeFlagger);
        if (loadRules) {
            await flagger.loadRulesAsync();
        }
        return flagger;
    }
    

    static async createCompositeFlaggerAsync(
        flaggers: IFileFlagger[],
        loadRules: boolean = false
    ): Promise<IFileFlagger> {        
        const flagger = new CompositeFlagger(CompositeLogic.AND);
        if (flaggers) {
            for (let i = 0; i < flaggers.length; i++) 
            {
                flagger.addFlagger(flaggers[i]);
            }
        }        
        if (loadRules)
        {
            await flagger.loadRulesAsync();
        }
        return flagger;
    }



    static async createCompositeGitIgnoreFlaggerAsync(workspaceFolder: vscode.WorkspaceFolder, loadRules: boolean = false): Promise<IFileFlagger> {
        const gitignoreFiles = await this.findGitIgnoreFiles(workspaceFolder.uri);
        const compositeFlagger = new CompositeFlagger(CompositeLogic.AND);

        for (const gitignoreUri of gitignoreFiles) {
            const flagger = new GitIgnoreFlagger(gitignoreUri);
            if (loadRules) {
                await flagger.loadRulesAsync();
            }
            compositeFlagger.addFlagger(flagger);
        }

        return compositeFlagger;
    }

    private static async findGitIgnoreFiles(rootUri: vscode.Uri): Promise<vscode.Uri[]> {
        const gitignoreFiles: vscode.Uri[] = [];
        
        const traverseDirectory = async (dirUri: vscode.Uri) => {
            const entries = await vscode.workspace.fs.readDirectory(dirUri);
            for (const [name, type] of entries) {
                if (type === vscode.FileType.Directory) {
                    await traverseDirectory(vscode.Uri.joinPath(dirUri, name));
                } else if (name === '.gitignore') {
                    gitignoreFiles.push(vscode.Uri.joinPath(dirUri, name));
                }
            }
        };

        await traverseDirectory(rootUri);
        return gitignoreFiles;
    }


}

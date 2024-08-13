// promptContextFileGenerator.ts

import * as vscode from 'vscode';
import * as path from 'path';
import { EXTENSION_STORAGE } from '../../constants/extensionStorage'; 
import { PromptConfigFileKey, PromptContextFileKey } from '../../extension/types';
import { ExtensionUtils } from '../../extension/utility/extensionUtils';
import { FileSystemUtils } from '../../shared/utility/fileSystemUtils'; 

import ignore from 'ignore';

export class PromptContextFileGenerator {
    
    public static async generateContextItemFromConfigItem(
        workspace: vscode.WorkspaceFolder, 
        fileType: PromptContextFileKey
    ): Promise<vscode.Uri> {
        const outUri = ExtensionUtils.getExtensionStoragePromptContextFileUri(workspace, fileType);
        const configFileType = this.getMatchingConfigFileType(fileType);
        const sourceUri = ExtensionUtils.getExtensionStoragePromptConfigFileUri(workspace, configFileType);
        await FileSystemUtils.streamFileContentAsync(outUri, sourceUri, {
            transform: (line) => !line.trim().startsWith('#') ? line : null,
            trimEmptyLines: true
        });
        return outUri;
    }

    public static async generateFileStructureContextAsync(workspace: vscode.WorkspaceFolder): Promise<vscode.Uri> {
        const outUri = ExtensionUtils.getExtensionStoragePromptContextFileUri(workspace, 'FILE_STRUCTURE');
        const filteredFiles = await this.getContextStructureFilesAsync(workspace);
        const formattedStructure = this.generateContextStructureText(workspace, filteredFiles);
        await FileSystemUtils.writeFileAsync(outUri, formattedStructure);    
        return outUri;
    }

    public static async generateFileContentContextAsync(workspace: vscode.WorkspaceFolder): Promise<vscode.Uri> {
        const outUri = ExtensionUtils.getExtensionStoragePromptContextFileUri(workspace, 'FILE_CONTENT');
        const filteredFiles = await this.getContextContentFilesAsync(workspace);    
        const writeStream = FileSystemUtils.createWriteStream(outUri);
        for (const filePath of filteredFiles) {
            const fileUri = vscode.Uri.file(filePath);
            const relativePath = path.relative(workspace.uri.fsPath, filePath);
            const content = await FileSystemUtils.readFileAsync(fileUri);
            writeStream.write(`[FILE_START: ${relativePath}]\n${content}\n[FILE_END: ${relativePath}]\n\n`);
        }    
        writeStream.end();
        return outUri;
    }


    public static async generateAggregatePromptAsync(workspace: vscode.WorkspaceFolder): Promise<vscode.Uri> {
        const outUri = ExtensionUtils.getExtensionStoragePromptContextFileUri(workspace, 'AGGREGATE_PROMPT');
        const contextFiles = Object.entries(EXTENSION_STORAGE.STRUCTURE.PROMPT_CONTEXT_DIR.FILES)
            .filter(([key]) => key !== 'AGGREGATE_PROMPT')
            .map(([key, value]) => ({ key: key as PromptContextFileKey, label: value.label }));    
        let isFirstFile = true;
        for (const contextFile of contextFiles) {
            const fileUri = ExtensionUtils.getExtensionStoragePromptContextFileUri(workspace, contextFile.key);
            if (await FileSystemUtils.isFileNotEmptyAsync(fileUri)) {
                const header = `<<<<<<<<<< BEGIN ${contextFile.label.toUpperCase()} >>>>>>>>>>`;
                const trailer = `<<<<<<<<<< END ${contextFile.label.toUpperCase()} >>>>>>>>>>`;                
                await FileSystemUtils.appendFileContentAsync(outUri, fileUri, {
                    header,
                    trailer,
                    append: !isFirstFile
                });                
                isFirstFile = false;
            }
        }
    
        return outUri;
    }
    
    private static getMatchingConfigFileType(contextFileKey: PromptContextFileKey): PromptConfigFileKey {
        const contextFileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONTEXT_DIR.FILES[contextFileKey].fileName;
        for (const [configKey, configFile] of Object.entries(EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES)) {
            if (configFile.fileName === contextFileName) {
                return configKey as PromptConfigFileKey;
            }
        }
        throw new Error(`No matching config file type found for context file key: ${contextFileKey}`);
    }
    
    private static async getContextStructureFilesAsync(workspace: vscode.WorkspaceFolder): Promise<string[]>
    {
        const extensionStorageDirUri = ExtensionUtils.getExtensionStorageFolderUri(workspace);
        const gitIgnoreFilter = await WorkspaceGitIgnoreFilter.createAsync(workspace.uri);
        const vsCodeSettingsFilter = await VsCodeSettingsFilter.createAsync(workspace.uri);
        const extensionStorageFilter = new ExtensionStorageFilter(extensionStorageDirUri);
        const workspaceFileStructureFilter = await WorkspaceFileContextFilter.createFileStructureFilterAsync(workspace);

        const filters: IFileFilter[] = [
            gitIgnoreFilter,
            vsCodeSettingsFilter,
            extensionStorageFilter,
            workspaceFileStructureFilter
        ];

        const filteredStructure: string[] = [];
        await this.recursivelyFilterProjectFilesAsync(
            workspace.uri,
            filteredStructure,
            filters
        );
        return filteredStructure;
    }

    private static async getContextContentFilesAsync(workspace: vscode.WorkspaceFolder): Promise<string[]>
    {
        const extensionStorageDirUri = ExtensionUtils.getExtensionStorageFolderUri(workspace);
        const gitIgnoreFilter = await WorkspaceGitIgnoreFilter.createAsync(workspace.uri);
        const vsCodeSettingsFilter = await VsCodeSettingsFilter.createAsync(workspace.uri);
        const extensionStorageFilter = new ExtensionStorageFilter(extensionStorageDirUri);
        const workspaceFileStructureFilter = await WorkspaceFileContextFilter.createFileStructureFilterAsync(workspace);
        const workspaceFileContentFilter = await WorkspaceFileContextFilter.createFileStructureFilterAsync(workspace);

        const filters: IFileFilter[] = [
            gitIgnoreFilter,
            vsCodeSettingsFilter,
            extensionStorageFilter,
            workspaceFileStructureFilter,
            workspaceFileContentFilter
        ];

        const filteredStructure: string[] = [];
        await this.recursivelyFilterProjectFilesAsync(
            workspace.uri,
            filteredStructure,
            filters
        );
        return filteredStructure;
    }

    private static async recursivelyFilterProjectFilesAsync(
        uri: vscode.Uri,
        filteredStructure: string[],
        filters: IFileFilter[]
    ): Promise<void> {
        const entries = await vscode.workspace.fs.readDirectory(uri);
        const sortedEntries = this.sortDirectoryEntries(entries);
    
        for (const [name, type] of sortedEntries) {
            const fullUri = vscode.Uri.joinPath(uri, name);
            
            // Check if the file/directory passes all filters
            let shouldInclude = true;
            for (const filter of filters) {
                if (!filter.shouldInclude(fullUri)) {
                    shouldInclude = false;
                    break;
                }
            }
    
            if (shouldInclude) {
                if (type === vscode.FileType.File) {
                    filteredStructure.push(fullUri.fsPath);
                } else if (type === vscode.FileType.Directory) {
                    await this.recursivelyFilterProjectFilesAsync(
                        fullUri,
                        filteredStructure,
                        filters
                    );
                }
            }
        }
    }

    private static generateContextStructureText(workspace: vscode.WorkspaceFolder, filteredStructure: string[]): string {
        const rootPath = workspace.uri.fsPath;
        const structure: string[] = [workspace.name];
        const tree: { [key: string]: Set<string> } = {};
    
        // Sort the filtered structure
        filteredStructure.sort((a, b) => a.localeCompare(b));
    
        // Build the tree structure
        filteredStructure.forEach(filePath => {
            const relativePath = path.relative(rootPath, filePath);
            const parts = relativePath.split(path.sep);
            let currentPath = '';
            parts.forEach((part, index) => {
                const parentPath = currentPath;
                currentPath = path.join(currentPath, part);
                if (!tree[parentPath]) {
                    tree[parentPath] = new Set();
                }
                tree[parentPath].add(currentPath);
            });
        });
    
        // Function to recursively build the formatted structure
        const buildStructure = (currentPath: string, prefix: string, isLast: boolean): void => {
            const parts = currentPath.split(path.sep);
            const currentName = parts[parts.length - 1];
            const newPrefix = prefix + (isLast ? '    ' : '│   ');
            const isDirectory = tree[currentPath] !== undefined;
    
            structure.push(`${prefix}${isLast ? '└── ' : '├── '}${currentName}${isDirectory ? '/' : ''}`);
    
            if (isDirectory) {
                const children = Array.from(tree[currentPath]).sort();
                children.forEach((child, index) => {
                    buildStructure(child, newPrefix, index === children.length - 1);
                });
            }
        };
    
        // Start building the structure from the root
        if (tree['']) {
            const rootChildren = Array.from(tree['']).sort();
            rootChildren.forEach((child, index) => {
                buildStructure(child, '', index === rootChildren.length - 1);
            });
        }
    
        return structure.join('\n');
    }
    
    
    private static sortDirectoryEntries(entries: [string, vscode.FileType][]): [string, vscode.FileType][] {
        return entries.sort(([aName, aType], [bName, bType]) => {
            if (aType === bType) {
                return aName.localeCompare(bName);
            }
            return aType === vscode.FileType.Directory ? -1 : 1;
        });
    }

}


// FILE FILTERS


// excludes/includes files based on all .gitignore files in project

interface IFileFilter
{
    shouldInclude(fileUri: vscode.Uri): boolean;
}

class WorkspaceGitIgnoreFilter implements IFileFilter {
    private ignoreRules: Map<string, ReturnType<typeof ignore>> = new Map();

    private constructor(private rootPath: string) {}

    static async createAsync(workspaceUri: vscode.Uri): Promise<WorkspaceGitIgnoreFilter> {
        const filter = new WorkspaceGitIgnoreFilter(workspaceUri.fsPath);
        await filter.loadGitIgnoreRules(workspaceUri);
        return filter;
    }

    private async loadGitIgnoreRules(dirUri: vscode.Uri): Promise<void> {
        const entries = await vscode.workspace.fs.readDirectory(dirUri);
        
        for (const [name, type] of entries) {
            if (type === vscode.FileType.Directory) {
                // Recursively check subdirectories
                await this.loadGitIgnoreRules(vscode.Uri.joinPath(dirUri, name));
            } else if (name === '.gitignore') {
                // Found a .gitignore file, load its rules
                const gitignoreUri = vscode.Uri.joinPath(dirUri, name);
                const content = await FileSystemUtils.readFileAsync(gitignoreUri);
                const ig = ignore().add(content);
                this.ignoreRules.set(dirUri.fsPath, ig);
            }
        }
    }

    shouldInclude(fileUri: vscode.Uri): boolean
    {
        return !this.shouldIgnore(fileUri);
    }

    shouldIgnore(fileUri: vscode.Uri): boolean {
        let currentDir = path.dirname(fileUri.fsPath);
        let relativePath = path.basename(fileUri.fsPath);

        while (currentDir.length >= this.rootPath.length) {
            if (this.ignoreRules.has(currentDir)) {
                const ig = this.ignoreRules.get(currentDir)!;
                if (ig.ignores(relativePath)) {
                    return true;
                }
            }
            
            relativePath = path.join(path.basename(currentDir), relativePath);
            currentDir = path.dirname(currentDir);
        }

        return false;
    }
}

// excludes/includes files based on vscode settings.json
// also excludes .vscode/ folder
class VsCodeSettingsFilter implements IFileFilter {
    private includePatterns: string[] = [];
    private excludePatterns: string[] = [];

    private constructor(private rootPath: string) {}

    static async createAsync(workspaceUri: vscode.Uri): Promise<VsCodeSettingsFilter> {
        const filter = new VsCodeSettingsFilter(workspaceUri.fsPath);
        await filter.loadVsCodeSettings(workspaceUri);
        return filter;
    }

    
    private async loadVsCodeSettings(workspaceUri: vscode.Uri): Promise<void> {
        const settingsUri = vscode.Uri.joinPath(workspaceUri, '.vscode', 'settings.json');
        if (await FileSystemUtils.fileExistsAsync(settingsUri)) {
            const content = await vscode.workspace.fs.readFile(settingsUri);
            const settings = JSON.parse(content.toString());
            
            const filesExclude = settings['files.exclude'] || {};
            this.excludePatterns = Object.keys(filesExclude).filter(key => filesExclude[key]);
            
            const filesInclude = settings['files.include'] || {};
            this.includePatterns = Object.keys(filesInclude).filter(key => filesInclude[key]);

            //console.log('Exclude patterns:', this.excludePatterns);
            //console.log('Include patterns:', this.includePatterns);
        } 
        else 
        {
            this.excludePatterns = [];
            this.includePatterns = [];
        }
    }

    shouldInclude(fileUri: vscode.Uri): boolean {
        const relativePath = path.relative(this.rootPath, fileUri.fsPath).replace(/\\/g, '/');
        
        //console.log(`Testing file path: '${fileUri.fsPath}'`);
        //console.log(`Relative path: '${relativePath}'`);

        const isExcluded = this.excludePatterns.some(pattern => {
            const result = this.matchGlob(relativePath, pattern);
            //console.log(`Testing '${relativePath}' against exclude pattern '${pattern}': ${result}`);
            return result;
        });

        const isIncluded = this.includePatterns.length > 0 && this.includePatterns.some(pattern => {
            const result = this.matchGlob(relativePath, pattern);
            //console.log(`Testing '${relativePath}' against include pattern '${pattern}': ${result}`);
            return result;
        });

        const finalResult = !isExcluded || isIncluded;
        //console.log(`Final result for '${relativePath}': ${finalResult}`);
        return finalResult;
    }
    
    private matchGlob(filePath: string, pattern: string): boolean {
        const patternParts = pattern.split('/');
        const pathParts = filePath.split('/');

        let patternIndex = 0;
        let pathIndex = 0;

        while (patternIndex < patternParts.length && pathIndex < pathParts.length) {
            const patternPart = patternParts[patternIndex];
            const pathPart = pathParts[pathIndex];

            if (patternPart === '**') {
                // ** can match zero or more directories
                patternIndex++;
                if (patternIndex === patternParts.length) {
                    return true; // ** at the end matches everything
                }
                while (pathIndex < pathParts.length) {
                    if (this.matchGlob(pathParts.slice(pathIndex).join('/'), patternParts.slice(patternIndex).join('/'))) {
                        return true;
                    }
                    pathIndex++;
                }
                return false;
            } else if (patternPart === '*') {
                // * matches any string within a path segment
                patternIndex++;
                pathIndex++;
            } else if (patternPart === '?') {
                // ? matches any single character
                patternIndex++;
                pathIndex++;
            } else if (this.matchSimplePattern(pathPart, patternPart)) {
                patternIndex++;
                pathIndex++;
            } else {
                return false;
            }
        }

        // If we've reached the end of both the pattern and the path, it's a match
        return patternIndex === patternParts.length && pathIndex === pathParts.length;
    }

    private matchSimplePattern(str: string, pattern: string): boolean {
        let strIndex = 0;
        let patternIndex = 0;
        let lastWildcardIndex = -1;
        let lastMatchedIndex = -1;

        while (strIndex < str.length) {
            if (patternIndex < pattern.length && (pattern[patternIndex] === '?' || pattern[patternIndex] === str[strIndex])) {
                strIndex++;
                patternIndex++;
            } else if (patternIndex < pattern.length && pattern[patternIndex] === '*') {
                lastWildcardIndex = patternIndex;
                lastMatchedIndex = strIndex;
                patternIndex++;
            } else if (lastWildcardIndex !== -1) {
                patternIndex = lastWildcardIndex + 1;
                lastMatchedIndex++;
                strIndex = lastMatchedIndex;
            } else {
                return false;
            }
        }

        while (patternIndex < pattern.length && pattern[patternIndex] === '*') {
            patternIndex++;
        }

        return patternIndex === pattern.length;
    }
}

// excludes extension storage folder and contents
class ExtensionStorageFilter implements IFileFilter {
    constructor(private storageDirUri: vscode.Uri) {}

    shouldInclude(fileUri: vscode.Uri): boolean {
        return !fileUri.fsPath.startsWith(this.storageDirUri.fsPath);
    }
}


class WorkspaceFileContextFilter implements IFileFilter {

    private excludeFilter: GitIgnorer;
    private includeFilter: GitIgnorer;

    private constructor(
        private rootPath: string,
        excludePatterns: string[],
        includePatterns: string[]
    ) {
        this.excludeFilter = new GitIgnorer(excludePatterns);
        this.includeFilter = new GitIgnorer(includePatterns);
    }

    public static async createFileStructureFilterAsync(
        workspace: vscode.WorkspaceFolder
    ): Promise<WorkspaceFileContextFilter> {
        const excludeFilterUri = ExtensionUtils.getExtensionStoragePromptConfigFileUri(workspace, 'PROJECT_CONTEXT_STRUCTURE_EXCLUDE');
        const includeFilterUri = ExtensionUtils.getExtensionStoragePromptConfigFileUri(workspace, 'PROJECT_CONTEXT_STRUCTURE_INCLUDE');
        const excludePatterns = await this.readPatternsFromFileAsync(excludeFilterUri);
        const includePatterns = await this.readPatternsFromFileAsync(includeFilterUri);
        return new WorkspaceFileContextFilter(workspace.uri.fsPath, excludePatterns, includePatterns);
    }

    public static async createFileContentFilterAsync(
        workspace: vscode.WorkspaceFolder
    ): Promise<WorkspaceFileContextFilter> {
        const excludeFilterUri = ExtensionUtils.getExtensionStoragePromptConfigFileUri(workspace, 'PROJECT_CONTEXT_CONTENT_EXCLUDE');
        const includeFilterUri = ExtensionUtils.getExtensionStoragePromptConfigFileUri(workspace, 'PROJECT_CONTEXT_CONTENT_INCLUDE');
        const excludePatterns = await this.readPatternsFromFileAsync(excludeFilterUri);
        const includePatterns = await this.readPatternsFromFileAsync(includeFilterUri);
        return new WorkspaceFileContextFilter(workspace.uri.fsPath, excludePatterns, includePatterns);
    }

    private static async readPatternsFromFileAsync(fileUri: vscode.Uri): Promise<string[]> {
        try {
            const content = await vscode.workspace.fs.readFile(fileUri);
            return content.toString().split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'));
        } catch (error) {
            console.error(`Error reading patterns from ${fileUri.fsPath}:`, error);
            return [];
        }
    }

    shouldInclude(fileUri: vscode.Uri): boolean {
        const relativePath = path.relative(this.rootPath, fileUri.fsPath).replace(/\\/g, '/');
        
        const isExcluded = !this.excludeFilter.isEmpty() && this.excludeFilter.isIgnored(relativePath);
        const isIncluded = this.includeFilter.isEmpty() || this.includeFilter.isIgnored(relativePath);

        return !isExcluded || isIncluded;
    }
}

class GitIgnorer {
    private patterns: string[];

    constructor(patterns: string[]) {
        this.patterns = patterns;
    }

    isIgnored(filePath: string): boolean {
        return this.patterns.some(pattern => this.matchGitIgnorePattern(filePath, pattern));
    }

    isEmpty(): boolean {
        return this.patterns.length === 0;
    }

    private matchGitIgnorePattern(filePath: string, pattern: string): boolean {
        // Convert gitignore pattern to regex
        let regexPattern = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex characters
            .replace(/\*/g, '.*')                 // * matches any number of characters
            .replace(/\?/g, '.')                  // ? matches a single character
            .replace(/\//g, '\\/');               // / matches directory separator

        // Anchor the regex to the start of the string if it doesn't start with *
        if (!pattern.startsWith('*')) {
            regexPattern = '^' + regexPattern;
        }

        // If the pattern doesn't end with /, it should match files in subdirectories too
        if (!pattern.endsWith('/')) {
            regexPattern += '($|\\/.*)';
        }

        const regex = new RegExp(regexPattern);
        return regex.test(filePath);
    }
}
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
        const extensionStorageDirUri = ExtensionUtils.getExtensionStorageFolderUri(workspace);
        const outUri = ExtensionUtils.getExtensionStoragePromptContextFileUri(workspace, 'FILE_STRUCTURE');
        const gitIgnoreFilter = await GitIgnoreFilter.createAsync(workspace.uri);
        const vsCodeSettingsFilter = await VsCodeSettingsFilter.createAsync(workspace.uri);
        const extensionStorageFilter = new ExtensionStorageFilter(extensionStorageDirUri);

        const structure: string[] = [];
        await this.processFilesForStructureContextAsync(
            workspace.uri,
            '',
            structure,
            gitIgnoreFilter,
            vsCodeSettingsFilter,
            extensionStorageFilter,
            0,
            []
        );

        const fileStructure = `${workspace.name}\n${structure.join('\n')}`;
        await FileSystemUtils.writeFileAsync(outUri, fileStructure);

        return outUri;
    }

    public static async generateFileContentContextAsync(workspace: vscode.WorkspaceFolder): Promise<vscode.Uri> {
        const extensionStorageDirUri = ExtensionUtils.getExtensionStorageFolderUri(workspace);
        const outUri = ExtensionUtils.getExtensionStoragePromptContextFileUri(workspace, 'FILE_CONTENT');
        const gitIgnoreFilter = await GitIgnoreFilter.createAsync(workspace.uri);
        const vsCodeSettingsFilter = await VsCodeSettingsFilter.createAsync(workspace.uri);
        const extensionStorageFilter = new ExtensionStorageFilter(extensionStorageDirUri);

        const files: string[] = [];
        await this.processFilesForContentContextAsync(
            workspace.uri,
            '',
            files,
            gitIgnoreFilter,
            vsCodeSettingsFilter,
            extensionStorageFilter
        );

        const writeStream = FileSystemUtils.createWriteStream(outUri);

        for (const file of files) {
            const fileUri = vscode.Uri.joinPath(workspace.uri, file);
            const content = await FileSystemUtils.readFileAsync(fileUri);
            writeStream.write(`[FILE_START: ${file}]\n${content}\n[FILE_END: ${file}]\n\n`);
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


    private static async processFilesForStructureContextAsync(
        uri: vscode.Uri,
        relativePath: string,
        structure: string[],
        gitIgnoreFilter: GitIgnoreFilter,
        vsCodeSettingsFilter: VsCodeSettingsFilter,
        extensionStorageFilter: ExtensionStorageFilter,
        depth: number,
        isLastChild: boolean[]
    ): Promise<void> {
        const entries = await vscode.workspace.fs.readDirectory(uri);
        const sortedEntries = this.sortDirectoryEntries(entries);

        for (let i = 0; i < sortedEntries.length; i++) {
            const [name, type] = sortedEntries[i];
            const fullUri = vscode.Uri.joinPath(uri, name);
            const fullPath = path.join(relativePath, name);

            if (name === '.vscode') {
                continue;
            }

            const shouldIgnore = gitIgnoreFilter.shouldIgnore(fullUri.fsPath);
            const isIncludedVSCode = vsCodeSettingsFilter.shouldInclude(fullUri.fsPath);
            const isIncludedExtStorage = extensionStorageFilter.shouldInclude(fullUri);

            if (!shouldIgnore && isIncludedVSCode && isIncludedExtStorage) {
                const isLast = i === sortedEntries.length - 1;
                const prefix = this.getFileStructureLinePrefix(isLastChild);
                const connector = isLast ? '└── ' : '├── ';

                if (type === vscode.FileType.Directory) {
                    structure.push(`${prefix}${connector}${name}/`);
                    await this.processFilesForStructureContextAsync(
                        fullUri, 
                        fullPath, 
                        structure, 
                        gitIgnoreFilter, 
                        vsCodeSettingsFilter, 
                        extensionStorageFilter,
                        depth + 1,
                        [...isLastChild, isLast]
                    );
                } else {
                    structure.push(`${prefix}${connector}${name}`);
                }
            }
        }
    }

    private static async processFilesForContentContextAsync(
        uri: vscode.Uri,
        relativePath: string,
        files: string[],
        gitIgnoreFilter: GitIgnoreFilter,
        vsCodeSettingsFilter: VsCodeSettingsFilter,
        extensionStorageFilter: ExtensionStorageFilter
    ): Promise<void> {
        const entries = await vscode.workspace.fs.readDirectory(uri);
        const sortedEntries = this.sortDirectoryEntries(entries);

        for (const [name, type] of sortedEntries) {
            const fullUri = vscode.Uri.joinPath(uri, name);
            const fullPath = path.join(relativePath, name);

            if (name === '.vscode') {
                continue;
            }

            const shouldIgnore = gitIgnoreFilter.shouldIgnore(fullUri.fsPath);
            const isIncludedVSCode = vsCodeSettingsFilter.shouldInclude(fullUri.fsPath);
            const isIncludedExtStorage = extensionStorageFilter.shouldInclude(fullUri);

            if (!shouldIgnore && isIncludedVSCode && isIncludedExtStorage) {
                if (type === vscode.FileType.Directory) {
                    await this.processFilesForContentContextAsync(
                        fullUri, 
                        fullPath, 
                        files, 
                        gitIgnoreFilter, 
                        vsCodeSettingsFilter, 
                        extensionStorageFilter
                    );
                } else if (type === vscode.FileType.File) {
                    files.push(fullPath);
                }
            }
        }
    }


    private static getFileStructureLinePrefix(isLastChild: boolean[]): string {
        let prefix = '';
        for (let i = 0; i < isLastChild.length; i++) {
            prefix += isLastChild[i] ? '    ' : '│   ';
        }
        return prefix;
    }


    private static getPromptContextFileUri(workspace: vscode.WorkspaceFolder, fileKey: PromptContextFileKey): vscode.Uri {
        const fileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONTEXT_DIR.FILES[fileKey].fileName;
        return vscode.Uri.joinPath(workspace.uri, EXTENSION_STORAGE.STORAGE_FOLDER_NAME_FALLBACK, EXTENSION_STORAGE.STRUCTURE.PROMPT_CONTEXT_DIR.NAME, fileName);
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
class GitIgnoreFilter {
    private ignoreRules: Map<string, ReturnType<typeof ignore>> = new Map();

    private constructor(private rootPath: string) {}

    static async createAsync(workspaceUri: vscode.Uri): Promise<GitIgnoreFilter> {
        const filter = new GitIgnoreFilter(workspaceUri.fsPath);
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
                const content = await vscode.workspace.fs.readFile(gitignoreUri);
                const ig = ignore().add(content.toString());
                this.ignoreRules.set(dirUri.fsPath, ig);
            }
        }
    }

    shouldIgnore(filePath: string): boolean {
        let currentDir = path.dirname(filePath);
        let relativePath = path.basename(filePath);

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
class VsCodeSettingsFilter {
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
        try {
            const content = await vscode.workspace.fs.readFile(settingsUri);
            const settings = JSON.parse(content.toString());
            
            const filesExclude = settings['files.exclude'] || {};
            this.excludePatterns = Object.keys(filesExclude).filter(key => filesExclude[key]);
            
            const filesInclude = settings['files.include'] || {};
            this.includePatterns = Object.keys(filesInclude).filter(key => filesInclude[key]);
        } catch (error) {
            // If settings.json doesn't exist or is invalid, we use empty arrays
        }
    }

    shouldInclude(filePath: string): boolean {
        const relativePath = path.relative(this.rootPath, filePath).replace(/\\/g, '/');
        
        if (relativePath.startsWith('.vscode/')) {
            return false;
        }

        const isExcluded = this.excludePatterns.some(pattern => 
            new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$').test(relativePath)
        );

        const isIncluded = this.includePatterns.length === 0 || this.includePatterns.some(pattern => 
            new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$').test(relativePath)
        );

        return !isExcluded && isIncluded;
    }
}

// excludes extension storage folder and contents
class ExtensionStorageFilter {
    constructor(private storageDirUri: vscode.Uri) {}

    shouldInclude(fileUri: vscode.Uri): boolean {
        return !fileUri.fsPath.startsWith(this.storageDirUri.fsPath);
    }
}


// add ExtensionFileStructureContextFilter
// add ExtensionFileContentContextFilter

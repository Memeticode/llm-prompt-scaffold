
import * as vscode from 'vscode';
import * as path from 'path';
import { FileSystemUtils } from '../../shared/utility/fileSystemUtils';
import { IFileFlagger, CompositeFlagger, FileFlaggerFactory } from '../../shared/utility/fileFlaggers';
import { EXTENSION_STORAGE } from '../../constants/extensionStorage';

export class PromptContextFileGenerator {
    
    static async writeFromConfigFileAsync(outUri: vscode.Uri, sourceUri: vscode.Uri): Promise<void> {
        const content = await FileSystemUtils.readFileAsync(sourceUri);
        const filteredContent = content.split('\n')
            .filter(line => !line.trim().startsWith('#'))
            .join('\n')
            .trim();
        await FileSystemUtils.writeFileAsync(outUri, filteredContent);
    }

    static async writeFileStructureAsync(outUri: vscode.Uri, workspace: vscode.WorkspaceFolder): Promise<void> {
        const flagger = await this.createStructureFlaggerAsync(workspace);
        const content = await FileContentHelper.writeFileStructureContentAsync(workspace, flagger);
        await FileSystemUtils.writeFileAsync(outUri, content);
    }

    static async writeFileContentAsync(outUri: vscode.Uri, workspace: vscode.WorkspaceFolder): Promise<void> {
        const gitignoreFlagger = await FileFlaggerFactory.createCompositeGitIgnoreFlaggerAsync(workspace);
        const vscodeSettingsFlagger = await FileFlaggerFactory.createVscodeSettingsFlaggerAsync(workspace);
        const structureFlagger = await this.createStructureFlaggerAsync(workspace);
        const contentFlagger = await this.createContentFlaggerAsync(workspace);

        // Combine flaggers
        const combinedFlagger: IFileFlagger = {
            loadRulesAsync: async () => {
                await gitignoreFlagger.loadRulesAsync();
                await vscodeSettingsFlagger.loadRulesAsync();
                await structureFlagger.loadRulesAsync();
                await contentFlagger.loadRulesAsync();
            },
            isFlaggedAsync: async (uri: vscode.Uri) => {
                return (await gitignoreFlagger.isFlaggedAsync(uri)) &&
                       (await vscodeSettingsFlagger.isFlaggedAsync(uri)) &&
                       (await structureFlagger.isFlaggedAsync(uri))&&
                       (await contentFlagger.isFlaggedAsync(uri));
            }
        };

        // Generate content
        const content = await FileContentHelper.writeFileStructureContentAsync(workspace, combinedFlagger);
        await FileSystemUtils.writeFileAsync(outUri, content);
    }

    private static async createStructureFlaggerAsync(workspace: vscode.WorkspaceFolder): Promise<IFileFlagger> {
        
        const gitignoreFlagger = await FileFlaggerFactory.createCompositeGitIgnoreFlaggerAsync(workspace);
        const vscodeSettingsFlagger = await FileFlaggerFactory.createVscodeSettingsFlaggerAsync(workspace);

        const includeFileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES.PROJECT_CONTEXT_STRUCTURE_INCLUDE.fileName;
        const excludeFileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES.PROJECT_CONTEXT_STRUCTURE_EXCLUDE.fileName;
        const structureFlagger = await FileFlaggerFactory.createExcludeIncludeGitignoreFlaggerAsync(workspace, excludeFileName, includeFileName);
        const flaggers = [
            gitignoreFlagger
            , vscodeSettingsFlagger
            // , structureFlagger
        ];
        // create composite flagger & load rules 
        const flagger = await FileFlaggerFactory.createCompositeFlaggerAsync(flaggers, true);
        return flagger;
    }

    private static async createContentFlaggerAsync(workspace: vscode.WorkspaceFolder): Promise<IFileFlagger> {
        return await this.createStructureFlaggerAsync(workspace);

    }
}

class FileContentHelper {
    
    
    static async writeFileStructureContentAsync(workspace: vscode.WorkspaceFolder, filter: IFileFlagger): Promise<string> {
        const structure: string[] = [];
        await this.buildFileStructureTextArrayAsync(workspace.uri, filter, structure, [], workspace.name);
        return structure.join('\n');
    }

    private static async buildFileStructureTextArrayAsync(
        uri: vscode.Uri,
        filter: IFileFlagger,
        structure: string[],
        isLastChild: boolean[],
        workspaceName: string
    ): Promise<void> {
        const entries = await FileSystemUtils.getDirectoryContentsAsync(uri);
        const sortedEntries = this.sortEntries(entries);

        if (isLastChild.length === 0) {
            // We're at the root level (workspace)
            structure.push(`${workspaceName}/`);
        }

        for (let i = 0; i < sortedEntries.length; i++) {
            const [name, type] = sortedEntries[i];
            const fullUri = vscode.Uri.joinPath(uri, name);
            const isFlagged = await filter.isFlaggedAsync(fullUri);

            if (isFlagged) {
                const isLast = i === sortedEntries.length - 1;
                const prefix = isLastChild.length === 0 ? (isLast ? '└── ' : '├── ') : 
                               isLast ? '└── ' : '├── ';
                const indent = isLastChild.map(last => last ? '    ' : '│   ').join('');

                if (type === vscode.FileType.Directory) {
                    structure.push(`${indent}${prefix}${name}/`);
                    await this.buildFileStructureTextArrayAsync(
                        fullUri,
                        filter,
                        structure,
                        [...isLastChild, isLast],
                        workspaceName
                    );
                } else {
                    structure.push(`${indent}${prefix}${name}`);
                }
            }
        }
    }

    private static sortEntries(entries: [string, vscode.FileType][]): [string, vscode.FileType][] {
        return entries.sort(([aName, aType], [bName, bType]) => {
            if (aType === bType) {
                return aName.localeCompare(bName);
            }
            return aType === vscode.FileType.Directory ? -1 : 1;
        });
    }
    static async getFileContent(rootUri: vscode.Uri, structureFilter: IFileFlagger, contentFilter: IFileFlagger): Promise<string> {
        const content: string[] = [];
        await this.buildFileContent(rootUri, '', structureFilter, contentFilter, content);
        return content.join('\n\n');
    }

    private static async buildFileContent(uri: vscode.Uri, relativePath: string, structureFilter: IFileFlagger, contentFilter: IFileFlagger, content: string[]): Promise<void> {
        const entries = await FileSystemUtils.getDirectoryContentsAsync(uri);
        for (const [name, type] of entries) {
            const newPath = relativePath ? `${relativePath}/${name}` : name;
            const fullUri = vscode.Uri.joinPath(uri, name);
            if (await structureFilter.isFlaggedAsync(fullUri)) {
                if (type === vscode.FileType.File && await contentFilter.isFlaggedAsync(fullUri)) {
                    const fileContent = await FileSystemUtils.readFileAsync(fullUri);
                    content.push(`File: ${newPath}\n\n${fileContent}`);
                } else if (type === vscode.FileType.Directory) {
                    await this.buildFileContent(fullUri, newPath, structureFilter, contentFilter, content);
                }
            }
        }
    }
}



export class FileStructureFlagger implements IFileFlagger {
    private compositeFlagger: CompositeFlagger;

    constructor(
        private workspace: vscode.WorkspaceFolder,
        private gitIgnoreFlagger: IFileFlagger,
        private vscodeSettingsFlagger: IFileFlagger,
        private promptConfigurationFlagger: IFileFlagger
    ) {
        this.compositeFlagger = new CompositeFlagger(CompositeLogic.AND);
        this.compositeFlagger.addFlagger(gitIgnoreFlagger);
        this.compositeFlagger.addFlagger(vscodeSettingsFlagger);
        this.compositeFlagger.addFlagger(promptConfigurationFlagger);
    }

    async loadRulesAsync(): Promise<void> {
        await this.compositeFlagger.loadRulesAsync();
    }

    async isFlaggedAsync(uri: vscode.Uri): Promise<boolean> {
        return this.compositeFlagger.isFlaggedAsync(uri);
    }

    static async create(workspace: vscode.WorkspaceFolder): Promise<FileStructureFlagger> {
        const gitIgnoreFlagger = await FileFlaggerFactory.createCompositeGitIgnoreFlaggerAsync(workspace, true);
        const vscodeSettingsFlagger = await FileFlaggerFactory.createVscodeSettingsFlaggerAsync(workspace, true);
        const promptConfigurationFlagger = await FileStructureFlagger.createPromptConfigurationFlagger(workspace);

        return new FileStructureFlagger(
            workspace,
            gitIgnoreFlagger,
            vscodeSettingsFlagger,
            promptConfigurationFlagger
        );
    }

    private static async createPromptConfigurationFlagger(workspace: vscode.WorkspaceFolder): Promise<IFileFlagger> {
        // Implement this method based on your prompt configuration logic
        // This might involve reading from specific configuration files in your extension's storage
        // and creating a flagger based on those settings
        // For now, I'll provide a placeholder implementation
        return {
            loadRulesAsync: async () => {},
            isFlaggedAsync: async (uri: vscode.Uri) => true // Flag everything by default
        };
    }
}

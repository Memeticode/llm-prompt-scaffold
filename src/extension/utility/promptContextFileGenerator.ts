
import * as vscode from 'vscode';
import { FileSystemUtils } from '../../shared/utility/fileSystemUtils';
import { IFileFlagger, FileFlaggerFactory } from '../../shared/utility/fileFlaggers';
import { EXTENSION_STORAGE } from '../../constants/extensionStorage';

export class PromptContextFileGenerator {
    
    static async writeFromConfigFileAsync(outUri: vscode.Uri, sourceUri: vscode.Uri): Promise<void> {
        const content = await FileSystemUtils.readFileAsync(sourceUri);
        const filteredContent = content.split('\n')
            .filter(line => !line.trim().startsWith('#'))
            .join('\n');
        await FileSystemUtils.writeFileAsync(outUri, filteredContent);
    }

    static async writeFileStructureAsync(outUri: vscode.Uri, workspace: vscode.WorkspaceFolder): Promise<void> {
        const filter = await FileFilterHelper.createStructureFilter(workspace);
        const content = await FileContentHelper.getFileStructure(workspace.uri, filter);
        await FileSystemUtils.writeFileAsync(outUri, content);
    }

    static async writeFileContentAsync(outUri: vscode.Uri, workspace: vscode.WorkspaceFolder): Promise<void> {
        const structureFilter = await FileFilterHelper.createStructureFilter(workspace);
        const contentFilter = await FileFilterHelper.createContentFilter(workspace);
        const content = await FileContentHelper.getFileContent(workspace.uri, structureFilter, contentFilter);
        await FileSystemUtils.writeFileAsync(outUri, content);
    }
}

class FileFilterHelper {
    static async createStructureFilter(workspace: vscode.WorkspaceFolder): Promise<IFileFlagger> {
        const includeFileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES.PROJECT_CONTEXT_STRUCTURE_INCLUDE.fileName;
        const excludeFileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES.PROJECT_CONTEXT_STRUCTURE_EXCLUDE.fileName;
        return FileFlaggerFactory.createExcludeIncludeFlagger(workspace, includeFileName, excludeFileName);
    }

    static async createContentFilter(workspace: vscode.WorkspaceFolder): Promise<IFileFlagger> {
        const includeFileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES.PROJECT_CONTEXT_CONTENT_INCLUDE.fileName;
        const excludeFileName = EXTENSION_STORAGE.STRUCTURE.PROMPT_CONFIG_DIR.FILES.PROJECT_CONTEXT_CONTENT_EXCLUDE.fileName;
        return FileFlaggerFactory.createExcludeIncludeFlagger(workspace, includeFileName, excludeFileName);
    }
}

class FileContentHelper {
    
    static async getFileStructure(rootUri: vscode.Uri, filter: IFileFlagger): Promise<string> {
        // rewrite this to build the structure more robustly, in a way which an llm might use to communicate a repository structure  
        const structure: string[] = [];
        await this.buildFileStructure(rootUri, '', filter, structure);
        return structure.join('\n');
    }

    private static async buildFileStructure(uri: vscode.Uri, relativePath: string, filter: IFileFlagger, structure: string[]): Promise<void> {
        const entries = await FileSystemUtils.getDirectoryContentsAsync(uri);
        for (const [name, type] of entries) {
            const newPath = relativePath ? `${relativePath}/${name}` : name;
            const fullUri = vscode.Uri.joinPath(uri, name);
            if (await filter.isFlaggedAsync(fullUri)) {
                structure.push(newPath);
                if (type === vscode.FileType.Directory) {
                    await this.buildFileStructure(fullUri, newPath, filter, structure);
                }
            }
        }
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
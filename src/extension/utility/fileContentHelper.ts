
import * as vscode from 'vscode';
import { FileFilter } from '../../shared/utility/fileFilters';
import { FileSystemUtils } from '../../shared/utility/fileSystemUtils';

export class FileContentHelper {
    
    static async getFileStructure(rootUri: vscode.Uri, filter: FileFilter): Promise<string> {
        const structure: string[] = [];
        await this.buildFileStructure(rootUri, '', filter, structure);
        return structure.join('\n');
    }

    private static async buildFileStructure(uri: vscode.Uri, relativePath: string, filter: FileFilter, structure: string[]): Promise<void> {
        const entries = await FileSystemUtils.getDirectoryContentsAsync(uri);
        for (const [name, type] of entries) {
            const newPath = relativePath ? `${relativePath}/${name}` : name;
            const fullUri = vscode.Uri.joinPath(uri, name);
            if (await filter.shouldIncludeAsync(fullUri)) {
                structure.push(newPath);
                if (type === vscode.FileType.Directory) {
                    await this.buildFileStructure(fullUri, newPath, filter, structure);
                }
            }
        }
    }

    static async getFileContent(rootUri: vscode.Uri, structureFilter: FileFilter, contentFilter: FileFilter): Promise<string> {
        const content: string[] = [];
        await this.buildFileContent(rootUri, '', structureFilter, contentFilter, content);
        return content.join('\n\n');
    }

    private static async buildFileContent(uri: vscode.Uri, relativePath: string, structureFilter: FileFilter, contentFilter: FileFilter, content: string[]): Promise<void> {
        const entries = await FileSystemUtils.getDirectoryContentsAsync(uri);
        for (const [name, type] of entries) {
            const newPath = relativePath ? `${relativePath}/${name}` : name;
            const fullUri = vscode.Uri.joinPath(uri, name);
            if (await structureFilter.shouldIncludeAsync(fullUri)) {
                if (type === vscode.FileType.File && await contentFilter.shouldIncludeAsync(fullUri)) {
                    const fileContent = await FileSystemUtils.readFileAsync(fullUri);
                    content.push(`File: ${newPath}\n\n${fileContent}`);
                } else if (type === vscode.FileType.Directory) {
                    await this.buildFileContent(fullUri, newPath, structureFilter, contentFilter, content);
                }
            }
        }
    }
}
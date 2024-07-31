import * as vscode from 'vscode';
import { FileFilter } from '../utils/fileFilters';

export class FileSystemUtils {
    static async getFileTypeAsync(uri: vscode.Uri): Promise<vscode.FileType> {
        const stat = await vscode.workspace.fs.stat(uri);
        return stat.type;
    }

    static async fileExistsAsync(uri: vscode.Uri): Promise<boolean> {
        try {
            await vscode.workspace.fs.stat(uri);
            return true;
        } catch (error) {
            if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                return false;
            }
            throw error;
        }
    }

    static async readFileAsync(uri: vscode.Uri): Promise<string> {
        const fileContent = await vscode.workspace.fs.readFile(uri);
        return Buffer.from(fileContent).toString('utf8');
    }

    static async readFileIfExistsAsync(uri: vscode.Uri): Promise<string | null> {
        try {
            const fileContent = await vscode.workspace.fs.readFile(uri);
            const content = Buffer.from(fileContent).toString('utf8');
            return content.trim() !== '' ? content : null;
        } catch (error) {
            if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                return null;
            }
            throw error;
        }
    }
    
    static async readFileIfExistsSkipHashtagLinesAsync(uri: vscode.Uri): Promise<string | null> {           
        const content = await this.readFileIfExistsAsync(uri);
        if (content)
        {
            return content.split('\n')
                .filter(line => !line.trim().startsWith('#'))
                .join('\n');    
        }
        else
        {
            return content;
        }
    }

    static async deleteFileAsync(uri: vscode.Uri): Promise<void> {
        await vscode.workspace.fs.delete(uri);
    }

    static async writeFileAsync(uri: vscode.Uri, content: string): Promise<void> {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
    }

    static async appendToFileAsync(uri: vscode.Uri, content: string): Promise<void> {
        const existingContent = await this.readFileIfExistsAsync(uri) || '';
        const newContent = existingContent + content;
        await this.writeFileAsync(uri, newContent);
    }

    static async copyFileAsync(source: vscode.Uri, target: vscode.Uri, options?: { overwrite: boolean }): Promise<void> {
        await vscode.workspace.fs.copy(source, target, options);
    }

    static async moveFileAsync(source: vscode.Uri, target: vscode.Uri, options?: { overwrite: boolean }): Promise<void> {
        await vscode.workspace.fs.rename(source, target, options);
    }

    static async directoryExistsAsync(uri: vscode.Uri): Promise<boolean> {
        try {
            const stat = await vscode.workspace.fs.stat(uri);
            return stat.type === vscode.FileType.Directory;
        } catch (error) {
            if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                return false;
            }
            throw error;
        }
    }

    static async getDirectoryContentsAsync(uri: vscode.Uri, filters?: FileFilter | FileFilter[]): Promise<[string, vscode.FileType][]> {
        const entries = await vscode.workspace.fs.readDirectory(uri);
        if (!filters) {
            return entries;
        }

        const filterArray = Array.isArray(filters) ? filters : [filters];
        const filteredEntries = [];

        for (const entry of entries) {
            const entryUri = vscode.Uri.joinPath(uri, entry[0]);
            if (await this.shouldIncludeFile(entryUri, filterArray)) {
                filteredEntries.push(entry);
            }
        }

        return filteredEntries;
    }

    private static async shouldIncludeFile(uri: vscode.Uri, filters: FileFilter[]): Promise<boolean> {
        for (const filter of filters) {
            if (!(await filter.shouldInclude(uri))) {
                return false;
            }
        }
        return true;
    }

    static async deleteDirectoryAsync(uri: vscode.Uri, options?: { recursive: boolean; useTrash: boolean }): Promise<void> {
        await vscode.workspace.fs.delete(uri, options);
    }

    static async createDirectoryAsync(uri: vscode.Uri): Promise<void> {
        await vscode.workspace.fs.createDirectory(uri);
    }

    static async createDirectoryIfNotExistsAsync(uri: vscode.Uri): Promise<void> {
        try {
            await vscode.workspace.fs.stat(uri);
        } catch (error) {
            if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                await vscode.workspace.fs.createDirectory(uri);
            } else {
                throw error;
            }
        }
    }

    static async copyDirectoryAsync(source: vscode.Uri, target: vscode.Uri, options?: { overwrite: boolean }): Promise<void> {
        await this.recursiveCopy(source, target, options);
    }

    private static async recursiveCopy(source: vscode.Uri, target: vscode.Uri, options?: { overwrite: boolean }): Promise<void> {
        const stat = await vscode.workspace.fs.stat(source);
        if (stat.type === vscode.FileType.Directory) {
            await vscode.workspace.fs.createDirectory(target);
            const entries = await vscode.workspace.fs.readDirectory(source);
            for (const [name, type] of entries) {
                await this.recursiveCopy(vscode.Uri.joinPath(source, name), vscode.Uri.joinPath(target, name), options);
            }
        } else {
            await vscode.workspace.fs.copy(source, target, options);
        }
    }
    static async moveDirectoryAsync(source: vscode.Uri, target: vscode.Uri, options?: { overwrite: boolean }): Promise<void> {
        try {
            await vscode.workspace.fs.rename(source, target, options);
            
            // Check if the source still exists after the move
            try {
                await vscode.workspace.fs.stat(source);
                // If we get here, the source still exists
                console.log(`Source directory still exists after move: ${source.fsPath}`);
                
                // Attempt to delete the source
                await vscode.workspace.fs.delete(source, { recursive: true });
                console.log(`Deleted source directory after move: ${source.fsPath}`);
            } catch (statError) {
                // If stat throws an error, the source doesn't exist, which is what we want
                console.log(`Source directory successfully moved and no longer exists: ${source.fsPath}`);
            }
        } catch (error) {
            console.error(`Error moving directory from ${source.fsPath} to ${target.fsPath}: ${error}`);
            throw error;
        }
    }
}
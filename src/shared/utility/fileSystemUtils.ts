import * as vscode from 'vscode';
import * as fs from 'fs';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';

export class FileSystemUtils {

    private static normalizeLineEndings(content: string): string {
        return content.replace(/\r\n|\r|\n/g, '\n');
    }
    private static createNormalizingStream(): Transform {
        return new Transform({
            transform(chunk: Buffer, _: BufferEncoding, callback: Function) {
                const normalizedChunk = chunk.toString().replace(/\r\n|\r|\n/g, '\n');
                this.push(Buffer.from(normalizedChunk));
                callback();
            }
        });
    }

    // FILE INFO 
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

    static async fileIsNotEmptyAsync(uri: vscode.Uri): Promise<boolean> {
        try {
            const stat = await vscode.workspace.fs.stat(uri);
            return stat.size > 0;
        } catch (error) {
            if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                return false;
            }
            throw error;
        }
    }

    static async getFileSizeFormattedAsync(fileUri: vscode.Uri): Promise<string> {
        try {
            const fileStat = await vscode.workspace.fs.stat(fileUri);
            if (fileStat) {
                return this.formatFileSize(fileStat.size);
            }
            return '-- KB';
        } catch (error) {
            if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                return 'DNE';
            }
            throw error;
        }
    }

    private static formatFileSize(bytes: number): string {
        const units = ['KB', 'MB', 'GB', 'TB'];
        if (bytes < 1024) {
            return '< 1 KB';
        }
        
        let size = bytes / 1024; // Start with KB
        let unitIndex = 0;
    
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
    
        // Convert to string with 1 decimal place and remove trailing zero
        const sizeStr = size.toFixed(1).replace(/\.0$/, '');
    
        return `${sizeStr} ${units[unitIndex]}`;
    }

    // READ FILE
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

    // DELETE / EDIT FILE
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

    // STREAMS

    static async streamFileContentAsync(
        targetUri: vscode.Uri,
        sourceUri: vscode.Uri,
        options: {
            transform?: (line: string) => string | null,
            trimEmptyLines?: boolean
        } = {}
    ): Promise<void> {
        const { transform, trimEmptyLines = false } = options;

        const readStream = fs.createReadStream(sourceUri.fsPath, { encoding: 'utf8' });
        const writeStream = fs.createWriteStream(targetUri.fsPath, { encoding: 'utf8' });

        const transformStream = new Transform({
            objectMode: true,
            transform(chunk: string, encoding: string, callback: Function) {
                const lines = chunk.split(/\r?\n/);
                for (let line of lines) {
                    if (transform) {
                        const transformedLine = transform(line);
                        if (transformedLine === null) { continue; }
                        line = transformedLine;
                    }
                    if (trimEmptyLines && line.trim() === '') { continue; }
                    this.push(line + '\n');
                }
                callback();
            }
        });

        await pipeline(readStream, transformStream, writeStream);
    }


    static createReadStream(uri: vscode.Uri): fs.ReadStream {
        return fs.createReadStream(uri.fsPath);
    }

    static createWriteStream(uri: vscode.Uri): fs.WriteStream {
        return fs.createWriteStream(uri.fsPath, { encoding: 'utf-8'});
    }

    static async appendFileContentAsync(
        targetUri: vscode.Uri,
        sourceUri: vscode.Uri,
        options: {
            header?: string,
            trailer?: string,
            append?: boolean
        } = {}
    ): Promise<void> {
        const { header, trailer, append = true } = options;
        const outputStream = fs.createWriteStream(targetUri.fsPath, { flags: append ? 'a' : 'w' });

        if (header) {
            outputStream.write(`${append ? '\n' : ''}${header}\n`);
        }

        const inputStream = fs.createReadStream(sourceUri.fsPath);
        const transformStream = new Transform({
            transform(chunk, _, callback) {
                callback(null, chunk);
            }
        });

        await pipeline(inputStream, transformStream, outputStream, { end: false });

        if (trailer) {
            outputStream.write(`\n${trailer}\n`);
        }

        outputStream.end();
    }

    static async isFileNotEmptyAsync(uri: vscode.Uri): Promise<boolean> {
        try {
            const stat = await vscode.workspace.fs.stat(uri);
            return stat.size > 0;
        } catch (error) {
            if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                return false;
            }
            throw error;
        }
    }

    static async writeStreamAsync(uri: vscode.Uri, content: string): Promise<void> {
        const writeStream = fs.createWriteStream(uri.fsPath);
        return new Promise((resolve, reject) => {
            writeStream.write(content, (error) => {
                if (error) {
                    reject(error);
                } else {
                    writeStream.end(resolve);
                }
            });
        });
    }

    static async appendStreamAsync(uri: vscode.Uri, content: string): Promise<void> {
        const writeStream = fs.createWriteStream(uri.fsPath, { flags: 'a' });
        return new Promise((resolve, reject) => {
            writeStream.write(content, (error) => {
                if (error) {
                    reject(error);
                } else {
                    writeStream.end(resolve);
                }
            });
        });
    }

    // DIRECTORY OPS
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
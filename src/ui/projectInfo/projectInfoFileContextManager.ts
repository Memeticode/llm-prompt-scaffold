// FileContextManager.ts

import * as vscode from 'vscode';
import * as path from 'path';
import { FileManager } from '../../utils/fileManager';
import { ProjectInfoItem, ProjectInfoItemType } from './definitions';
import { ConfigurationManager } from '../../utils/configurationManager';

export class ProjectInfoFileContextManager {
    constructor(
        private outputChannel: vscode.OutputChannel,
        private fileManager: FileManager,
        private configManager: ConfigurationManager
    ) {}

    async getCurrentFileContextItems(): Promise<string[]> {
        try {
            const files = await this.fileManager.getAllContextFiles();
            //this.outputChannel.appendLine(`Got ${files.length} context files`);
            //for (const f of files) { this.outputChannel.appendLine(f); }
            return files;
        } catch (error) {
            this.outputChannel.appendLine(`Error getting file context items: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return [];
        }
    }

    buildFileContextItems(contextFiles: string[]): ProjectInfoItem[] {
        const items: ProjectInfoItem[] = [];
        const processedDirs = new Set<string>();
        const workspaceRoot = this.configManager.getSystemPath();
        for (const filePath of contextFiles) {
            const relativePath = path.relative(workspaceRoot, filePath);
            const parts = relativePath.split(path.sep);
    
            let currentPath = '';
            for (let i = 0; i < parts.length; i++) {
                currentPath = path.join(currentPath, parts[i]);
                
                if (i === parts.length - 1) {
                    // This is a file
                    items.push(this.createFileItem(filePath, relativePath));
                } else {
                    // This is a directory
                    if (!processedDirs.has(currentPath)) {
                        items.push(this.createDirectoryItem(currentPath));
                        processedDirs.add(currentPath);
                    }
                }
            }
        }
    
        return items;
    }

    private createDirectoryItem(dirPath: string): ProjectInfoItem {
        const workspaceRoot = this.configManager.getSystemPath();
        return new ProjectInfoItem(
            {
                label: path.basename(dirPath),
                contextValue: dirPath,
                itemType: ProjectInfoItemType.FileContextItem,
                tooltip: dirPath
            },
            vscode.Uri.file(path.join(workspaceRoot, dirPath)),
            true,
            vscode.TreeItemCollapsibleState.Collapsed
        );
    }
    
    private createFileItem(filePath: string, relativePath: string): ProjectInfoItem {
        return new ProjectInfoItem(
            {
                label: path.basename(filePath),
                contextValue: relativePath,
                itemType: ProjectInfoItemType.FileContextItem,
                tooltip: relativePath
            },
            vscode.Uri.file(filePath),
            true,
            vscode.TreeItemCollapsibleState.None
        );
    }

    async refreshFileContextItems(): Promise<ProjectInfoItem[]> {
        //this.outputChannel.appendLine('Refreshing File Context Items');

        const contextFiles = await this.getCurrentFileContextItems();
        //this.outputChannel.appendLine(`Got ${contextFiles.length} context files`);
        
        const fileContextItems = this.buildFileContextItems(contextFiles);
        //this.outputChannel.appendLine(`Built ${fileContextItems.length} tree items`);

        return fileContextItems;
    }

    dispose() { }
}
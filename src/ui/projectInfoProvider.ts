import * as vscode from 'vscode';
import * as path from 'path';

import { ConfigurationManager } from '../utils/configurationManager';
import { FileManager } from '../utils/fileManager';

import { ProjectInfoItemType, ProjectInfoItemDefinition, ProjectInfoItem } from './projectInfo/definitions';
import { ProjectInfoFileContextManager } from './projectInfo/projectInfoFileContextManager';
import { ProjectInfoFileItemManager } from './projectInfo/projectInfoFileItemManager';



export class ProjectInfoProvider implements vscode.TreeDataProvider<ProjectInfoItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ProjectInfoItem | undefined | null | void> = new vscode.EventEmitter<ProjectInfoItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ProjectInfoItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private watcher: vscode.FileSystemWatcher;

    private projectInfoFileContextManager: ProjectInfoFileContextManager;
    private projectInfoFileItemManager: ProjectInfoFileItemManager;

    private treeCache: Map<string, ProjectInfoItem[]> = new Map();
    private fileContextItems: ProjectInfoItem[] = [];


    private currentContextItem: ProjectInfoItem | undefined;


    constructor(
        private outputChannel: vscode.OutputChannel,
        private itemsDefinition: ProjectInfoItemDefinition[],
        private configManager: ConfigurationManager,
        private fileManager: FileManager 
    ) {
        this.watcher = vscode.workspace.createFileSystemWatcher('**/*');
        this.watcher.onDidChange((uri) => this.handleFileChange(uri));
        this.watcher.onDidCreate((uri) => this.handleFileChange(uri));
        this.watcher.onDidDelete((uri) => this.handleFileChange(uri));

        this.projectInfoFileContextManager = new ProjectInfoFileContextManager(
            this.outputChannel,
            this.fileManager,
            this.configManager
        );

        this.projectInfoFileItemManager = new ProjectInfoFileItemManager(
            this.outputChannel,
            this.configManager,
            this.fileManager,
        );

        this.projectInfoFileItemManager.onDidChangeFileStatus(this.handleFileStatusChange);

    }



    // does not work, try starting w/ all files open
    // or hardcoding a state toggle
    private handleButtonClick(buttonId: string) {
        this.outputChannel.appendLine(`Project Configuration Button clicked: ${buttonId}`);
        switch (buttonId) {
            case 'currentFileContextExpandAll':
                this.currentFileContextExpandAll();
                break;
            case 'currentFileContextCollapseAll':
                this.currentFileContextCollapseAll();
                break;
            // Add more cases for other buttons
            default:
        }
    }

    private currentFileContextExpandAll() {
        this.setFileContextExpandState(vscode.TreeItemCollapsibleState.Expanded);
    }

    private currentFileContextCollapseAll() {
        this.setFileContextExpandState(vscode.TreeItemCollapsibleState.Collapsed);
    }


    private setFileContextExpandState(newState: vscode.TreeItemCollapsibleState) {
        this.outputChannel.appendLine(`Setting file context state to: ${newState === vscode.TreeItemCollapsibleState.Expanded ? 'Expanded' : 'Collapsed'}`);
        
        if (!this.currentContextItem) {
            this.currentContextItem = this.findCurrentContextItem(this.getRootItems());
        }
    
        if (this.currentContextItem) {
            this.currentContextItem.collapsibleState = newState;
            this._onDidChangeTreeData.fire(this.currentContextItem);
            this.outputChannel.appendLine(`Updated current context item state`);
            
            // Refresh the entire tree to ensure changes are reflected
            this.refresh();
        } else {
            this.outputChannel.appendLine(`Current context item not found`);
        }
    }

    private findCurrentContextItem(items: ProjectInfoItem[]): ProjectInfoItem | undefined {
        for (const item of items) {
            if (item.definition.itemType === ProjectInfoItemType.FileContext) {
                return item;
            }
            if (item.children) {
                const found = this.findCurrentContextItem(item.children);
                if (found) { return found; }
            }
        }
        return undefined;
    }


    private handleFileStatusChange = (filePath: string) => {
        const updateItem = (items: ProjectInfoItem[]) => {
            for (const item of items) {
                if (item.definition.itemType === ProjectInfoItemType.ProjectInfoFile) {
                    const itemPath = this.projectInfoFileItemManager.getProjectInfoFilePath(item.definition.contextValue);
                    if (itemPath === filePath) {
                        item.isActive = this.projectInfoFileItemManager.isActive(filePath);
                        this._onDidChangeTreeData.fire(item);
                        return true;
                    }
                }
                if (item.children && updateItem(item.children)) {
                    return true;
                }
            }
            return false;
        };

        const rootItems = this.getRootItems();
        if (updateItem(rootItems)) {
            this._onDidChangeTreeData.fire();
        }
    };



    //// Tree Item Mandatory Method ////
    getTreeItem(element: ProjectInfoItem): vscode.TreeItem {
        if (element.definition.itemType === ProjectInfoItemType.ProjectInfoFile) {
            const filePath = this.projectInfoFileItemManager.getProjectInfoFilePath(element.definition.contextValue);
            const isActive = this.projectInfoFileItemManager.isActive(filePath);
            element.description = isActive ? '(Active)' : '';
        }

        // Set the button context values if the item has buttons
        // if (element.buttonContextValues.length > 0) {
        //     element.contextValue = [element.contextValue, ...element.buttonContextValues].filter(Boolean).join(',');
        // }

        return element;
    }

    //// Tree Item Mandatory Method ////
    async getChildren(element?: ProjectInfoItem): Promise<ProjectInfoItem[]> {
        if (!element) {
            return this.getRootItems();
        }
        

        const cacheKey = element.definition.contextValue;

        // Get from cache if possible
        if (this.treeCache.has(cacheKey)) {
            return this.treeCache.get(cacheKey)!;
        }

        // Load children otherwise if not
        let children: ProjectInfoItem[] = [];
        switch (element.definition.itemType) {
            case ProjectInfoItemType.ProjectInfoFile:
                break;
            case ProjectInfoItemType.Dropdown:
                children = element.children || [];
                break;
            case ProjectInfoItemType.FileContext:
            case ProjectInfoItemType.FileContextItem:
                // Always return fresh items for file context
                children = this.getFileContextChildren(element);
                break;
            default:
        }

        // Sort current file context items
        if (element.definition.itemType === ProjectInfoItemType.FileContext
            || element.definition.itemType === ProjectInfoItemType.FileContextItem) {
            children = this.sortFileContextChildren(children);
        }

        // Cache the children
        this.treeCache.set(cacheKey, children);
        //this.outputChannel.appendLine(`Got item: ${cacheKey}; children: ${JSON.stringify(children, null,2)}`);
        return children;
    }

    private getFileContextChildren(element: ProjectInfoItem): ProjectInfoItem[] {
        if (element.definition.itemType === ProjectInfoItemType.FileContext) {
            return this.fileContextItems.filter(item =>
                item.definition.contextValue.split(path.sep).length === 1
            );
        } else {
            const parentPath = element.definition.contextValue;
            return this.fileContextItems.filter(item => {
                const itemPath = item.definition.contextValue;
                const itemParts = itemPath.split(path.sep);
                const parentParts = parentPath.split(path.sep);
                return itemPath.startsWith(parentPath + path.sep) &&
                    itemParts.length === parentParts.length + 1;
            });
        }
    }

    // async getChildren(element?: ProjectInfoItem): Promise<ProjectInfoItem[]> {
    //     if (!element) {
    //         // Root level
    //         return this.getRootItems();
    //     }

    //     if (element.collapsibleState === vscode.TreeItemCollapsibleState.None) {
    //         // Non-expandable item, return empty array
    //         return [];
    //     }

    //     const cacheKey = element.definition.contextValue;
    //     if (this.treeCache.has(cacheKey)) {
    //         return this.treeCache.get(cacheKey)!;
    //     }

    //     let children: ProjectInfoItem[] = [];

    //     switch (element.definition.itemType) {
    //         case ProjectInfoItemType.Dropdown:
    //             children = element.children || [];
    //             break;
    //         case ProjectInfoItemType.FileContext:
    //             children = this.fileContextItems.filter(item => 
    //                 item.definition.contextValue.split(path.sep).length === 1
    //             );
    //             break;
    //         case ProjectInfoItemType.FileContextItem:
    //             const parentPath = element.definition.contextValue;
    //             children = this.fileContextItems.filter(item => {
    //                 const itemPath = item.definition.contextValue;
    //                 const itemParts = itemPath.split(path.sep);
    //                 const parentParts = parentPath.split(path.sep);
    //                 return itemPath.startsWith(parentPath + path.sep) && 
    //                     itemParts.length === parentParts.length + 1;
    //             });
    //             break;
    //     }

    //     // sort for file context & file context items
    //     if (element.definition.itemType === ProjectInfoItemType.FileContext
    //         || element.definition.itemType === ProjectInfoItemType.FileContextItem) 
    //     {
    //         children = this.sortFileContextChildren(children);
    //     }

    //     // Cache the children
    //     this.treeCache.set(cacheKey, children);
    //     return children;
    // }

    private sortFileContextChildren(children: ProjectInfoItem[]): ProjectInfoItem[] {
        return children.sort((a, b) => {
            // First, separate directories and files
            const aIsDirectory = a.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed;
            const bIsDirectory = b.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed;

            if (aIsDirectory && !bIsDirectory) {
                return -1; // a (directory) comes before b (file)
            } else if (!aIsDirectory && bIsDirectory) {
                return 1;  // b (directory) comes before a (file)
            } else {
                // Both are either directories or files, sort alphabetically
                const aName = a.getSortableName() ?? '';
                const bName = b.getSortableName() ?? '';
                return aName.localeCompare(bName, undefined, { sensitivity: 'base' });
            }
        });
    }

    public async openProjectInfoFile(contextValue: string) {
        try {
            const filePath = this.projectInfoFileItemManager.getProjectInfoFilePath(contextValue);
            const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
            await vscode.window.showTextDocument(document, { preview: false });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open project info file: ${contextValue}`);
        }
    }


    private getRootItems(): ProjectInfoItem[] {
        if (!this.treeCache.has('root')) {
            const rootItems = this.itemsDefinition.map(item => this.createProjectInfoItem(item));
            this.treeCache.set('root', rootItems);
        }
        return this.treeCache.get('root')!;
    }

    private createProjectInfoItem(definition: ProjectInfoItemDefinition): ProjectInfoItem {
        const filePath = this.projectInfoFileItemManager.getProjectInfoFilePath(definition.contextValue);
        const isActive = this.projectInfoFileItemManager.isActive(filePath);

        const item = new ProjectInfoItem(
            definition,
            vscode.Uri.file(filePath),
            isActive,
            definition.itemType === ProjectInfoItemType.ProjectInfoFile
                ? vscode.TreeItemCollapsibleState.None
                : vscode.TreeItemCollapsibleState.Collapsed
        );

        if (definition.children) {
            item.children = definition.children.map(childDef => this.createProjectInfoItem(childDef));
        }

        return item;
    }
    
    private async handleFileChange(uri: vscode.Uri): Promise<void> {
        const changedFile = uri.fsPath;
    
        const excludePath = this.configManager.getExcludeFileContextSystemPath();
        const includePath = this.configManager.getIncludeFileContextSystemPath();
    
        if (changedFile === excludePath || changedFile === includePath || changedFile.endsWith('.gitignore')) {
            // If the changed file is one of our gitignore files or any .gitignore file, reload the rules and refresh
            this.fileManager.reloadFileContextGitignoreRules();
            await this.refreshFileContextItems(true);
        }
    }
    
    private async refreshFileContextItems(force: boolean = false): Promise<void> {
        try {
            const newFileContextItems = await this.projectInfoFileContextManager.refreshFileContextItems();
            
            if (force || !this.areFileContextItemsEqual(this.fileContextItems, newFileContextItems)) {
                this.fileContextItems = newFileContextItems;
                this.treeCache.clear(); // Clear the entire cache to ensure all levels are refreshed
                this._onDidChangeTreeData.fire(); // Trigger a full refresh of the tree view
            }
        } catch (error) {
            this.outputChannel.appendLine(`Error refreshing file context items: ${error instanceof Error ? error.message : 'Unknown error'}`);
            vscode.window.showErrorMessage(`Error refreshing file context items: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    
    private areFileContextItemsEqual(oldItems: ProjectInfoItem[], newItems: ProjectInfoItem[]): boolean {
        if (oldItems.length !== newItems.length) { return false; }
    
        for (let i = 0; i < oldItems.length; i++) {
            if (oldItems[i].definition.contextValue !== newItems[i].definition.contextValue) { return false; }
        }
    
        return true;
    }
    

    public async refresh(): Promise<void> {
        //this.outputChannel.appendLine('Refreshing ProjectInfoProvider');
        this.treeCache.clear();
        await this.refreshFileContextItems(true);
        this._onDidChangeTreeData.fire();
    }

    public async initialize(): Promise<void> {
        await this.projectInfoFileItemManager.loadProjectInfoFilesIfNotExist(this.itemsDefinition);
        this.refresh();
    }

    dispose() {
        this.projectInfoFileContextManager.dispose();
        this.projectInfoFileItemManager.dispose();
        this.watcher.dispose();
    }
}

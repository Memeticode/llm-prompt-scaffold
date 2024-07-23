import * as vscode from 'vscode';
import * as path from 'path';

export enum ProjectInfoItemType {
    ProjectInfoFile = 'projectInfoFile',    // users can edit these directly
    Dropdown = 'dropdown',                  // dropdown container
    FileContext = 'fileContext',            // displays files which will be included in context
    FileContextItem = 'fileContextItem'     // content of the FileContext section (current context)
}


export interface ButtonCommandDefinition {
    id: string;
    icon: string;
    tooltip: string;
}
export interface ProjectInfoItemDefinition {
    label: string;
    contextValue: string;
    itemType: ProjectInfoItemType;
    parent?: string;
    tooltip?: string;
    children?: ProjectInfoItemDefinition[];
    iconName?: string; 
    //buttons?: ButtonCommandDefinition[];
}

export class ProjectInfoItem extends vscode.TreeItem {
    public children?: ProjectInfoItem[];
    //public buttonContextValues: string[] = [];


    constructor(
        public readonly definition: ProjectInfoItemDefinition,
        public readonly useResourceUri: vscode.Uri, // the TreeItem resourceUri is left blank to prevent VS Code from applying version tracking
        public isActive: boolean,
        public collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(definition.label, collapsibleState);
        this.tooltip = definition.tooltip;
        this.contextValue = definition.contextValue;
        this.description = '';

        if (definition.itemType === ProjectInfoItemType.ProjectInfoFile) {
            this.description = isActive ? '(Active)' : '';
            this.command = {
                command: 'promptScaffold.openProjectInfoFile',
                title: 'Open Project Info File',
                arguments: [this.contextValue]
            };
        } else if (definition.itemType === ProjectInfoItemType.FileContextItem 
                    && this.collapsibleState === vscode.TreeItemCollapsibleState.None) {
            this.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [this.useResourceUri]
            };
        }
        
        // set uri for file context items so tracking can be applied and icon can be retrieved
        if (definition.itemType === ProjectInfoItemType.FileContextItem)
        {
            this.resourceUri = this.useResourceUri;
        }

        // add buttons if any
        // if (definition.buttons && definition.buttons.length > 0) {
        //     this.buttonContextValues = definition.buttons.map(button => `hasButton:${button.id}`);
        // }

        // create child items if any
        if (definition.children) {
            this.children = definition.children.map(childDef => 
                new ProjectInfoItem(childDef, useResourceUri, false, vscode.TreeItemCollapsibleState.Collapsed)
            );
        }

        this.iconPath = this.getIconPath();
    }

    public getSortableName(): string {
        if (typeof this.label === 'string') {
            return this.label;
        } else if (this.label) {
            return this.label.label || '';
        } else if (this.definition && this.definition.contextValue) {
            return path.basename(this.definition.contextValue);
        } else {
            return '';
        }
    }

    private getIconPath(): vscode.ThemeIcon | { light: string; dark: string }  | undefined {
        if (this.definition.iconName) {
            return new vscode.ThemeIcon(this.definition.iconName);
        }

        switch (this.definition.itemType) {
            case ProjectInfoItemType.ProjectInfoFile:
                return new vscode.ThemeIcon('file-text');
            case ProjectInfoItemType.Dropdown:
                return undefined;
            case ProjectInfoItemType.FileContext:
                return undefined;
            case ProjectInfoItemType.FileContextItem:
                return this.getFileContextItemIcon();
            default:
                return new vscode.ThemeIcon('file');
        }
    }

    private getFileContextItemIcon(): vscode.ThemeIcon {
        if (this.isFileContextFile()) {
            return vscode.ThemeIcon.File;
        } else {
            return vscode.ThemeIcon.Folder;
        }
    }
    
    private isFileContextFile() : boolean {
        if (this.definition.itemType !== ProjectInfoItemType.FileContextItem)
        {
            throw new Error('Specified item is not a FileContextItem.');
        }
        return this.collapsibleState === vscode.TreeItemCollapsibleState.None;
    }
    

}

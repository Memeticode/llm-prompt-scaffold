import * as vscode from 'vscode';

export class VscodeWorkspaceUtils {
    
    static async workspaceExistsAsync(workspace: vscode.WorkspaceFolder): Promise<boolean> {
        try {
            await vscode.workspace.fs.stat(workspace.uri);
            return true;
        } catch {
            return false;
        }
    }

    static currentWorkspaceHasAtLeastOneFolder(): boolean {
        return vscode.workspace.workspaceFolders !== undefined && vscode.workspace.workspaceFolders.length > 0;
    }

    static isRootWorkspaceFolder(workspaceFolder: vscode.WorkspaceFolder): boolean {
        return vscode.workspace.workspaceFolders?.[0] === workspaceFolder;
    }

    static async getRootWorkspaceFolderAsync(): Promise<vscode.WorkspaceFolder> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folders found');
        }
        return workspaceFolders[0];
    }

    static async getWorkspaceFolderByNameAsync(name: string): Promise<vscode.WorkspaceFolder> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('No workspace folders found');
        }
        const workspace = workspaceFolders.find(folder => folder.name === name);
        if (!workspace) {
            throw new Error(`Workspace folder with name "${name}" not found`);
        }
        return workspace;
    }

    static async getAllWorkspaceFolderNamesAsync(): Promise<string[]> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return [];
        }
        return workspaceFolders.map(folder => folder.name);
    }

    static async getAllWorkspaceFoldersAsync(): Promise<readonly vscode.WorkspaceFolder[]> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('No workspace folders found');
        }
        return workspaceFolders;
    }
}
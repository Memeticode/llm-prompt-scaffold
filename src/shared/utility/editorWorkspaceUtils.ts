import * as vscode from 'vscode';

export class EditorWorkspaceUtils {

    static getAllWorkspaceFolders(): readonly vscode.WorkspaceFolder[] {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        return workspaceFolders ? workspaceFolders : [];
    }

    static workspaceExists(workspace: vscode.WorkspaceFolder): boolean {
        return vscode.workspace.workspaceFolders?.some(folder => folder.uri.toString() === workspace.uri.toString()) ?? false;
    }
    

    // update ".vscode" exclusion settings (excluded item won't show up in vscode workspace explorer)
    static async updateWorkspaceExplorerExcludeSettingAsync(
        workspace: vscode.WorkspaceFolder, 
        addFolderName: string, 
        removeFolderName?: string
    ): Promise<void> {
        const config = vscode.workspace.getConfiguration('files', workspace.uri);
        const exclude = config.get('exclude') as { [key: string]: boolean };
    
        // Add the new folder to exclude
        exclude[`**/${addFolderName}`] = true;
    
        // Remove the old folder from exclude if specified
        if (removeFolderName && removeFolderName !== addFolderName) {
            delete exclude[`**/${removeFolderName}`];
        }
    
        // Update the configuration
        await config.update('exclude', exclude, vscode.ConfigurationTarget.WorkspaceFolder);
    }

}
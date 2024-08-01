import * as vscode from 'vscode';
import { ExtensionConfigurationManager } from './managers/extensionConfigurationManager';
import { ExtensionStorageManager } from './managers/extensionStorageManager';
import { VscodeEventManager } from './managers/vscodeEventManager';
import { WorkspaceSelectionTreeProvider } from './ui/workspaceSelectionTreeProvider';
import { PromptConfigurationTreeProvider } from './ui/promptConfigurationTreeProvider';
import { PromptGenerationTreeProvider } from './ui/promptGenerationTreeProvider';
import { EXTENSION_STORAGE, ExtensionUtils } from './utils/extensionUtils';


let outputChannel: vscode.OutputChannel;

export async function activate(context: vscode.ExtensionContext) {
    // Create and store the output channel
    outputChannel = vscode.window.createOutputChannel('LLM Prompt Scaffold');
    context.subscriptions.push(outputChannel);

    outputChannel.appendLine('Prompt Scaffold extension is activating.');

    const configManager = new ExtensionConfigurationManager("ExtensionConfigurationManager", outputChannel);
    const storageManager = new ExtensionStorageManager("ExtensionStorageManager", outputChannel);
    const eventManager = new VscodeEventManager("VscodeEventManager", outputChannel, configManager, storageManager);
    
    
    
    // SIDEBAR

    // WORKSPACE SELECTOR
    // This view will show all workspaces and and allow the user to select which one is active for prompt generation purposes
    const workspaceSelectionTreeProvider = new WorkspaceSelectionTreeProvider("WorkspaceSelectionTreeProvider", outputChannel, configManager);
    context.subscriptions.push(
        vscode.window.createTreeView('workspaceSelectorView', { 
            treeDataProvider: workspaceSelectionTreeProvider 
        })
    );

    // Register the command to set the active workspace
    // This command is used both for the tree view items and the command palette
    context.subscriptions.push(
        vscode.commands.registerCommand('llmPromptScaffold.setActiveWorkspace', (workspace?: vscode.WorkspaceFolder) => {
            if (workspace) {
                // If a workspace is provided, it means the command was triggered from the tree view
                // Set this workspace as active
                workspaceSelectionTreeProvider.setActiveWorkspace(workspace);
            } else {
                // If no workspace is provided, it means the command was triggered from the command palette
                // Show the quick pick menu to select a workspace
                workspaceSelectionTreeProvider.showWorkspaceQuickPick();
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('llmPromptScaffold.refreshWorkspaceView', () => {
            workspaceSelectionTreeProvider.refresh();
        })
    );



    // PROMPT CONFIGURATION
    // This view will allow the user to view and edit prompt configuration files for the active workspace
    const promptConfigProvider = new PromptConfigurationTreeProvider("PromptConfigurationProvider", outputChannel, configManager);
    vscode.window.registerTreeDataProvider('promptConfigurationView', promptConfigProvider);

    // Register a command to refresh the prompt configuration view
    vscode.commands.registerCommand('llmPromptScaffold.refreshPromptConfiguration', () => {
        promptConfigProvider.refresh();
    });


    // PROMPT GENERATION
    // This view will allow the user to view, generate, and export prompt files suitable for loading into an llm
    const promptGenerationProvider = new PromptGenerationTreeProvider("PromptGenerationTreeProvider", outputChannel, configManager, storageManager);
    vscode.window.createTreeView('promptGenerationView', { 
        treeDataProvider: promptGenerationProvider
    });
    
    context.subscriptions.push(
        vscode.commands.registerCommand('llmPromptScaffold.generateAllPromptOutFiles', async () => {
            const workspace = configManager.getActiveWorkspace();
            if (workspace) {
                try {
                    await storageManager.generatePromptFilesAsync(workspace);
                    promptGenerationProvider.refresh();
                    vscode.window.showInformationMessage('All prompt files generated successfully.');
                } catch (error) {
                    vscode.window.showErrorMessage(`Error generating prompt files: ${error}`);
                }
            } else {
                vscode.window.showErrorMessage('No active workspace selected.');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('llmPromptScaffold.openPromptOutFolder', async () => {
            const workspace = configManager.getActiveWorkspace();
            if (workspace) {
                const outDir = vscode.Uri.joinPath(ExtensionUtils.getExtensionStorageFolderUri(workspace), EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.NAME);
                vscode.env.openExternal(outDir);
            } else {
                vscode.window.showErrorMessage('No active workspace selected.');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('llmPromptScaffold.openOrGeneratePromptFile', async (workspace: vscode.WorkspaceFolder, fileKey: keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES) => {
            try {
                const fileUri = await storageManager.generatePromptFileAsync(workspace, fileKey);
                const document = await vscode.workspace.openTextDocument(fileUri);
                await vscode.window.showTextDocument(document);
            } catch (error) {
                vscode.window.showErrorMessage(`Error opening/generating prompt file: ${error}`);
            }
        })
    );


    // Register event listeners for workspace and configuration changes
    eventManager.registerEventListeners();

    // Initialize storage for existing workspaces
    // This ensures that all current workspaces have the necessary storage structure
    await eventManager.initializeForExistingWorkspaces();

    outputChannel.appendLine('LLM Prompt Scaffold extension activated successfully.');

}

export function deactivate() {
    outputChannel.appendLine('LLM Prompt Scaffold extension is deactivating.');
    if (outputChannel) { outputChannel.dispose(); }
    outputChannel.appendLine('LLM Prompt Scaffold extension deactivated successfully.');
}


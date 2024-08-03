import * as vscode from 'vscode';
import { EXTENSION_STORAGE } from './constants/extensionStorage';
import { ExtensionUtils } from './utils/extensionUtils';
import { ExtensionConfigurationManager } from './managers/extensionConfigurationManager';
import { ExtensionStorageManager } from './managers/extensionStorageManager';
import { VscodeEventManager } from './managers/vscodeEventManager';
import { WorkspaceSelectionTreeProvider } from './ui/workspaceSelectionTreeProvider';
import { PromptConfigurationTreeProvider } from './ui/promptConfigurationTreeProvider';
import { PromptGenerationTreeProvider } from './ui/promptGenerationTreeProvider';



let outputChannel: vscode.OutputChannel;
let configManager: ExtensionConfigurationManager;
let storageManager: ExtensionStorageManager;
let eventManager: VscodeEventManager;
let workspaceSelectionProvider: WorkspaceSelectionTreeProvider;
let promptConfigProvider: PromptConfigurationTreeProvider;
let promptGenerationProvider: PromptGenerationTreeProvider;

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
    


    // PROMPT CONFIGURATION
    // This view will allow the user to view and edit prompt configuration files for the active workspace
    const promptConfigProvider = new PromptConfigurationTreeProvider("PromptConfigurationProvider", outputChannel, configManager);
    vscode.window.registerTreeDataProvider('promptConfigurationView', promptConfigProvider);

    // Register a command to refresh the prompt configuration view

    // why not pushing to context subscriptions?
    vscode.commands.registerCommand('llmPromptScaffold.refreshPromptConfiguration', () => {
        try {
            promptConfigProvider.refresh();
        } catch(error) {
            vscode.window.showErrorMessage(`Error refreshing prompt configuration: ${error}`);
        }
    });


    // PROMPT GENERATION
    // This view will allow the user to view, generate, and export prompt files suitable for loading into an llm
    const promptGenerationProvider = new PromptGenerationTreeProvider("PromptGenerationTreeProvider", outputChannel, configManager);
    vscode.window.createTreeView('promptGenerationView', { 
        treeDataProvider: promptGenerationProvider
    });
    
    context.subscriptions.push(
        vscode.commands.registerCommand('llmPromptScaffold.openPromptOutFolder', async () => {
            const workspace = configManager.getActiveWorkspace();
            if (!workspace) {
                vscode.window.showErrorMessage('No active workspace selected.');
                return;
            }
            try {
                const outDir = vscode.Uri.joinPath(ExtensionUtils.getExtensionStorageFolderUri(workspace), EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.NAME);
                vscode.env.openExternal(outDir);
            } catch(error) {
                vscode.window.showErrorMessage(`Error opening prompt out folder: ${error}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('llmPromptScaffold.generatePromptOutFiles', async () => {
            const workspace = configManager.getActiveWorkspace();
            if (!workspace) {
                vscode.window.showErrorMessage('No active workspace selected.');
                return;
            }
            try {
                await storageManager.generatePromptFilesAsync(workspace);
                promptGenerationProvider.refresh();
            } catch (error) {
                vscode.window.showErrorMessage(`Error generating prompt files: ${error}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('llmPromptScaffold.openPromptOutFileInEditor', 
            async (fileKey: keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES) => {
                const workspace = configManager.getActiveWorkspace();
                if (!workspace) {
                    vscode.window.showErrorMessage('No active workspace selected.');
                    return;
                }
                try {
                    const fileUri = await storageManager.generatePromptOutFileAsyncIfNotExistsAsync(workspace, fileKey);
                    const document = await vscode.workspace.openTextDocument(fileUri);
                    await vscode.window.showTextDocument(document);
                } catch (error) {
                    vscode.window.showErrorMessage(`Error opening prompt file: ${error}`);
                }
            }
        )
    );
    
    context.subscriptions.push(
        vscode.commands.registerCommand('llmPromptScaffold.regenerateAndOpenPromptOutFileInEditor', 
            async (fileKey: keyof typeof EXTENSION_STORAGE.STRUCTURE.PROMPT_OUT_DIR.FILES) => {                
                const workspace = configManager.getActiveWorkspace();
                if (workspace) {
                    try {
                        const fileUri = await storageManager.generatePromptOutFileAsync(workspace, fileKey);
                        const document = await vscode.workspace.openTextDocument(fileUri);
                        await vscode.window.showTextDocument(document);
                    } catch (error) {
                        vscode.window.showErrorMessage(`Error regenerating prompt file: ${error}`);
                    }
                } else {
                    vscode.window.showErrorMessage('No active workspace selected.');
                }
            }
        )
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
    if (configManager) { configManager.dispose(); }
    if (storageManager) { storageManager.dispose(); }
    if (eventManager) { eventManager.dispose(); }
    if (workspaceSelectionProvider) { workspaceSelectionProvider.dispose(); }
    if (promptConfigProvider) { promptConfigProvider.dispose(); }
    if (promptGenerationProvider) { promptGenerationProvider.dispose(); }
    outputChannel.appendLine('LLM Prompt Scaffold extension deactivated successfully.');
}


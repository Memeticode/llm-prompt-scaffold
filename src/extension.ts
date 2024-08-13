import * as vscode from 'vscode';
import { EXTENSION_STORAGE } from './constants/extensionStorage';
import { ExtensionUtils } from './extension/utility/extensionUtils';
import { ExtensionStateManager } from './managers/extensionStateManager';
import { ExtensionStorageManager } from './managers/extensionStorageManager';
import { ExtensionEventManager } from './managers/extensionEventManager';
import { WorkspaceSelectionTreeProvider } from './providers/workspaceSelectionTreeProvider';
import { PromptConfigurationTreeProvider } from './providers/promptConfigurationTreeProvider';
import { PromptContextTreeProvider } from './providers/promptContextTreeProvider';
import { PromptConfigFileKey, PromptContextFileKey } from './extension/types';
import { PromptContextTreeItem } from './providers/treeItems';
import { PromptConfigItem, PromptContextItem } from './extension/interfaces';
import { ExtensionCommandManager } from './managers/extensionCommandManager';

let outputChannel: vscode.OutputChannel;
let stateManager: ExtensionStateManager;
let storageManager: ExtensionStorageManager;
let eventManager: ExtensionEventManager;
let commandManager: ExtensionCommandManager;

let workspaceSelectionProvider: WorkspaceSelectionTreeProvider;
let promptConfigProvider: PromptConfigurationTreeProvider;
let promptContextProvider: PromptContextTreeProvider;

export async function activate(context: vscode.ExtensionContext) {
    try {
        // create and store the output channel
        outputChannel = vscode.window.createOutputChannel('LLM Prompt Scaffold');
        context.subscriptions.push(outputChannel);

        outputChannel.appendLine('Prompt Scaffold extension is activating.');

        // initialize managers to handle extension logic and state management
        stateManager = new ExtensionStateManager("ConfigurationManager", outputChannel, context);
        storageManager = new ExtensionStorageManager("StorageManager", outputChannel, stateManager);
        eventManager = new ExtensionEventManager("EventManager", outputChannel, stateManager, storageManager);
        commandManager = new ExtensionCommandManager("CommandManager", outputChannel, stateManager, storageManager);

        // initialize providers to provide data to ui components
        workspaceSelectionProvider = new WorkspaceSelectionTreeProvider("WorkspaceSelectionTreeProvider", outputChannel, stateManager);
        promptConfigProvider = new PromptConfigurationTreeProvider("PromptConfigurationTreeProvider", outputChannel, stateManager);
        promptContextProvider = new PromptContextTreeProvider("PromptContextTreeProvider", outputChannel, stateManager, storageManager);

        registerCommands(context);
        registerProviders(context);


        // these functions will change and be cleaned up as we clean up the managers
        // Event listeners should indeed be added to context.subscriptions for proper cleanup!
        eventManager.registerEventListeners();
        await stateManager.initializeStateAsync();
        await storageManager.initializeStorageAsync();

        outputChannel.appendLine('LLM Prompt Scaffold extension activated successfully.');
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        try {
            outputChannel.appendLine(`Error during activation: ${errorMessage}`);
            vscode.window.showErrorMessage(`Failed to activate LLM Prompt Scaffold extension. Check output for details.`);
        }
        catch (logError) {
            console.error('Failed to log activation error to output channel:', logError);
            console.error('Original activation error:', errorMessage);
        }
        throw error;
    }
}

function registerCommands(context: vscode.ExtensionContext) {


    // Other extension commands (all start w/ "LLM Prompt Scaffold: ")
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'llmPromptScaffold.setActiveWorkspace',
            async (workspaceFolder?: vscode.WorkspaceFolder) =>
                await commandManager.setActiveWorkspaceAsync(workspaceFolder)
        ),
        vscode.commands.registerCommand(
            'llmPromptScaffold.setDefaultPromptConfiguration',
            async () =>
                await commandManager.setDefaultPromptConfigurationAsync()
        ),
        vscode.commands.registerCommand(
            'llmPromptScaffold.setDefaultPromptConfigurationItem',
            async () =>
                await commandManager.setDefaultPromptConfigurationItemAsync()
        ),
        vscode.commands.registerCommand(
            'llmPromptScaffold.openPromptConfigurationItem',
            async (workspace?: vscode.WorkspaceFolder, fileKey?: PromptConfigFileKey) =>
                await commandManager.openPromptConfigurationItemAsync(workspace, fileKey)
        ),
        vscode.commands.registerCommand(
            'llmPromptScaffold.generatePromptContextItems',
            async () =>
                await commandManager.generatePromptContextItemsAsync()
        ),
        vscode.commands.registerCommand(
            'llmPromptScaffold.generatePromptContextItem', 
            // Call command implementation with item as may be called by inline button from promt context tree item
            async (item: PromptContextTreeItem) => {
                if (item.workspace && item.fileKey) {
                    await commandManager.generatePromptContextItemAsync(item.workspace, item.fileKey);
                } else {
                    await commandManager.generatePromptContextItemAsync();
                }
        }),
        vscode.commands.registerCommand(
            'llmPromptScaffold.openPromptContextItem',
            async (workspace?: vscode.WorkspaceFolder, fileKey?: PromptContextFileKey) =>
                await commandManager.openPromptContextItemAsync(workspace, fileKey)
        ),
        vscode.commands.registerCommand(
            'llmPromptScaffold.copyPromptContextItemToClipboard', 
            // Call command implementation with item as may be called by inline button from promt context tree item
            async (item: PromptContextTreeItem) => {
                if (item.workspace && item.fileKey) {
                    await commandManager.copyPromptContextItemToClipboardAsync(item.workspace, item.fileKey);
                } else {
                    await commandManager.copyPromptContextItemToClipboardAsync();
                }
        }),
        vscode.commands.registerCommand(
            'llmPromptScaffold.openPromptContextFolderInFileManager',
            async (workspace?: vscode.WorkspaceFolder) =>
                await commandManager.openPromptContextFolderInFileManagerAsync(workspace)
        )
    );
}

function registerProviders(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.window.createTreeView('llmPromptScaffold.workspaceSelectorView', { treeDataProvider: workspaceSelectionProvider }),
        vscode.window.createTreeView('llmPromptScaffold.promptConfigurationView', { treeDataProvider: promptConfigProvider }),
        vscode.window.createTreeView('llmPromptScaffold.promptContextView', { treeDataProvider: promptContextProvider })
    );
}

export function deactivate() {
    outputChannel.appendLine('LLM Prompt Scaffold extension is deactivating.');
    try {
        if (stateManager) { stateManager.dispose(); }
        if (storageManager) { storageManager.dispose(); }
        if (eventManager) { eventManager.dispose(); }
        if (workspaceSelectionProvider) { workspaceSelectionProvider.dispose(); }
        if (promptConfigProvider) { promptConfigProvider.dispose(); }
        if (promptContextProvider) { promptContextProvider.dispose(); }
        outputChannel.appendLine('LLM Prompt Scaffold extension deactivated successfully.');
    } catch (error) {
        outputChannel.appendLine(`Error during deactivation: ${error}`);
    } finally {
        if (outputChannel) { outputChannel.dispose(); }
    }
}


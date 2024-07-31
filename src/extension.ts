import * as vscode from 'vscode';
import { ExtensionConfigurationManager } from './managers/extensionConfigurationManager';
import { ExtensionStorageManager } from './managers/extensionStorageManager';
import { VscodeEventManager } from './managers/vscodeEventManager';

import { PromptConfigurationProvider } from './ui/promptConfigurationProvider';
import { ExtensionUtils } from './utils/extensionUtils';


let outputChannel: vscode.OutputChannel;

export async function activate(context: vscode.ExtensionContext) {
    // Create and store the output channel
    outputChannel = vscode.window.createOutputChannel('LLM Prompt Scaffold');
    ExtensionUtils.initialize(outputChannel);
    context.subscriptions.push(outputChannel);

    outputChannel.appendLine('Prompt Scaffold extension is activating.');


    // Initialize managers
    const configManager = new ExtensionConfigurationManager("ExtensionConfigurationManager", outputChannel, context);
    const storageManager = new ExtensionStorageManager("ExtensionStorageManager", outputChannel);
    const eventManager = new VscodeEventManager("VscodeEventManager", outputChannel, configManager, storageManager);

    // Initialize event listeners
    await eventManager.initializeEventListenersAndCheckRootworkspaceAsync();

    // Initialize configuration (from global storage)
    await configManager.initializeWorkspaceConfigCache();

    // Initialize storage
    const lastKnownWorkspaceConfigValues = configManager.getLastKnownWorkspaceConfigValues();
    await storageManager.initializeExtensionStorageAsync(lastKnownWorkspaceConfigValues);

    // Check for root workspace changes (the extension refreshses when user changes root workspace)
    //await eventManager.checkAndHandleRootWorkspaceChangeAsync();

    
    // SIDEBAR

    // Register prompt configuration provider and commands
    const promptConfigProvider = new PromptConfigurationProvider();
    vscode.window.registerTreeDataProvider('promptConfigurationView', promptConfigProvider);
    context.subscriptions.push(
        vscode.commands.registerCommand('llmPromptScaffold.reloadPromptConfigurationContent', 
            async () => await storageManager.refreshExtensionStorageAsync(configManager.getLastKnownWorkspaceConfigValues()))
    );

    outputChannel.appendLine('LLM Prompt Scaffold extension activated successfully.');

}

export function deactivate() {
    outputChannel.appendLine('LLM Prompt Scaffold extension is deactivating.');
    if (outputChannel) { outputChannel.dispose(); }
    outputChannel.appendLine('LLM Prompt Scaffold extension deactivated successfully.');
}


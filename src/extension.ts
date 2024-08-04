import * as vscode from 'vscode';
import { EXTENSION_STORAGE } from './constants/extensionStorage';
import { ExtensionUtils } from './shared/utility/extensionUtils';
import { ExtensionStateManager } from './managers/extensionStateManager';
import { ExtensionStorageManager } from './managers/extensionStorageManager';
import { ExtensionEventManager } from './managers/extensionEventManager';
import { WorkspaceSelectionTreeProvider } from './providers/workspaceSelectionTreeProvider';
import { PromptConfigurationTreeProvider } from './providers/promptConfigurationTreeProvider';
import { PromptGenerationTreeProvider } from './providers/promptGenerationTreeProvider';
import { ConfigFileKey, GeneratedFileKey } from './shared/extension/types';
import { PromptConfigItem, GeneratedPromptItem } from './shared/extension/interfaces';

let outputChannel: vscode.OutputChannel;
let configManager: ExtensionStateManager;
let storageManager: ExtensionStorageManager;
let eventManager: ExtensionEventManager;
let workspaceSelectionTreeProvider: WorkspaceSelectionTreeProvider;
let promptConfigProvider: PromptConfigurationTreeProvider;
let promptGenerationProvider: PromptGenerationTreeProvider;

export async function activate(context: vscode.ExtensionContext) {
    try
    {
        // create and store the output channel
        outputChannel = vscode.window.createOutputChannel('LLM Prompt Scaffold');
        context.subscriptions.push(outputChannel);
        outputChannel.appendLine('Prompt Scaffold extension is activating.');

        // managers handle extension logic and state management
        configManager = new ExtensionStateManager("ExtensionConfigurationManager", outputChannel);
        storageManager = new ExtensionStorageManager("ExtensionStorageManager", outputChannel);
        eventManager = new ExtensionEventManager("VscodeEventManager", outputChannel, configManager, storageManager);
        
        // providers provide data to ui components
        workspaceSelectionTreeProvider = new WorkspaceSelectionTreeProvider("WorkspaceSelectionTreeProvider", outputChannel, configManager);
        promptConfigProvider = new PromptConfigurationTreeProvider("PromptConfigurationProvider", outputChannel, configManager);
        promptGenerationProvider = new PromptGenerationTreeProvider("PromptGenerationTreeProvider", outputChannel, configManager);

        registerCommands(context);
        registerProviders(context);

        
        // these functions will change and be cleaned up as we clean up the managers
        // Event listeners should indeed be added to context.subscriptions for proper cleanup!
        eventManager.registerEventListeners();

        // Initialize storage for existing workspaces
        // This ensures that all current workspaces have the necessary storage structure
        await eventManager.initializeForExistingWorkspaces();

        outputChannel.appendLine('LLM Prompt Scaffold extension activated successfully.');
    }
    catch(error)
    {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        try 
        {
            outputChannel.appendLine(`Error during activation: ${errorMessage}`);
            vscode.window.showErrorMessage(`Failed to activate LLM Prompt Scaffold extension. Check output for details.`);
        }
        catch(logError)
        {
            console.error('Failed to log activation error to output channel:', logError);
            console.error('Original activation error:', errorMessage);
        }
        throw error;
    }
}

function registerCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('llmPromptScaffold.setActiveWorkspace', (workspaceFolder?: vscode.WorkspaceFolder) => setActiveWorkspace(workspaceFolder)),
        vscode.commands.registerCommand('llmPromptScaffold.setDefaultPromptConfiguration', setDefaultPromptConfiguration),
        vscode.commands.registerCommand('llmPromptScaffold.setDefaultPromptConfigurationItem', (item?: PromptConfigItem) => setDefaultPromptConfigurationItem(item)),
        vscode.commands.registerCommand('llmPromptScaffold.openPromptConfigurationItem', (item?: PromptConfigItem) => openPromptConfigurationItem(item)),
        vscode.commands.registerCommand('llmPromptScaffold.generatePrompts', generatePrompts),
        vscode.commands.registerCommand('llmPromptScaffold.generatePromptItem', (item?: GeneratedPromptItem) => generatePromptItem(item)),
        vscode.commands.registerCommand('llmPromptScaffold.openGeneratedPromptItem', (item?: GeneratedPromptItem) => openGeneratedPromptItem(item)),
        vscode.commands.registerCommand('llmPromptScaffold.copyGeneratedPromptItemToClipboard', (item?: GeneratedPromptItem) => copyGeneratedPromptItemToClipboard(item)),
        vscode.commands.registerCommand('llmPromptScaffold.openGeneratedPromptItemFileInFileManager', (item?: GeneratedPromptItem) => openGeneratedPromptItemFileInFileManager(item)),
        vscode.commands.registerCommand('llmPromptScaffold.openGeneratedPromptFolderInFileManager', openGeneratedPromptFolderInFileManager)
    );
}

function registerProviders(context: vscode.ExtensionContext) {
    context.subscriptions.push(        
        vscode.window.createTreeView('llmPromptScaffold.workspaceSelectorView', { treeDataProvider: workspaceSelectionTreeProvider }),
        vscode.window.createTreeView('llmPromptScaffold.promptConfigurationView', { treeDataProvider: promptConfigProvider }),
        vscode.window.createTreeView('llmPromptScaffold.promptGenerationView', { treeDataProvider: promptGenerationProvider })
    );
}

export function deactivate() {
    outputChannel.appendLine('LLM Prompt Scaffold extension is deactivating.');
    try {
        if (configManager) { configManager.dispose(); }
        if (storageManager) { storageManager.dispose(); }
        if (eventManager) { eventManager.dispose(); }
        if (workspaceSelectionTreeProvider) { workspaceSelectionTreeProvider.dispose(); }
        if (promptConfigProvider) { promptConfigProvider.dispose(); }
        if (promptGenerationProvider) { promptGenerationProvider.dispose(); }
        outputChannel.appendLine('LLM Prompt Scaffold extension deactivated successfully.');
    } catch (error) {
        outputChannel.appendLine(`Error during deactivation: ${error}`);
    } finally {
        if (outputChannel) { outputChannel.dispose(); }
    }
}



async function setActiveWorkspace(workspaceFolder?: vscode.WorkspaceFolder) {
    try {
        if (workspaceFolder) {
            await configManager.setActiveWorkspace(workspaceFolder);
            vscode.window.showInformationMessage(`Active workspace set to: ${workspaceFolder.name}`);
        } else {
            await workspaceSelectionTreeProvider.showWorkspaceQuickPick();
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to set active workspace: ${error}`);
    }
}
async function setDefaultPromptConfiguration() {
    try {
        const confirmation = await vscode.window.showWarningMessage(
            'This will reset all prompt configurations to their default values. This action cannot be undone. Are you sure you want to continue?',
            'Yes', 'No'
        );
        
        if (confirmation !== 'Yes') {
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Setting default prompt configuration...",
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0 });
            
            // Reset each configuration item
            const configItems = await promptConfigProvider.getConfigurationItems();
            const increment = 100 / configItems.length;
            
            for (const item of configItems) {
                await storageManager.setDefaultPromptConfigurationItem(item);
                progress.report({ increment, message: `Reset ${item.label}` });
            }
        });

        promptConfigProvider.refresh();
        vscode.window.showInformationMessage('All prompt configurations have been reset to their default values.');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to set default prompt configuration: ${error}`);
    }
}
async function setDefaultPromptConfigurationItem(item?: PromptConfigItem) {
    try {
        if (!item) {
            item = await promptConfigProvider.showPromptConfigItemQuickPick();
            if (!item) { return; } // User cancelled
        }

        const confirmation = await vscode.window.showWarningMessage(
            `This will overwrite the existing configuration for ${item.label}. Are you sure?`,
            'Yes', 'No'
        );
        if (confirmation === 'Yes') {
            await storageManager.setDefaultPromptConfigurationItem(item);
            promptConfigProvider.refresh();
            vscode.window.showInformationMessage(`Default configuration set for ${item.label}.`);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to set default prompt configuration item: ${error}`);
    }
}
async function openPromptConfigurationItem(item?: PromptConfigItem) {
    try {
        if (!item) {
            item = await promptConfigProvider.showPromptConfigItemQuickPick();
            if (!item) { return; } // User cancelled
        }

        const document = await vscode.workspace.openTextDocument(item.uri);
        await vscode.window.showTextDocument(document);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to open prompt configuration item: ${error}`);
    }
}
async function generatePrompts() {
    try {
        const confirmation = await vscode.window.showWarningMessage(
            'This will regenerate all prompts based on your current configuration. Existing generated prompts will be overwritten. Do you want to continue?',
            'Yes', 'No'
        );
        
        if (confirmation !== 'Yes') {
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating prompts...",
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0 });
            
            // Generate each prompt
            const promptItems = await promptGenerationProvider.getPromptItems();
            const increment = 100 / promptItems.length;
            
            for (const item of promptItems) {
                await storageManager.generatePromptItem(item);
                progress.report({ increment, message: `Generated ${item.label}` });
            }
        });

        promptGenerationProvider.refresh();
        vscode.window.showInformationMessage('All prompts have been generated successfully.');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to generate prompts: ${error}`);
    }
}
async function generatePromptItem(item?: GeneratedPromptItem) {
    try {
        if (!item) {
            item = await promptGenerationProvider.showGeneratedPromptItemQuickPick();
            if (!item) { return; } // User cancelled
        }

        const confirmation = await vscode.window.showWarningMessage(
            `This will regenerate the prompt for ${item.label} and overwrite the existing one. Continue?`,
            'Yes', 'No'
        );
        if (confirmation === 'Yes') {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Generating prompt for ${item.label}...`,
                cancellable: false
            }, async (progress) => {
                await storageManager.generatePromptItem(item, progress);
            });
            promptGenerationProvider.refresh();
            vscode.window.showInformationMessage(`Prompt for ${item.label} generated successfully.`);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to generate prompt item: ${error}`);
    }
}

async function openGeneratedPromptItem(item?: GeneratedPromptItem) {
    try {
        if (!item) {
            item = await promptGenerationProvider.showGeneratedPromptItemQuickPick();
            if (!item) { return; } // User cancelled
        }

        const document = await vscode.workspace.openTextDocument(item.uri);
        await vscode.window.showTextDocument(document);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to open generated prompt item: ${error}`);
    }
}

async function copyGeneratedPromptItemToClipboard(item?: GeneratedPromptItem) {
    try {
        if (!item) {
            item = await promptGenerationProvider.showGeneratedPromptItemQuickPick();
            if (!item) { return; } // User cancelled
        }

        const content = await vscode.workspace.fs.readFile(item.uri);
        await vscode.env.clipboard.writeText(content.toString());
        vscode.window.showInformationMessage(`Content of ${item.label} copied to clipboard.`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to copy generated prompt item to clipboard: ${error}`);
    }
}

async function openGeneratedPromptItemFileInFileManager(item?: GeneratedPromptItem) {
    try {
        if (!item) {
            item = await promptGenerationProvider.showGeneratedPromptItemQuickPick();
            if (!item) { return; } // User cancelled
        }

        await vscode.env.openExternal(vscode.Uri.file(item.uri.fsPath));
        vscode.window.showInformationMessage(`Opened ${item.label} in file manager.`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to open generated prompt item in file manager: ${error}`);
    }
}

async function openGeneratedPromptFolderInFileManager() {
    try {
        const folderUri = await storageManager.getGeneratedPromptFolderUri();
        await vscode.env.openExternal(vscode.Uri.file(folderUri.fsPath));
        vscode.window.showInformationMessage('Opened generated prompt folder in file manager.');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to open generated prompt folder: ${error}`);
    }
}


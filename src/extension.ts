import * as vscode from 'vscode';
import { ProjectInfoProvider } from './ui/projectInfoProvider';
import { PromptOutTreeProvider } from './ui/promptOutTreeProvider';
import { ConfigurationManager } from './utils/configurationManager';
import { FileManager } from './utils/fileManager';


import { PROJECT_INFO_ITEMS } from './ui/projectInfo/structureConfig';

let outputChannel: vscode.OutputChannel;
let projectInfoProvider: ProjectInfoProvider;
let promptOutTreeProvider: PromptOutTreeProvider;
let promptOutTreeView: vscode.TreeView<vscode.TreeItem>;

export async function activate(context: vscode.ExtensionContext) {
    // Create and store the output channel
    outputChannel = vscode.window.createOutputChannel('Prompt Scaffold');
    context.subscriptions.push(outputChannel);

    // Log activation
    outputChannel.appendLine('Prompt Scaffold extension is activating.');

    
    const configManager = new ConfigurationManager();
    const fileManager = new FileManager(configManager);
    
    async function setupProviders() {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            vscode.window.showWarningMessage('Prompt Scaffold: No workspace folder is open. Some features may be limited.');
            return;
        }
    
        // Initialize providers if they don't exist
        if (!projectInfoProvider) {
            projectInfoProvider = new ProjectInfoProvider(outputChannel, PROJECT_INFO_ITEMS, configManager, fileManager);
            await projectInfoProvider.initialize();
        }
    
        if (!promptOutTreeProvider) {
            promptOutTreeProvider = new PromptOutTreeProvider(outputChannel, configManager, fileManager);
        }
    
        // Create tree views if they don't exist
        if (!context.subscriptions.find(d => d.dispose === projectInfoProvider?.dispose)) {
            context.subscriptions.push(
                vscode.window.createTreeView('sidebar-project-info', { 
                    treeDataProvider: projectInfoProvider,
                    showCollapseAll: true
                })
            );
        }
    
        if (!promptOutTreeView) {
            promptOutTreeView = vscode.window.createTreeView('sidebar-out-files', { 
                treeDataProvider: promptOutTreeProvider,
                showCollapseAll: false
            });
            context.subscriptions.push(promptOutTreeView);
        }
    }

    async function updateExtensionState() {
        const isEnabled = configManager.isExtensionEnabled();
        if (isEnabled) {
            outputChannel.appendLine('Enabling Prompt Scaffold extension.');
            vscode.commands.executeCommand('setContext', 'promptScaffoldEnabled', true);
        } else {
            outputChannel.appendLine('Disabling Prompt Scaffold extension.');
            vscode.commands.executeCommand('setContext', 'promptScaffoldEnabled', false);
        }
        
        if (!projectInfoProvider || !promptOutTreeProvider) {
            await setupProviders();
        }
    }

    await updateExtensionState();

    // Watch for workspace folder changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(setupProviders)
    );

    // Watch for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('promptScaffold.enabled')) {
                updateExtensionState();
            }
        })
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('promptScaffold.initializeConfig', initializeConfig),
        vscode.commands.registerCommand('promptScaffold.openProjectInfoFile', openProjectInfoFile),
        vscode.commands.registerCommand('promptScaffold.openPromptOutFile', 
                (uri: vscode.Uri) => { vscode.commands.executeCommand('vscode.open', uri); }
            ),
        vscode.commands.registerCommand('promptScaffold.generatePromptOutFiles', generatePromptOutFiles),
        vscode.commands.registerCommand('promptScaffold.openPromptOutFolder', openPromptOutFolder),
        vscode.commands.registerCommand('promptScaffold.toggleExtension', toggleExtension),
        vscode.commands.registerCommand('promptScaffold.refreshExtension', updateExtensionState)
    );

    async function initializeConfig() {
        const validationErrors = configManager.validateConfiguration();
        if (validationErrors.length > 0) {
            vscode.window.showErrorMessage(`Prompt Scaffold configuration errors:\n${validationErrors.join('\n')}`);
            return;
        }
        try {
            await configManager.ensureOutputDirectoryExists();
            vscode.window.showInformationMessage('Prompt Scaffold configuration initialized successfully.');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while initializing the configuration.';
            vscode.window.showErrorMessage(`Failed to initialize configuration: ${errorMessage}`);
        }
    }

    async function openProjectInfoFile(item: any) {
        if (projectInfoProvider instanceof ProjectInfoProvider) {
            await projectInfoProvider.openProjectInfoFile(item);
        } else {
            vscode.window.showErrorMessage("Extension object projectInfoProvider is not an instance of ProjectInfoProvider");
        }
    }

    async function generatePromptOutFiles() {
        updateViewTitleState('generating');
        try {
            await fileManager.refreshAllFiles();
            vscode.window.showInformationMessage('Prompt out files generated successfully.');
            promptOutTreeProvider.refresh();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            vscode.window.showErrorMessage(`Error generating prompt out files: ${errorMessage}`);
        } finally {
            updateViewTitleState('default');
        }
    }

    async function openPromptOutFolder() {
        updateViewTitleState('opening');
        const outDir = configManager.getOutDirectorySystemPath();    
        const folderUri = vscode.Uri.file(outDir);            
        try {
            await vscode.env.openExternal(folderUri);
            vscode.window.showInformationMessage(`Opened folder: ${outDir}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open folder: ${error}`);
        } finally {
            updateViewTitleState('default');
        }
    }

    function updateViewTitleState(state: 'default' | 'generating' | 'opening' = 'default') {
        switch (state) {
            case 'generating':
                promptOutTreeView.message = "Generating files...";
                promptOutTreeView.title = "Prompt Files (Generating...)";
                break;
            case 'opening':
                promptOutTreeView.message = "Opening folder...";
                promptOutTreeView.title = "Prompt Files (Opening...)";
                break;
            default:
                promptOutTreeView.message = undefined;
                promptOutTreeView.title = "Prompt Files";
                break;
        }
    }

    async function toggleExtension() {
        const currentValue = configManager.isExtensionEnabled();
        await vscode.workspace.getConfiguration('promptScaffold').update('enabled', !currentValue, vscode.ConfigurationTarget.Global);
        await updateExtensionState();

        // const currentValue = configManager.isExtensionEnabled();
        // await vscode.workspace.getConfiguration('promptScaffold').update('enabled', !currentValue, vscode.ConfigurationTarget.Global);
    }

    outputChannel.appendLine('Prompt Scaffold extension activated.');
}


export function deactivate() {
    if (outputChannel) { outputChannel.dispose(); }
    if (projectInfoProvider) { projectInfoProvider.dispose(); }
    if (promptOutTreeProvider) { promptOutTreeProvider.dispose(); }
}

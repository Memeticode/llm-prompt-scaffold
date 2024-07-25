import * as vscode from 'vscode';
import { ConfigurationManager } from './managers/configurationManager';
import { FileSystemManager } from './managers/fileSystemManager';
import { ExtensionStorageFolderManager } from './managers/extensionStorageFolderManager';

// import { ProjectInfoProvider } from './ui/projectInfoProvider';
// import { PromptOutTreeProvider } from './ui/promptOutTreeProvider';

// import { PROJECT_INFO_ITEMS } from './config/projectInfoSidebarItems';

let outputChannel: vscode.OutputChannel;
export async function activate(context: vscode.ExtensionContext) {
    // Create and store the output channel
    outputChannel = vscode.window.createOutputChannel('Prompt Scaffold');
    context.subscriptions.push(outputChannel);

    // Log activation
    outputChannel.appendLine('Prompt Scaffold extension is activating.');

    const configManager = new ConfigurationManager("ConfigurationManager", outputChannel, context);  
    outputChannel.appendLine('Initialized ConfigurationManager...');
    
    const fileSystemManager = new FileSystemManager("FileSystemManager", outputChannel, configManager);
    outputChannel.appendLine('Initialized FileSystemManager...');
    
    const extensionStorageFolderManager = new ExtensionStorageFolderManager("ExtensionStorageFolderManager", outputChannel, configManager, fileSystemManager);
    outputChannel.appendLine('Initialized ExtensionStorageFolderManager...');


    // Register the storage folder name change delegate
    configManager.setStorageFolderNameChangeDelegate(
        extensionStorageFolderManager.handleStorageFolderNameConfigurationChangeAsync.bind(extensionStorageFolderManager)
    );


    // Initialize all current workspaces
    if (vscode.workspace.workspaceFolders) {
        await extensionStorageFolderManager.initializeStorageFoldersAsync();
    }


    // Listen for workspace folder changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
            for (const folder of event.added) {
                await extensionStorageFolderManager.initializeStorageFolderAsync(folder);
                outputChannel.appendLine(`Initialized new workspace: ${folder.name}`);
            }
            
            const newRootWorkspace = vscode.workspace.workspaceFolders?.[0];
            const oldRootWorkspace = event.removed.find(folder => extensionStorageFolderManager.isRootWorkspace(folder));
            
            if (newRootWorkspace && oldRootWorkspace && newRootWorkspace !== oldRootWorkspace) {
                await extensionStorageFolderManager.handleRootWorkspaceChangeAsync(oldRootWorkspace, newRootWorkspace);
                outputChannel.appendLine(`Root workspace changed from ${oldRootWorkspace.name} to ${newRootWorkspace.name}`);
            }
    
            // Check for project-info and out folders after workspace changes
            await extensionStorageFolderManager.validateStorageFoldersAsync();
        })
    );

    // Command to manually trigger workspace initialization
    context.subscriptions.push(
        vscode.commands.registerCommand('promptScaffold.initializeWorkspaces', async () => {
            if (vscode.workspace.workspaceFolders) {
                await extensionStorageFolderManager.initializeStorageFoldersAsync();
                //vscode.window.showInformationMessage('Workspaces initialized successfully.');
            } else {
                vscode.window.showWarningMessage('No workspaces found to initialize.');
            }
        })
    );

    // Command to show the current root workspace
    context.subscriptions.push(
        vscode.commands.registerCommand('promptScaffold.showRootWorkspace', () => {
            const rootWorkspace = vscode.workspace.workspaceFolders?.[0];
            if (rootWorkspace) {
                vscode.window.showInformationMessage(`Current root workspace: ${rootWorkspace.name}`);
                outputChannel.appendLine(`Current root workspace: ${rootWorkspace.name}`);
            } else {
                vscode.window.showWarningMessage('No root workspace found.');
                outputChannel.appendLine('No root workspace found.');
            }
        })
    );

    // Command to refresh storage folders
    context.subscriptions.push(
        vscode.commands.registerCommand('promptScaffold.refreshStorageFolders', async () => {
            await extensionStorageFolderManager.refreshStorageFoldersAsync();
            vscode.window.showInformationMessage('Storage folders refreshed successfully.');
        })
    );

    outputChannel.appendLine('Prompt Scaffold extension activated successfully.');
}

export function deactivate() {
    outputChannel.appendLine('Prompt Scaffold extension is deactivating.');
    if (outputChannel) { outputChannel.dispose(); }
    outputChannel.appendLine('Prompt Scaffold extension deactivated successfully.');
}


/*
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
            updateExtensionState();
    }));

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('promptScaffold.initializeConfig', initializeConfig),
        vscode.commands.registerCommand('promptScaffold.openProjectInfoFile', openProjectInfoFile),
        vscode.commands.registerCommand('promptScaffold.openPromptOutFile', 
                (uri: vscode.Uri) => { vscode.commands.executeCommand('vscode.open', uri); }
            ),
        vscode.commands.registerCommand('promptScaffold.generatePromptOutFiles', generatePromptOutFiles),
        vscode.commands.registerCommand('promptScaffold.openPromptOutFolder', openPromptOutFolder),
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


    outputChannel.appendLine('Prompt Scaffold extension activation completed.');
}
    


export function deactivate() {
    if (outputChannel) { outputChannel.dispose(); }
    if (projectInfoProvider) { projectInfoProvider.dispose(); }
    if (promptOutTreeProvider) { promptOutTreeProvider.dispose(); }
}
*/
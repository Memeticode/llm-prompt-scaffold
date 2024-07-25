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

    outputChannel.appendLine('Prompt Scaffold extension is activating.');

    // Init managers
    const configManager = new ConfigurationManager("ConfigurationManager", outputChannel, context);  
    outputChannel.appendLine('Initialized ConfigurationManager...');
    
    const fileSystemManager = new FileSystemManager("FileSystemManager", outputChannel, configManager);
    outputChannel.appendLine('Initialized FileSystemManager...');
    
    const extensionStorageFolderManager = new ExtensionStorageFolderManager("ExtensionStorageFolderManager", outputChannel, configManager, fileSystemManager);
    outputChannel.appendLine('Initialized ExtensionStorageFolderManager...');
    
    // Register manager delegates
    configManager.setStorageFolderNameChangeDelegate(
        extensionStorageFolderManager.handleStorageFolderNameConfigurationChangeAsync.bind(extensionStorageFolderManager)
    );
    configManager.setRefreshStorageFolderDelegate(
        extensionStorageFolderManager.refreshStorageFolderAsync.bind(extensionStorageFolderManager)
    );

    // Initialize configuration for the entire workspace
    await configManager.initializeWorkspaceConfiguration();
    
    // Initialize storage directories (also handles workspace root folder change)
    await ExtensionUtils.initializeWorkspaceStorageFoldersAsync(context, outputChannel, extensionStorageFolderManager);


    // Listen for workspace folder changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {

            // Log changes
            outputChannel.appendLine('Workspace folders changed:');
            for (const folder of event.added) { outputChannel.appendLine(`New workspace added: ${folder.name}`); }
            for (const folder of event.removed) { outputChannel.appendLine(`Workspace removed: ${folder.name}`); }

            // Reinitialize storage directories
            await ExtensionUtils.initializeWorkspaceStorageFoldersAsync(context, outputChannel, extensionStorageFolderManager);

            outputChannel.appendLine('Storage directories reinitialized after workspace changes.');
        })
    );

    // Command to manually trigger workspace initialization/refresh
    context.subscriptions.push(
        vscode.commands.registerCommand('promptScaffold.initializeWorkspaceStorageFolders', async () => {
            if (vscode.workspace.workspaceFolders) {
                await extensionStorageFolderManager.initializeStorageFoldersAsync();
            } else {
                vscode.window.showWarningMessage('No workspaces found to initialize.');
            }
        })
    );

    outputChannel.appendLine('Prompt Scaffold extension activated successfully.');
}

export function deactivate() {
    outputChannel.appendLine('Prompt Scaffold extension is deactivating.');
    if (outputChannel) { outputChannel.dispose(); }
    outputChannel.appendLine('Prompt Scaffold extension deactivated successfully.');
}


export class ExtensionUtils {

    // Handles creating storage directories and when workspace root folder changes
    // Should perhaps be moved into extensionStorageFolderManager at some point
    static async initializeWorkspaceStorageFoldersAsync(
        context: vscode.ExtensionContext,
        outputChannel: vscode.OutputChannel,
        extensionStorageFolderManager: ExtensionStorageFolderManager
    ): Promise<void> {
        
        // get unique workspace id from workspace code folder
        const workspaceId = vscode.workspace.workspaceFile?.fsPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        if (!workspaceId) {
            outputChannel.appendLine('No valid workspace found. Unable to initialize workspace storage files. Exiting initialization.');
            return;
        }
        
        // check if previous root workspace has changed
        const { previousRootWorkspace, currentRootWorkspace } = this.getRootWorkspaces(context, workspaceId);
        if (!!previousRootWorkspace && !!currentRootWorkspace && previousRootWorkspace !== currentRootWorkspace) {
            outputChannel.appendLine(`Workspace root directory has changed. Current: ${currentRootWorkspace}, Prior: ${previousRootWorkspace}`);
            await this.migrateWorkspaceAsync(extensionStorageFolderManager, previousRootWorkspace, currentRootWorkspace);
        }

        // cache current workspace root folder, associated with workspace id
        // must use global storage because the workspace reloads on root folder change  
        this.updateStoredRootWorkspace(context, workspaceId, currentRootWorkspace);

        // Initialize workspace folders
        if (vscode.workspace.workspaceFolders) {
            await extensionStorageFolderManager.initializeStorageFoldersAsync();
        }

    }

    private static getRootWorkspaces(context: vscode.ExtensionContext, workspaceId: string): { previousRootWorkspace: string | undefined, currentRootWorkspace: string | null } {
        const previousRootWorkspaces = context.globalState.get<Record<string, string>>('previousRootWorkspaces') || {};
        return {
            previousRootWorkspace: previousRootWorkspaces[workspaceId],
            currentRootWorkspace: vscode.workspace.workspaceFolders?.[0]?.uri.toString() ?? null
        };
    }
    private static async migrateWorkspaceAsync(extensionStorageFolderManager: ExtensionStorageFolderManager, previousRootWorkspace: string, currentRootWorkspace: string): Promise<void> {
        const getWorkspaceName = (uriString: string): string => vscode.Uri.parse(uriString).path.split('/').pop() || '';
        await extensionStorageFolderManager.handleRootWorkspaceChangeAsync(
            { uri: vscode.Uri.parse(previousRootWorkspace), name: getWorkspaceName(previousRootWorkspace), index: 0 },
            { uri: vscode.Uri.parse(currentRootWorkspace), name: getWorkspaceName(currentRootWorkspace), index: 0 }
        );
    }

    private static updateStoredRootWorkspace(context: vscode.ExtensionContext, workspaceId: string, currentRootWorkspace: string | null): void {
        if (currentRootWorkspace) {
            const previousRootWorkspaces = context.globalState.get<Record<string, string>>('previousRootWorkspaces') || {};
            previousRootWorkspaces[workspaceId] = currentRootWorkspace;
            context.globalState.update('previousRootWorkspaces', previousRootWorkspaces);
        }
    }
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
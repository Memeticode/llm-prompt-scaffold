import * as vscode from 'vscode';
import { BaseLoggable } from '../shared/base/baseLoggable';
import { ExtensionStorageManager } from '../managers/extensionStorageManager';
import { ExtensionStateManager } from '../managers/extensionStateManager';
import { PromptConfigFileKey } from '../extension/types';

export class PromptConfigWebview extends BaseLoggable {
    public static instance: PromptConfigWebview | undefined;
    private _panel: vscode.WebviewPanel | undefined;
    private _disposables: vscode.Disposable[] = [];

    private constructor(
        logName: string,
        outputChannel: vscode.OutputChannel,
        private readonly extensionUri: vscode.Uri,
        private readonly storageManager: ExtensionStorageManager,
        private readonly stateManager: ExtensionStateManager
    ) {
        super(logName, outputChannel);
    }
    
    public static hasInstance(): boolean
    {
        if (PromptConfigWebview.instance) { return true; }
        return false;
    }

    public static getInstance(
        logName: string,
        outputChannel: vscode.OutputChannel,
        extensionUri: vscode.Uri,
        storageManager: ExtensionStorageManager,
        stateManager: ExtensionStateManager
    ): PromptConfigWebview {
        if (!PromptConfigWebview.instance) {
            PromptConfigWebview.instance = new PromptConfigWebview(
                logName,
                outputChannel,
                extensionUri,
                storageManager,
                stateManager
            );
        }
        return PromptConfigWebview.instance;
    }

    public async show() {
        if (!this._panel) {
            await this.initialize();
        }
        this._panel?.reveal();
    }

    private async initialize() {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        this._panel = vscode.window.createWebviewPanel(
            'promptConfigWebview',
            'LLM Prompt Configuration',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')]
            }
        );

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        
        this.logMessage("Initializing webview content");
        this._panel.webview.html = this._getInitialWebviewContent(this._panel.webview, this.extensionUri);
        this._setWebviewMessageListener(this._panel.webview);
        this.logMessage("Webview content initialized");
    }

    private _getInitialWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'main.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'style.css'));
    
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleUri}" rel="stylesheet">
            <title>LLM Prompt Configuration</title>
        </head>
        <body>
            <div id="header-section">
                <header>
                    <h1>Prompt Configuration</h1>
                </header>
                <div class="global-actions" role="toolbar" aria-label="Global actions">
                    <button id="expandAllButton" aria-label="Expand all sections">Expand All</button>
                    <button id="collapseAllButton" aria-label="Collapse all sections">Collapse All</button>
                    <button id="saveAllButton" aria-label="Save all sections">Save All</button>
                </div>
            </div>
            <main id="content">
                <section id="systemPrompt" class="content-section">
                    <div class="content-section-header" role="button" aria-expanded="false" tabindex="0">
                        <h2>System Prompt</h2>
                        <div class="content-section-buttons">
                            <button class="save-btn" data-section="systemPrompt" aria-label="Save System Prompt">Save</button>
                        </div>
                    </div>
                    <div class="content-section-content" hidden>
                        <p class="content-section-description"></p>
                        <div class="content-section-body" aria-live="polite">Loading...</div>
                    </div>
                </section>
                <section id="projectDescription" class="content-section">
                    <div class="content-section-header" role="button" aria-expanded="false" tabindex="0">
                        <h2>Project Description</h2>
                        <div class="content-section-buttons">
                            <button class="save-btn" data-section="projectDescription" aria-label="Save Project Description">Save</button>
                        </div>
                    </div>
                    <div class="content-section-content" hidden>
                        <p class="content-section-description"></p>
                        <div class="content-section-body" aria-live="polite">Loading...</div>
                    </div>
                </section>
                <section id="currentGoals" class="content-section">
                    <div class="content-section-header" role="button" aria-expanded="false" tabindex="0">
                        <h2>Current Goals</h2>
                        <div class="content-section-buttons">
                            <button class="save-btn" data-section="currentGoals" aria-label="Save Current Goals">Save</button>
                        </div>
                    </div>
                    <div class="content-section-content" hidden>
                        <p class="content-section-description"></p>
                        <div class="content-section-body" aria-live="polite">Loading...</div>
                    </div>
                </section>
            </main>
            <script src="${scriptUri}"></script>
            <script>
                const vscode = acquireVsCodeApi();
                vscode.postMessage({ command: 'requestContent' });
            </script>
        </body>
        </html>`;
    }


    private readonly sectionDescriptions: Record<string, string> = {
        'SYSTEM_PROMPT': 'Defines the base behavior and capabilities of the AI model.',
        'PROJECT_DESCRIPTION': 'Provides context about the project the AI is assisting with.',
        'SESSION_GOALS': 'Specifies the current objectives or tasks for the AI to focus on.'
    };

    private _setWebviewMessageListener(webview: vscode.Webview) {
        webview.onDidReceiveMessage(
            async (message) => {
                try {
                    switch (message.command) {
                        case 'requestContent':
                            await this._loadAllSections(webview);
                            break;
                        case 'saveConfig':
                            await this._savePromptConfigs(message.config);
                            webview.postMessage({ command: 'saveComplete' });
                            break;
                        case 'expandAll':
                        case 'collapseAll':
                        case 'toggleSection':
                            // No backend action needed, handled in frontend
                            break;
                        case 'saveSection':
                            await this._savePromptConfig(message.section, message.content);
                            webview.postMessage({ command: 'saveComplete', section: message.section });
                            break;
                        default:
                            this.logError(`Unknown command received: ${message.command}`);
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
                    this.logError(`Error processing command ${message.command}: ${errorMessage}`);
                    webview.postMessage({ command: 'error', message: errorMessage });
                }
            },
            undefined,
            this._disposables
        );
    }

    private _getSectionId(section: PromptConfigFileKey): string {
        return section.toLowerCase().replace(/_/g, '');
    }

    private _getSectionDescription(section: PromptConfigFileKey): string {
        return this.sectionDescriptions[section.toString()] || '';
    }
    
    private async _loadAllSections(webview: vscode.Webview) {
        const sections: PromptConfigFileKey[] = ['SYSTEM_PROMPT', 'PROJECT_DESCRIPTION', 'SESSION_GOALS'];
        for (const section of sections) {
            this.logMessage(`Starting to load content for: ${section}`);
            await this._loadSection(webview, section);
            this.logMessage(`Finished loading attempt for: ${section}`);
        }
    }    

    private async _loadSection(webview: vscode.Webview, section: PromptConfigFileKey) {
        const workspace = this.stateManager.getActiveWorkspace();
        if (!workspace) {
            this.logError('No active workspace found.');
            webview.postMessage({
                command: 'updateSection',
                section: this._getSectionId(section),
                error: 'No active workspace found',
                description: this._getSectionDescription(section)
            });
            return;
        }
    
        try {
            this.logMessage(`Attempting to read content for: ${section}`);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Loading timeout')), 2000)
            );
            const contentPromise = this.storageManager.readPromptConfigFileContentAsync(workspace, section);
            
            const content = await Promise.race([contentPromise, timeoutPromise]);
            
            this.logMessage(`Successfully read content for: ${section}`);
            webview.postMessage({
                command: 'updateSection',
                section: this._getSectionId(section),
                content: content as string,
                description: this._getSectionDescription(section)
            });
            this.logMessage(`Sent update message for: ${section}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this.logError(`Error loading ${section}: ${errorMessage}`);
            webview.postMessage({
                command: 'updateSection',
                section: this._getSectionId(section),
                error: `An error occurred loading the ${this._getSectionId(section)}: ${errorMessage}`,
                description: this._getSectionDescription(section)
            });
        }
    }



    private async _savePromptConfig(sectionId: string, content: string): Promise<void> {
        const workspace = this.stateManager.getActiveWorkspace();
        if (!workspace) {
            throw new Error('No active workspace found.');
        }
    
        const fileKey = this._getFileKeyFromSectionId(sectionId);
        
        await this.storageManager.writePromptConfigFileContentAsync(workspace, fileKey, content);
        this.logMessage(`Saved ${fileKey} configuration.`);
    }
    
    private async _savePromptConfigs(config: Record<string, string>): Promise<void> {
        for (const [sectionId, content] of Object.entries(config)) {
            await this._savePromptConfig(sectionId, content);
        }
    }
    
    private _getFileKeyFromSectionId(sectionId: string): PromptConfigFileKey {
        switch (sectionId.toLowerCase()) {
            case 'systemprompt': return 'SYSTEM_PROMPT';
            case 'projectdescription': return 'PROJECT_DESCRIPTION';
            case 'currentgoals': return 'SESSION_GOALS';
            default: throw new Error(`Invalid section ID: ${sectionId}`);
        }
    }

    public dispose() {
        PromptConfigWebview.instance = undefined;
        this._panel?.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            disposable?.dispose();
        }
        super.dispose();
    }
}
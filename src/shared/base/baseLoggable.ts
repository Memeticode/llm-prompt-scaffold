
import * as vscode from 'vscode';

export class BaseLoggable implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];

    constructor(
        //readonly config: vscode.WorkspaceConfiguration,
        readonly logName: string,
        readonly outputChannel: vscode.OutputChannel
    ) { }

    logMessage(message: string): void {
        if (this.outputChannel)
        {
            let logPrefix = this.logName ? `${this.logName} - ` : '';
            this.outputChannel.appendLine(`${logPrefix}${message ? message : ''}`);
        }
    }    

    logError(message: string): void {
        if (this.outputChannel)
        {
            let logPrefix = this.logName ? `${this.logName} - ` : '';
            this.outputChannel.appendLine(`${logPrefix}ERROR - ${message ? message : ''}`);
        }
    }

    dispose(): void {
        this.logMessage(`Disposing..`);
        try {
            // Dispose of all disposables
            this.disposables.forEach(d => d.dispose());
            this.disposables = [];
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            this.logError(`An error occurred when disposing ${this.logName}': ${errorMessage}`);
            throw error;
        }
    }

    // Method to add additional disposables
    protected addDisposable(disposable: vscode.Disposable): void {
        this.disposables.push(disposable);
    }
}
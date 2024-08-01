
import * as vscode from 'vscode';

export class BaseLogable {
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
}
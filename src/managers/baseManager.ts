import * as path from 'path';
import * as vscode from 'vscode';

export class BaseManager {
    constructor(
        private logName: string,
        private outputChannel: vscode.OutputChannel
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
    async isValidFilePathAsync(filePath: string): Promise<boolean> {
        //this.logMessage(`Invoked isValidFilePathAsync for path: ${filePath}`);
        
        try {
            // Check if the path is absolute
            if (!path.isAbsolute(filePath)) {
                this.logMessage(`isValidFilePathAsync: Invalid file path because it's not an absolute path`);
                return false;
            }
    
            // Normalize the path to handle different OS path styles
            const normalizedPath = path.normalize(filePath);
    
            // Check if the path contains any invalid characters
            // const invalidChars = /[<>:"|?*]/;
            // const foundInvalidChars = normalizedPath.match(invalidChars);
    
            // if (foundInvalidChars) {
            //     this.logMessage(`isValidFilePathAsync: Invalid file path due to invalid characters: ${foundInvalidChars.join(' ')}`);
            //     return false;
            // }
    
            //this.logMessage(`isValidFilePathAsync: Valid file path!`);
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            // If there's an error (e.g., directory doesn't exist), the path is invalid
            this.logMessage(`isValidFilePathAsync: Invalid file path due to error: ${errorMessage}`);
            return false;
        }
    }
    
    
}

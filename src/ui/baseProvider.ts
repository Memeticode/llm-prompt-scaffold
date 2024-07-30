import * as vscode from 'vscode';
import { BaseLogger } from '../utils/baseLogger';

export class BaseProvider extends BaseLogger {
    constructor(
        logName: string,
        outputChannel: vscode.OutputChannel
    ) {
        super(logName, outputChannel);
    }
}

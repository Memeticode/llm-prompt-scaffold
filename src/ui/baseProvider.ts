import * as vscode from 'vscode';
import { BaseLogable } from '../utils/baseLogger';

export class BaseProvider extends BaseLogable {
    constructor(
        logName: string,
        outputChannel: vscode.OutputChannel
    ) {
        super(logName, outputChannel);
    }
}

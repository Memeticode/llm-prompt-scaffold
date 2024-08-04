
import * as vscode from 'vscode';
import { BaseLoggable } from './baseLoggable';


export enum ClearCommandQueueStrategy {
    ClearAll,              // Clear all commands, including the currently executing one
    ClearEnqueued,         // Clear only enqueued commands, let the current one finish
    CancelCurrentAndClear  // Cancel the current command and clear all enqueued commands
}

interface CommandInfo {
    name: string;
    args?: any[];
    startTime: number;
    duration?: number;
    status: 'queued' | 'executing' | 'completed' | 'failed' | 'cancelled';
}

/**
 * BaseCommander provides a foundation for managing and executing commands sequentially via a queue
 * It ensures that only one command runs at a time and provides logging and error handling.
 */
export class BaseCommandQueue extends BaseLoggable {
    private commandQueue: Promise<any> = Promise.resolve();
    private isExecuting: boolean = false;
    private currentCancellationToken: vscode.CancellationTokenSource | null = null;
    private currentCommandInfo: CommandInfo | null = null;
    private commandHistory: CommandInfo[] = [];


    constructor(
        logName: string,
        outputChannel: vscode.OutputChannel,
        private maxHistoryLength: number = 100
    ) {
        super(logName, outputChannel);
    }

    /**
     * Executes a command function, ensuring it runs after any previously queued commands.
     * @param commandFunc The command function to execute.
     * @param args Arguments to pass to the command function.
     * @returns A promise that resolves with the result of the command function.
     */
    protected async queueCommand<T>(
        commandFunc: (cancellationToken: vscode.CancellationToken, ...args: any[]) => Promise<T>,
        includeCommandArgs: boolean = false,
        trackCommandProcessing: boolean = true,
        ...args: any[]
    ): Promise<T> {
        const commandInfo: CommandInfo = {
            name: commandFunc.name,
            startTime: Date.now(),
            status: 'queued'
        };

        if (includeCommandArgs) {
            commandInfo.args = args;
        }

        if (trackCommandProcessing) {
            this.addToHistory(commandInfo);
        }

        return new Promise<T>((resolve, reject) => {
            this.commandQueue = this.commandQueue
                .then(async () => {
                    this.isExecuting = true;
                    this.currentCommandInfo = commandInfo;
                    this.currentCommandInfo.status = 'executing';
                    this.currentCancellationToken = new vscode.CancellationTokenSource();
                    this.logMessage(`Executing command: ${commandInfo.name}`);
                    
                    try {
                        const result = await commandFunc(this.currentCancellationToken.token, ...args);
                        this.logMessage(`Command ${commandInfo.name} executed successfully`);
                        commandInfo.status = 'completed';
                        resolve(result);
                        return result;
                    } catch (error) {
                        if (error instanceof vscode.CancellationError) {
                            this.logMessage(`Command ${commandInfo.name} was cancelled`);
                            commandInfo.status = 'cancelled';
                        } else {
                            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
                            this.logError(`Error executing command ${commandInfo.name}: ${errorMessage}`);
                            commandInfo.status = 'failed';
                        }
                        reject(error);
                        throw error;
                    } finally {
                        this.isExecuting = false;
                        if (this.currentCancellationToken) {
                            this.currentCancellationToken.dispose();
                        }
                        this.currentCancellationToken = null;
                        this.currentCommandInfo = null;
                        commandInfo.duration = Date.now() - commandInfo.startTime;
                        if (trackCommandProcessing) {
                            this.updateHistory(commandInfo);
                        }
                    }
                })
                .catch(error => {
                    this.logError(`Unhandled error in command queue: ${error}`);
                    this.isExecuting = false;
                    this.currentCancellationToken = null;
                    this.currentCommandInfo = null;
                });
        });
    }

    private addToHistory(commandInfo: CommandInfo): void {
        this.commandHistory.push(commandInfo);
        if (this.commandHistory.length > this.maxHistoryLength) {
            this.commandHistory.shift();
        }
    }

    private updateHistory(commandInfo: CommandInfo): void {
        const index = this.commandHistory.findIndex(ci => ci.startTime === commandInfo.startTime);
        if (index !== -1) {
            this.commandHistory[index] = commandInfo;
        }
    }

    private cancelCurrentCommand(): void {
        if (this.currentCancellationToken) {
            this.currentCancellationToken.cancel();
            this.logMessage('Cancellation requested for current command');
        } else {
            this.logMessage('No command currently executing to cancel');
        }
    }

    protected async clearQueue(strategy: ClearCommandQueueStrategy = ClearCommandQueueStrategy.ClearEnqueued): Promise<void> {
        switch (strategy) {
            case ClearCommandQueueStrategy.ClearAll:
                this.cancelCurrentCommand();
                this.resetQueue();
                this.logMessage('Cleared all commands, including the currently executing one');
                break;

            case ClearCommandQueueStrategy.ClearEnqueued:
                this.resetQueue();
                this.logMessage('Cleared all enqueued commands, current command (if any) will finish');
                break;

            case ClearCommandQueueStrategy.CancelCurrentAndClear:
                this.cancelCurrentCommand();
                this.resetQueue();
                this.logMessage('Cancelled current command and cleared all enqueued commands');
                break;

            default:
                throw new Error('Invalid clear queue strategy');
        }
    }

    private resetQueue(): void {
        this.commandQueue = Promise.resolve();
        this.commandHistory = [];
    }
    

    get isCommandExecuting(): boolean {
        return this.isExecuting;
    }

    get currentCommand(): CommandInfo | null {
        return this.currentCommandInfo;
    }

    get commandProcessingHistory(): CommandInfo[] {
        return [...this.commandHistory];
    }

    override dispose(): void {
        this.clearQueue();
        if (this.currentCancellationToken) {
            this.currentCancellationToken.dispose();
        }
        super.dispose();
    }
}

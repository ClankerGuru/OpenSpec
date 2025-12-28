import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { CompletionCommand } from '../../src/commands/completion.js';
import * as shellDetection from '../../src/utils/shell-detection.js';
import { ZshInstaller } from '../../src/core/completions/installers/zsh-installer.js';

const mockInstallResult = {
  success: true,
  installedPath: '/home/user/.oh-my-zsh/completions/_openspec',
  isOhMyZsh: true,
  message: 'Completion script installed successfully for Oh My Zsh',
  instructions: [
    'Completion script installed to Oh My Zsh completions directory.',
    'Restart your shell or run: exec zsh',
    'Completions should activate automatically.',
  ],
};

const mockUninstallResult = {
  success: true,
  message: 'Completion script removed from /home/user/.oh-my-zsh/completions/_openspec',
};

describe('CompletionCommand', () => {
  let command: InstanceType<typeof CompletionCommand>;
  let consoleLogSpy: ReturnType<typeof spyOn>;
  let consoleErrorSpy: ReturnType<typeof spyOn>;
  let detectShellSpy: ReturnType<typeof spyOn>;
  let installSpy: ReturnType<typeof spyOn>;
  let uninstallSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    command = new CompletionCommand();
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
    detectShellSpy = spyOn(shellDetection, 'detectShell').mockReturnValue({ shell: 'zsh', detected: 'zsh' });
    installSpy = spyOn(ZshInstaller.prototype, 'install').mockResolvedValue(mockInstallResult as any);
    uninstallSpy = spyOn(ZshInstaller.prototype, 'uninstall').mockResolvedValue(mockUninstallResult);
    process.exitCode = 0;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    detectShellSpy.mockRestore();
    installSpy.mockRestore();
    uninstallSpy.mockRestore();
  });

  describe('generate subcommand', () => {
    it('should generate Zsh completion script to stdout', async () => {
      await command.generate({ shell: 'zsh' });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('#compdef openspec');
      expect(output).toContain('_openspec() {');
    });

    it('should auto-detect Zsh shell when no shell specified', async () => {
      detectShellSpy.mockReturnValue({ shell: 'zsh', detected: 'zsh' });

      await command.generate({});

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('#compdef openspec');
    });

    it('should show error when shell cannot be auto-detected', async () => {
      detectShellSpy.mockReturnValue({ shell: undefined, detected: undefined });

      await command.generate({});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error: Could not auto-detect shell. Please specify shell explicitly.'
      );
      expect(process.exitCode).toBe(1);
    });

    it('should show error for unsupported shell', async () => {
      await command.generate({ shell: 'bash' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: Shell 'bash' is not supported yet. Currently supported: zsh"
      );
      expect(process.exitCode).toBe(1);
    });

    it('should handle shell parameter case-insensitively', async () => {
      await command.generate({ shell: 'ZSH' });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('#compdef openspec');
    });
  });

  describe('install subcommand', () => {
    it('should install Zsh completion script', async () => {
      await command.install({ shell: 'zsh' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completion script installed successfully')
      );
      expect(process.exitCode).toBe(0);
    });

    it('should show verbose output when --verbose flag is provided', async () => {
      await command.install({ shell: 'zsh', verbose: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Installed to:')
      );
    });

    it('should auto-detect Zsh shell when no shell specified', async () => {
      detectShellSpy.mockReturnValue({ shell: 'zsh', detected: 'zsh' });

      await command.install({});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completion script installed successfully')
      );
    });

    it('should show error when shell cannot be auto-detected', async () => {
      detectShellSpy.mockReturnValue({ shell: undefined, detected: undefined });

      await command.install({});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error: Could not auto-detect shell. Please specify shell explicitly.'
      );
      expect(process.exitCode).toBe(1);
    });

    it('should show error for unsupported shell', async () => {
      await command.install({ shell: 'fish' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: Shell 'fish' is not supported yet. Currently supported: zsh"
      );
      expect(process.exitCode).toBe(1);
    });

    it('should display installation instructions', async () => {
      await command.install({ shell: 'zsh' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Restart your shell or run: exec zsh')
      );
    });
  });

  describe('uninstall subcommand', () => {
    it('should uninstall Zsh completion script', async () => {
      await command.uninstall({ shell: 'zsh', yes: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completion script removed')
      );
      expect(process.exitCode).toBe(0);
    });

    it('should auto-detect Zsh shell when no shell specified', async () => {
      detectShellSpy.mockReturnValue({ shell: 'zsh', detected: 'zsh' });

      await command.uninstall({ yes: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completion script removed')
      );
    });

    it('should show error when shell cannot be auto-detected', async () => {
      detectShellSpy.mockReturnValue({ shell: undefined, detected: undefined });

      await command.uninstall({ yes: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error: Could not auto-detect shell. Please specify shell explicitly.'
      );
      expect(process.exitCode).toBe(1);
    });

    it('should show error for unsupported shell', async () => {
      await command.uninstall({ shell: 'powershell', yes: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: Shell 'powershell' is not supported yet. Currently supported: zsh"
      );
      expect(process.exitCode).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should handle installation failures gracefully', async () => {
      installSpy.mockResolvedValueOnce({
        success: false,
        isOhMyZsh: false,
        message: 'Permission denied',
      } as any);

      const cmd = new CompletionCommand();
      await cmd.install({ shell: 'zsh' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Permission denied')
      );
      expect(process.exitCode).toBe(1);
    });

    it('should handle uninstallation failures gracefully', async () => {
      uninstallSpy.mockResolvedValueOnce({
        success: false,
        message: 'Completion script is not installed',
      });

      const cmd = new CompletionCommand();
      await cmd.uninstall({ shell: 'zsh', yes: true });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completion script is not installed')
      );
      expect(process.exitCode).toBe(1);
    });
  });

  describe('shell detection integration', () => {
    it('should show appropriate error when detected shell is unsupported', async () => {
      detectShellSpy.mockReturnValue({ shell: undefined, detected: 'bash' });

      await command.generate({});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: Shell 'bash' is not supported yet. Currently supported: zsh"
      );
      expect(process.exitCode).toBe(1);
    });

    it('should respect explicit shell parameter over auto-detection', async () => {
      detectShellSpy.mockReturnValue({ shell: undefined, detected: 'bash' });

      await command.generate({ shell: 'zsh' });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(output).toContain('#compdef openspec');
    });
  });
});

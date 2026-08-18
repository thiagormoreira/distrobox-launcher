import GObject from 'gi://GObject';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';

// Maps each supported terminal to how it expects to receive the command to run.
const TERMINAL_LAUNCHERS = {
    'ptyxis': (cmd) => `ptyxis -- ${cmd}`,
    'gnome-terminal': (cmd) => `gnome-terminal -- ${cmd}`,
    'kitty': (cmd) => `kitty -- ${cmd}`,
    'alacritty': (cmd) => `alacritty -e ${cmd}`,
    'wezterm': (cmd) => `wezterm start -- ${cmd}`,
};

const DistroboxIndicator = GObject.registerClass(
class DistroboxIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.5, 'Distrobox Launcher');

        this._extension = extension;
        this._settings = extension.getSettings();
        this._refreshTimeoutId = null;
        this._containers = [];

        // Panel icon — two pre-colored SVG variants swapped by running state,
        // since dynamic CSS recoloring is unreliable across icon themes.
        this._iconIdle = Gio.icon_new_for_string(`${extension.path}/icons/distrobox-symbolic.svg`);
        this._iconRunning = Gio.icon_new_for_string(`${extension.path}/icons/distrobox-running-symbolic.svg`);
        this._icon = new St.Icon({
            gicon: this._iconIdle,
            style_class: 'system-status-icon',
        });
        this.add_child(this._icon);

        // Build initial menu
        this._buildMenu();

        // Start periodic refresh
        this._startRefresh();

        // Live-apply refresh interval changes from Preferences
        this._settingsChangedId = this._settings.connect('changed::refresh-interval', () => {
            this._restartRefresh();
        });
    }

    _buildMenu() {
        this.menu.removeAll();

        if (this._containers.length === 0) {
            const emptyItem = new PopupMenu.PopupMenuItem('No distroboxes found');
            emptyItem.label.add_style_class_name('dim-label');
            emptyItem.sensitive = false;
            this.menu.addMenuItem(emptyItem);
        } else {
            for (const container of this._containers) {
                // PopupSubMenuMenuItem expands its submenu inline, fully
                // managed by GNOME Shell — no manual actor/stage parenting
                // needed (a hand-created PopupMenu.PopupMenu here crashes
                // with "this.actor.get_parent() is null" on open()).
                const item = new PopupMenu.PopupSubMenuMenuItem(container.name, true);
                item.icon.gicon = container.running ? this._iconRunning : this._iconIdle;
                item.icon.icon_size = 14;

                const enterItem = new PopupMenu.PopupMenuItem('Enter');
                enterItem.connect('activate', () => {
                    this._enterContainer(container.name);
                });
                item.menu.addMenuItem(enterItem);

                const toggleItem = new PopupMenu.PopupMenuItem(container.running ? 'Stop' : 'Start');
                toggleItem.connect('activate', () => {
                    if (container.running) {
                        this._stopContainer(container.name);
                    } else {
                        this._startContainer(container.name);
                    }
                });
                item.menu.addMenuItem(toggleItem);

                item.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

                const copyItem = new PopupMenu.PopupMenuItem('Copy name');
                copyItem.connect('activate', () => {
                    this._copyToClipboard(container.name);
                });
                item.menu.addMenuItem(copyItem);

                const upgradeItem = new PopupMenu.PopupMenuItem('Upgrade');
                upgradeItem.connect('activate', () => {
                    this._upgradeContainer(container.name);
                });
                item.menu.addMenuItem(upgradeItem);

                const ephemeralItem = new PopupMenu.PopupMenuItem('Ephemeral');
                ephemeralItem.connect('activate', () => {
                    this._ephemeralContainer(container.name);
                });
                item.menu.addMenuItem(ephemeralItem);

                item.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

                const deleteItem = new PopupMenu.PopupMenuItem('Delete');
                deleteItem.label.add_style_class_name('error-label');
                deleteItem.connect('activate', () => {
                    this._showDeleteConfirmation(container.name);
                });
                item.menu.addMenuItem(deleteItem);

                this.menu.addMenuItem(item);
            }
        }

        // Separator
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Refresh button
        const refreshItem = new PopupMenu.PopupMenuItem('Refresh');
        refreshItem.connect('activate', () => {
            this._refreshContainers();
        });
        this.menu.addMenuItem(refreshItem);

        // New distrobox
        const newItem = new PopupMenu.PopupMenuItem('New Distrobox...');
        newItem.connect('activate', () => {
            this._createNewDistrobox();
        });
        this.menu.addMenuItem(newItem);

        // Preferences
        const prefsItem = new PopupMenu.PopupMenuItem('Preferences');
        prefsItem.connect('activate', () => {
            this._extension.openPreferences();
        });
        this.menu.addMenuItem(prefsItem);
    }

    _enterContainer(name) {
        const cmd = this._wrapInTerminal(`distrobox enter ${name}`);
        this._spawnCommand(cmd);
    }

    _startContainer(name) {
        const cmd = `podman start ${name}`;
        this._spawnCommand(cmd, () => {
            GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
                this._refreshContainers();
                return GLib.SOURCE_REMOVE;
            });
        });
    }

    _copyToClipboard(text) {
        const clipboard = St.Clipboard.get_default();
        clipboard.set_text(St.ClipboardType.CLIPBOARD, text);
    }

    _upgradeContainer(name) {
        const terminal = this._settings.get_string('terminal');
        const cmd = this._wrapInTerminal(`distrobox upgrade ${name}`);
        this._spawnCommand(cmd);
    }

    _ephemeralContainer(name) {
        const terminal = this._settings.get_string('terminal');
        const cmd = this._wrapInTerminal(`distrobox ephemeral ${name}`);
        this._spawnCommand(cmd);
    }

    _showDeleteConfirmation(name) {
        // ModalDialog is the supported API for this — it manages its own
        // stage parenting internally, unlike a hand-created PopupMenu.
        const dialog = new ModalDialog.ModalDialog();

        const contentBox = new St.BoxLayout({
            vertical: true,
            style: 'spacing: 6px;',
        });

        contentBox.add_child(new St.Label({
            text: `Delete '${name}'?`,
            style: 'font-weight: bold; font-size: 14px;',
        }));
        contentBox.add_child(new St.Label({
            text: 'This action cannot be undone.',
            style: 'font-size: 12px;',
        }));

        dialog.contentLayout.add_child(contentBox);

        dialog.setButtons([
            {
                label: 'Cancel',
                action: () => dialog.close(),
                key: Clutter.KEY_Escape,
            },
            {
                label: 'Delete',
                action: () => {
                    this._deleteContainer(name);
                    dialog.close();
                },
                default: true,
            },
        ]);

        dialog.open();
    }

    _deleteContainer(name) {
        const cmd = `distrobox rm -f ${name}`;
        this._spawnCommand(cmd, () => {
            GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
                this._refreshContainers();
                return GLib.SOURCE_REMOVE;
            });
        });
    }

    _stopContainer(name) {
        const cmd = `distrobox stop -Y ${name}`;
        this._spawnCommand(cmd, () => {
            GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
                this._refreshContainers();
                return GLib.SOURCE_REMOVE;
            });
        });
    }

    _createNewDistrobox() {
        const terminal = this._settings.get_string('terminal');
        const imageOptions = [
            'registry.fedoraproject.org/fedora:latest',
            'registry.fedoraproject.org/fedora:44',
            'ubuntu:24.04',
            'ubuntu:22.04',
            'archlinux:latest',
            'debian:12',
            'almalinux:9',
        ];
        const imageLabels = [
            'Fedora (latest)',
            'Fedora 44',
            'Ubuntu 24.04',
            'Ubuntu 22.04',
            'Arch Linux',
            'Debian 12',
            'AlmaLinux 9',
        ];

        const innerCmd = `bash -c "
read -p 'Distrobox name: ' name
if [ -z '\\$name' ]; then
  echo 'Name is required'
  exit 1
fi
if ! [[ \\$name =~ ^[a-zA-Z0-9_-]+\\$ ]]; then
  echo 'Invalid name (only letters, numbers, - and _ allowed)'
  exit 1
fi
echo 'Select image (1-7):'
echo '1) Fedora (latest)'
echo '2) Fedora 44'
echo '3) Ubuntu 24.04'
echo '4) Ubuntu 22.04'
echo '5) Arch Linux'
echo '6) Debian 12'
echo '7) AlmaLinux 9'
read -p 'Choice [1]: ' choice
choice=\${choice:-1}
case \\$choice in
  1) image='registry.fedoraproject.org/fedora:latest';;
  2) image='registry.fedoraproject.org/fedora:44';;
  3) image='ubuntu:24.04';;
  4) image='ubuntu:22.04';;
  5) image='archlinux:latest';;
  6) image='debian:12';;
  7) image='almalinux:9';;
  *) echo 'Invalid choice'; exit 1;;
esac
echo 'Creating distrobox \\$name with \\$image...'
distrobox create --name \\$name --image \\$image
echo 'Done! Press Enter to close...'
read
"`;
        const cmd = this._wrapInTerminal(innerCmd);
        this._spawnCommand(cmd, () => {
            GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
                this._refreshContainers();
                return GLib.SOURCE_REMOVE;
            });
        });
    }

    _wrapInTerminal(innerCmd) {
        const terminal = this._settings.get_string('terminal');
        const launcher = TERMINAL_LAUNCHERS[terminal];
        return launcher ? launcher(innerCmd) : `${terminal} -- ${innerCmd}`;
    }

    _spawnCommand(command, callback = null) {
        try {
            const proc = Gio.Subprocess.new(
                ['bash', '-c', command],
                Gio.SubprocessFlags.NONE
            );
            if (callback) {
                proc.wait_check_async(null, (source, result) => {
                    try {
                        source.wait_check_finish(result);
                    } catch (e) {
                        logError(e, 'Distrobox Launcher');
                    }
                    callback();
                });
            }
        } catch (e) {
            logError(e, 'Distrobox Launcher');
        }
    }

    async _refreshContainers() {
        try {
            const proc = Gio.Subprocess.new(
                ['bash', '-c', 'distrobox list --no-color 2>/dev/null'],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );

            const stdout = await new Promise((resolve, reject) => {
                proc.communicate_utf8_async(null, null, (source, result) => {
                    try {
                        const [, stdout] = source.communicate_utf8_finish(result);
                        resolve(stdout);
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            const lines = stdout.trim().split('\n').filter(l => l.trim());
            this._containers = [];

            for (const line of lines) {
                if (line.includes('ID') && line.includes('NAME')) continue;
                if (line.match(/^[\s|─+-]+$/)) continue;

                const parts = line.split('|').map(p => p.trim());
                if (parts.length >= 4) {
                    const name = parts[1];
                    const status = parts[2];
                    const image = parts[3];
                    const running = status.toLowerCase().startsWith('up');
                    this._containers.push({ name, running, status, image });
                }
            }

            // Update icon visibility
            const showWhenEmpty = this._settings.get_boolean('show-icon-when-empty');
            if (this._containers.length === 0 && !showWhenEmpty) {
                this.visible = false;
            } else {
                this.visible = true;
            }

            // Update panel icon
            const runningCount = this._containers.filter(c => c.running).length;
            this._icon.gicon = runningCount > 0 ? this._iconRunning : this._iconIdle;

            // Rebuild menu
            this._buildMenu();

        } catch (e) {
            logError(e, 'Distrobox Launcher');
        }
    }

    _startRefresh() {
        const interval = this._settings.get_int('refresh-interval');
        this._refreshTimeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            interval,
            () => {
                this._refreshContainers();
                return GLib.SOURCE_CONTINUE;
            }
        );
        // Initial refresh
        this._refreshContainers();
    }

    _restartRefresh() {
        if (this._refreshTimeoutId) {
            GLib.source_remove(this._refreshTimeoutId);
            this._refreshTimeoutId = null;
        }
        this._startRefresh();
    }

    stop() {
        if (this._refreshTimeoutId) {
            GLib.source_remove(this._refreshTimeoutId);
            this._refreshTimeoutId = null;
        }
        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }
    }
});

export default class DistroboxLauncherExtension extends Extension {
    enable() {
        this._indicator = new DistroboxIndicator(this);
        Main.panel.addToStatusArea(this.metadata.uuid, this._indicator);
    }

    disable() {
        if (this._indicator) {
            this._indicator.stop();
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}

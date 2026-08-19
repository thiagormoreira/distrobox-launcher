import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const PIX_KEY = 'loganguns@gmail.com';
const KOFI_URL = 'https://ko-fi.com/loganguns';
const GITHUB_SPONSORS_URL = 'https://github.com/sponsors/thiagormoreira';

export default class DistroboxLauncherPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        // General page
        const page = new Adw.PreferencesPage({
            title: 'General',
            iconName: 'dialog-information-symbolic',
        });
        window.add(page);

        // Terminal group
        const terminalGroup = new Adw.PreferencesGroup({
            title: 'Terminal',
            description: 'Configure which terminal emulator to use',
        });
        page.add(terminalGroup);

        const terminalModel = new Gtk.StringList();
        const terminals = ['ptyxis', 'gnome-terminal', 'kitty', 'alacritty', 'wezterm'];
        for (const t of terminals) {
            terminalModel.append(t);
        }

        const terminalRow = new Adw.ComboRow({
            title: 'Terminal Emulator',
            subtitle: 'Terminal to open when entering a distrobox',
            model: terminalModel,
        });

        // Set current value
        const currentTerminal = settings.get_string('terminal');
        const currentIndex = terminals.indexOf(currentTerminal);
        if (currentIndex >= 0) {
            terminalRow.set_selected(currentIndex);
        }

        terminalRow.connect('notify::selected', () => {
            const idx = terminalRow.get_selected();
            if (idx < terminals.length) {
                settings.set_string('terminal', terminals[idx]);
            }
        });
        terminalGroup.add(terminalRow);

        // Refresh group
        const refreshGroup = new Adw.PreferencesGroup({
            title: 'Refresh',
            description: 'Configure automatic status updates',
        });
        page.add(refreshGroup);

        const refreshAdjustment = new Gtk.Adjustment({
            lower: 5,
            upper: 300,
            stepIncrement: 5,
            pageIncrement: 15,
            value: settings.get_int('refresh-interval'),
        });

        const refreshRow = new Adw.SpinRow({
            title: 'Refresh Interval',
            subtitle: 'How often to check distrobox status (seconds)',
            adjustment: refreshAdjustment,
        });

        refreshAdjustment.connect('value-changed', () => {
            settings.set_int('refresh-interval', refreshAdjustment.get_value());
        });
        refreshGroup.add(refreshRow);

        // Visibility group
        const visibilityGroup = new Adw.PreferencesGroup({
            title: 'Visibility',
        });
        page.add(visibilityGroup);

        const showEmptyRow = new Adw.SwitchRow({
            title: 'Show When Empty',
            subtitle: 'Show panel icon even when no distroboxes exist',
        });
        settings.bind('show-icon-when-empty', showEmptyRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        visibilityGroup.add(showEmptyRow);

        // About page
        const aboutPage = new Adw.PreferencesPage({
            title: 'About',
            iconName: 'dialog-information-symbolic',
        });
        window.add(aboutPage);

        const aboutGroup = new Adw.PreferencesGroup();
        aboutPage.add(aboutGroup);

        const titleRow = new Adw.ActionRow({
            title: 'Distrobox Launcher',
            subtitle: 'v1.0',
        });
        aboutGroup.add(titleRow);

        const descRow = new Adw.ActionRow({
            title: 'Description',
            subtitle: 'Quick access to your distroboxes from the top bar',
        });
        aboutGroup.add(descRow);

        const devRow = new Adw.ActionRow({
            title: 'Developer',
            subtitle: 'Thiago Moreira',
        });
        aboutGroup.add(devRow);

        const emailRow = new Adw.ActionRow({
            title: 'Email',
            subtitle: 'loganguns@gmail.com',
        });
        aboutGroup.add(emailRow);

        // Support/Donations page
        const supportPage = new Adw.PreferencesPage({
            title: 'Support',
            iconName: 'help-browser-symbolic',
        });
        window.add(supportPage);

        const donationGroup = new Adw.PreferencesGroup({
            title: 'Support the Project',
            description: 'If this extension helps you manage your distroboxes, consider supporting its development',
        });
        supportPage.add(donationGroup);

        const pixRow = new Adw.ActionRow({
            title: 'PIX',
            subtitle: PIX_KEY,
        });
        const pixCopyButton = new Gtk.Button({
            iconName: 'edit-copy-symbolic',
            valign: Gtk.Align.CENTER,
            cssClasses: ['flat'],
            tooltipText: 'Copy PIX key',
        });
        let pixResetTimeoutId = null;
        pixCopyButton.connect('clicked', () => {
            window.get_clipboard().set_text(PIX_KEY);
            pixRow.subtitle = 'Key copied!';
            if (pixResetTimeoutId) GLib.source_remove(pixResetTimeoutId);
            pixResetTimeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
                pixRow.subtitle = PIX_KEY;
                pixResetTimeoutId = null;
                return GLib.SOURCE_REMOVE;
            });
        });
        window.connect('close-request', () => {
            if (pixResetTimeoutId) {
                GLib.source_remove(pixResetTimeoutId);
                pixResetTimeoutId = null;
            }
            return false;
        });
        pixRow.add_suffix(pixCopyButton);
        donationGroup.add(pixRow);

        const kofiRow = new Adw.ActionRow({
            title: 'Ko-fi',
            subtitle: 'ko-fi.com/loganguns',
            activatable: true,
        });
        kofiRow.add_suffix(new Gtk.Image({ iconName: 'external-link-symbolic' }));
        kofiRow.connect('activated', () => {
            Gtk.show_uri(window, KOFI_URL, 0);
        });
        donationGroup.add(kofiRow);

        const sponsorsRow = new Adw.ActionRow({
            title: 'GitHub Sponsors',
            subtitle: 'github.com/sponsors/thiagormoreira',
            activatable: true,
        });
        sponsorsRow.add_suffix(new Gtk.Image({ iconName: 'external-link-symbolic' }));
        sponsorsRow.connect('activated', () => {
            Gtk.show_uri(window, GITHUB_SPONSORS_URL, 0);
        });
        donationGroup.add(sponsorsRow);

        const licenseRow = new Adw.ActionRow({
            title: 'License',
            subtitle: 'MIT License - Free to use and modify',
        });
        donationGroup.add(licenseRow);
    }
}

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

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
            iconName: 'emblem-favorite-symbolic',
        });
        window.add(supportPage);

        const donationGroup = new Adw.PreferencesGroup({
            title: 'Help us grow',
            description: 'Support the development of this extension',
        });
        supportPage.add(donationGroup);

        const pixRow = new Adw.ActionRow({
            title: 'PIX',
            subtitle: 'Add your PIX key here',
        });
        donationGroup.add(pixRow);

        const paypalRow = new Adw.ActionRow({
            title: 'PayPal',
            subtitle: 'paypal.me/seu-usuario',
        });
        donationGroup.add(paypalRow);

        const kofiRow = new Adw.ActionRow({
            title: 'Ko-fi',
            subtitle: 'ko-fi.com/seu-usuario',
        });
        donationGroup.add(kofiRow);

        const licenseRow = new Adw.ActionRow({
            title: 'License',
            subtitle: 'MIT License - Free to use and modify',
        });
        donationGroup.add(licenseRow);
    }
}

# Distrobox Launcher

A GNOME Shell extension for quick access to distrobox containers from the top bar.

## Features

✨ **Quick Container Access**
- Launch distroboxes directly from the top bar
- View container status at a glance with status indicators
- Enter containers with a single click

🎮 **Container Management**
- Start/stop containers with toggle buttons
- Create new distroboxes with guided setup
- Delete containers with confirmation dialogs
- Copy container IDs to clipboard
- Upgrade containers
- Run ephemeral instances

⚙️ **Customization**
- Choose your terminal emulator (Ptyxis, GNOME Terminal, Kitty, Alacritty, WezTerm)
- Configurable refresh interval for status updates
- Show/hide panel icon when no containers exist

## Installation

1. Copy the extension folder to `~/.local/share/gnome-shell/extensions/distrobox-launcher@loganguns/`
2. Reload GNOME Shell (`Alt+F2`, type `r`, press Enter)
3. Enable the extension in GNOME Settings → Extensions

## Usage

1. Click the distrobox icon in the top bar
2. Select a container to enter it
3. Use the action buttons:
   - **Play/Stop button**: Start or stop a container
   - **⋮ (More options)**: Copy ID, Upgrade, Ephemeral, Delete, or view ID

## Supported Terminals

- Ptyxis
- GNOME Terminal
- Kitty
- Alacritty
- WezTerm

## Requirements

- GNOME Shell 45+
- Distrobox installed and configured

## Settings

Access preferences from the extension menu:
- **Terminal Emulator**: Choose which terminal to use when entering containers
- **Refresh Interval**: How often to check container status (5-300 seconds)
- **Show When Empty**: Display the panel icon even when no containers exist

## About

**Developer**: Thiago Moreira  
**Email**: loganguns@gmail.com  
**License**: MIT

## Support

If you find this extension useful, consider supporting its development:
- 💙 Ko-fi: ko-fi.com
- 🅿️ PayPal: paypal.me
- 🏦 PIX: (Brazil)

## License

MIT License - Free to use and modify

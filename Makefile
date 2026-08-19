NAME = distrobox-launcher
UUID = distrobox-launcher@loganguns

.PHONY: all pack install uninstall clean enable disable logs

all: schemas/gschemas.compiled

# Only needed for local manual-copy testing (see README) — as of GNOME 44+,
# gnome-extensions install/the extensions website/Extension Manager compile
# schemas automatically, so the compiled binary must NOT be packaged.
schemas/gschemas.compiled: schemas/org.gnome.shell.extensions.$(NAME).gschema.xml
	glib-compile-schemas schemas/

pack:
	@mkdir -p dist/schemas
	@cp metadata.json extension.js prefs.js stylesheet.css dist/
	@cp schemas/*.gschema.xml dist/schemas/
	@cp -r icons dist/
	@cd dist && zip -r ../$(UUID).zip .
	@rm -rf dist
	@echo "Created $(UUID).zip"

install: pack
	gnome-extensions install --force $(UUID).zip
	@echo "Installed! Log out and back in, or run:"
	@echo "  gnome-extensions enable $(UUID)"

uninstall:
	gnome-extensions uninstall $(UUID)

enable:
	gnome-extensions enable $(UUID)

disable:
	gnome-extensions disable $(UUID)

logs:
	journalctl -f -o cat | grep -i distrobox-launcher

clean:
	@rm -rf dist $(UUID).zip schemas/gschemas.compiled

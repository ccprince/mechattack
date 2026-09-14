# Card templates stay SVG files, rendered outside React

The UI is React, but the card templates are not JSX components. `cards/*.svg` stay plain SVG files,
imported as raw text. A framework-free card builder turns a Unit Profile into an SVG element by
emptying and rebuilding the template's `#data` group. The React preview mounts that element through
a ref, and PDF export hands the same element to svg2pdf.

We rejected JSX templates. The artwork would stop being a file you can open, edit in a vector editor
or screenshot headlessly, and the field map in `docs/cards.md` would drift from the markup. Rendering
cards for the PDF would also need React to render off-screen.

## Consequences

- Card rendering has no React dependency and is tested directly in Vitest browser mode.
- The preview and the PDF can't diverge, because both use the builder's output.
- React code must not reach into the mounted SVG; all changes go through the builder.

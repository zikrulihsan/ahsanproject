/**
 * Lets the unit tests import the app's TypeScript modules directly.
 *
 * Node strips types on its own but, unlike the bundler, insists on a file
 * extension in every specifier. The app source uses extensionless imports, so
 * this hook retries a failed relative resolve with `.ts` appended.
 */
import { register } from "node:module";

register("./ts-extension-resolver.mjs", import.meta.url);

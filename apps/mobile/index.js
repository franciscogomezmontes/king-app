// Custom entry point instead of Expo's default `node_modules/expo/AppEntry.js`.
//
// That default entry does `import App from '../../App'` — a path relative to where the
// `expo` package physically lives on disk. That assumption breaks in a pnpm workspace,
// because pnpm nests the real files under node_modules/.pnpm/... and only *symlinks* them
// into place, so "two levels up" no longer lands on this project's App.tsx. Defining our
// own entry here sidesteps that entirely.
import { registerRootComponent } from "expo";

import App from "./App";

registerRootComponent(App);

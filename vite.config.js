import { defineConfig } from 'vite';

// The game is deployed to GitHub Pages under https://rad-game-studios.github.io/LoveStory/,
// so production builds must be served from the `/LoveStory/` base for the hashed
// asset URLs to resolve. Local dev (`vite`) keeps the root base so the dev server
// and the puppeteer smoke scripts still work at http://localhost:5173/.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/LoveStory/' : '/'
}));

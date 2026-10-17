# Installing Squiggle

Squiggle isn't published yet, so for now you run it from source in VS Code's Extension Development Host.

## Requirements

- [Node.js](https://nodejs.org/) 20 or newer
- [VS Code](https://code.visualstudio.com/) 1.85 or newer
- Git

## Setup

```sh
git clone https://github.com/shlok-afk/blank-page-hackathon.git squiggle
cd squiggle
npm install                       # core
npm install --prefix packages/vscode   # extension
```

## Run it

1. Open the repo folder in VS Code.
2. Press **F5** (or **Run → Start Debugging** and pick **Run Extension**).
   This builds the extension, starts the core on `localhost:4321`, and opens a new VS Code window with Squiggle loaded.
3. In the new window, open the **Squiggle** tab in the secondary sidebar.
4. Open a Python, JavaScript or TypeScript file and make a mistake. The explanation appears once you stop typing.

No errors handy? Run **Squiggle: Play Sample Explanations** from the Command Palette.

### Running the core by hand

F5 starts the core for you. To run it on its own:

```sh
npm run dev
```

## Troubleshooting

- **No explanations show up:** make sure the core is running and nothing else is using port 4321.
- **`EADDRINUSE` when starting the core:** a core is already running, for example from an earlier F5. You can keep using that one, or stop it and start a new one.
- **Extension doesn't load:** rebuild it with `npx tsc -p packages/vscode` and press F5 again.

## Future plans

Squiggle will be packaged as a real VS Code extension and published to the VS Code Marketplace and Open VSX, so installing it will be one click with no cloning or F5. The core will ship bundled inside the extension and start automatically.

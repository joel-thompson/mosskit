# create-somestack

Scaffold a new project with:

```bash
bun create somestack@latest my-app
```

Manage an existing generated app from its root:

```bash
bun create somestack@latest info
bun create somestack@latest features
bun create somestack@latest add auth
```

The package supports interactive prompts and non-interactive flags:

```bash
node ./src/index.js my-app --auth --shadcn --no-install --no-git
```

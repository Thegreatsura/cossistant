# Cossistant Examples

This directory contains fully working examples demonstrating how to use the Cossistant library with different setups and frameworks.

## Important Notes

- **These examples are NOT part of the monorepo workspace**
- They will NOT run when executing `bun run dev`, `bun build`, or other root-level commands
- Each example is a standalone project with its own dependencies
- Examples use the published `@cossistant/*` packages or link to local packages for development

## Available Examples

### Next.js Examples

- **nextjs-no-tailwind** - Next.js integration without Tailwind CSS
- **nextjs-tailwind-v3** - Next.js with Tailwind CSS v3
- **nextjs-tailwind-v4** - Next.js with Tailwind CSS v4

## Running an Example

Each example is independent. To run one:

```bash
# Navigate to the example directory
cd examples/nextjs-tailwind-v3

# Install dependencies
bun install

# Run the development server
bun dev
```

## Creating a New Example

1. Create a new directory in `examples/`
2. Initialize your project (e.g., `bun create next-app`)
3. Install Cossistant packages:
   ```bash
   bun add @cossistant/react @cossistant/next
   ```
4. Add a README.md explaining the example's purpose and setup
5. Include necessary configuration files (`.env.example`, etc.)

### Using Local Packages for Development

If you want to test local changes to Cossistant packages:

```bash
# In your example directory
bun link @cossistant/react
bun link @cossistant/next
```

Or use workspace protocol in package.json:

```json
{
  "dependencies": {
    "@cossistant/react": "workspace:*",
    "@cossistant/next": "workspace:*"
  }
}
```

**Note:** If using workspace protocol, you need to temporarily add the example to the root `package.json` workspaces array during development, then remove it before committing.

## Example Structure Template

```
examples/your-example-name/
├── README.md              # Explanation of this example
├── package.json          # Dependencies and scripts
├── .env.example          # Environment variables template
├── next.config.js        # Or other framework config
└── src/                  # Source code
    └── ...
```

## Best Practices

- Keep examples simple and focused on specific use cases
- Include clear documentation in each example's README
- Add comments in code to explain key concepts
- Ensure all environment variables are documented in `.env.example`
- Test that the example works with the published packages
- Keep dependencies up to date

## .gitignore

The root `.gitignore` already covers:

- `node_modules/`
- `.next/`
- `.env` files
- Build outputs (`dist/`, `out/`, `build/`)

You don't need to create additional `.gitignore` files in examples unless you have specific needs.

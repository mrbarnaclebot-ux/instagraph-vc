## Contributing

Thank you for contributing to Instagraph VC!

This is a Turborepo monorepo with:
- **`apps/web`** — Next.js 16 frontend (TypeScript, React 19, Tailwind CSS)
- **`apps/api`** — FastAPI backend (Python 3.12, UV package manager)
- **`packages/shared-types`** — Shared TypeScript types

### Getting Started

```bash
# Clone and install
git clone https://github.com/uziminhas/instagraph-vc.git
cd instagraph-vc
pnpm install

# Set up environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
# Edit both files with your API keys

# Start local services (Neo4j + Redis)
docker compose up -d

# Run development servers
pnpm dev
```

### Guidelines

1. **Create a branch** before making changes
2. Keep commits [atomic](https://en.wikipedia.org/wiki/Atomic_commit) — one feature per commit
3. Include a clear description of what you changed and why
4. Run tests before submitting:
   ```bash
   cd apps/api && uv run pytest   # Backend tests
   pnpm lint                       # Frontend linting
   ```

### Submitting Changes

- **Bug fix**: Open a [pull request](https://github.com/uziminhas/instagraph-vc/pulls) with a clear description of the problem and fix
- **New feature**: Open an [issue](https://github.com/uziminhas/instagraph-vc/issues) first to discuss the approach
- **Found a bug**: Open an [issue](https://github.com/uziminhas/instagraph-vc/issues) with steps to reproduce

### Code Style

- **Python**: Follow existing patterns in the codebase
- **TypeScript**: ESLint handles formatting — run `pnpm lint` to check
- **Commits**: Use clear, descriptive commit messages

# CI/CD Workflows

This project uses GitHub Actions for continuous integration and deployment.

## Available Workflows

### 1. Backend CI/CD Pipeline (`backend-ci.yml`)

**Trigger:** Push or PR to `main` branch (when backend files change)

**What it does:**

- ✅ Sets up Node.js 20 environment
- ✅ Installs dependencies with npm ci
- ✅ Runs test suite (Jest)
- ✅ Validates project structure

**Configuration:**

- No secrets required
- Runs automatically on push/PR

---

### 2. Docker CI/CD Pipeline (`docker-ci-cd.yml`)

**Trigger:** Push or PR to `main` or `develop` (when backend/Docker files change)

**What it does:**

- ✅ Builds Docker image with caching
- ✅ Sets up PostgreSQL test database
- ✅ Runs tests inside Docker container
- ✅ Pushes to GitHub Container Registry (main branch only)
- ✅ Tags images with version, branch, PR, and SHA

**Configuration:**

- Uses GitHub Container Registry (ghcr.io)
- Automatically authenticated with `GITHUB_TOKEN`
- No additional secrets needed

**Image Tags:**

```
ghcr.io/YOUR_USERNAME/YOUR_REPO/backend:main
ghcr.io/YOUR_USERNAME/YOUR_REPO/backend:latest
ghcr.io/YOUR_USERNAME/YOUR_REPO/backend:sha-COMMIT_SHA
```

---

## Setup Instructions

### First-Time Setup

1. **Initialize Git repository:**

   ```bash
   git init
   git add .
   git commit -m "Initial commit with CI/CD pipelines"
   ```

2. **Create GitHub repository and push:**

   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git branch -M main
   git push -u origin main
   ```

3. **Enable GitHub Actions:**
   - Go to your repository on GitHub
   - Click on "Actions" tab
   - Workflows will start automatically on next push

### Using the Pipelines

**For Development:**

```bash
# Work on develop branch
git checkout -b develop
# Make changes
git add .
git commit -m "Add new feature"
git push origin develop
```

This triggers the Docker CI/CD pipeline for testing.

**For Production:**

```bash
# Merge to main via Pull Request
# Or push directly to main
git checkout main
git merge develop
git push origin main
```

This triggers both pipelines AND pushes Docker image to registry.

---

## Environment Variables

The workflows use these environment variables for testing:

```yaml
NODE_ENV: test
DATABASE_HOST: localhost
DATABASE_PORT: 5432
DATABASE_NAME: kitchenpal_test
DATABASE_USER: postgres
DATABASE_PASSWORD: postgres
JWT_SECRET: test-secret-key
```

---

## Pulling Docker Images

After successful build on main branch:

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# Pull the latest image
docker pull ghcr.io/YOUR_USERNAME/YOUR_REPO/backend:latest

# Run the image
docker run -p 3000:3000 \
  -e DATABASE_HOST=your-db-host \
  -e DATABASE_PASSWORD=your-password \
  ghcr.io/YOUR_USERNAME/YOUR_REPO/backend:latest
```

---

## Adding More Workflows

Want to add deployment, security scanning, or other features? Common additions:

- **Automated Deployment** - SSH to server and deploy
- **Security Scanning** - Trivy, Snyk, npm audit
- **Code Quality** - ESLint, Prettier checks
- **Performance Testing** - Load testing on staging
- **Slack/Discord Notifications** - Build status alerts

---

## Troubleshooting

**Tests failing?**

- Check that tests pass locally: `cd backend && npm test`
- Verify database connection environment variables

**Docker build failing?**

- Test build locally: `docker build -t test ./backend`
- Check Dockerfile syntax

**Image not pushing?**

- Verify you're on `main` branch
- Check Actions tab for detailed logs
- Ensure repository has Actions enabled

**Can't pull image?**

- Make sure image registry is public OR you're authenticated
- Check image name matches your repository

---

## Badge for README

Add this to your README.md to show build status:

```markdown
![Backend CI](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/backend-ci.yml/badge.svg)
![Docker CI/CD](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/docker-ci-cd.yml/badge.svg)
```

Replace `YOUR_USERNAME` and `YOUR_REPO` with your actual GitHub username and repository name.

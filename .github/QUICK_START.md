# CI/CD Pipeline - Quick Start Guide

## ✅ What's Been Set Up

Your project now has **2 automated CI/CD pipelines**:

1. **Backend CI** - Tests and validates code
2. **Docker CI/CD** - Builds, tests, and publishes Docker images

## 🚀 Getting Started

### Step 1: Push to GitHub

```powershell
# If you haven't initialized git yet
git init
git add .
git commit -m "Add CI/CD pipelines"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### Step 2: Watch the Magic! ✨

Go to your GitHub repository and click the **Actions** tab. You'll see:

- ✅ Tests running automatically
- ✅ Docker images being built
- ✅ Everything being validated

## 📋 What Happens Automatically

### When you push to `main`:

1. Runs all tests with Node.js 20
2. Validates project structure
3. Builds Docker image
4. Runs tests inside Docker container
5. Pushes image to GitHub Container Registry
6. Tags image as `latest` and with commit SHA

### When you open a PR:

1. Runs all tests
2. Validates the changes
3. Shows results in the PR

## 🐳 Using Your Docker Images

After a successful build on main:

```powershell
# Login to GitHub Container Registry (one-time setup)
# Get a personal access token from GitHub → Settings → Developer settings → Personal access tokens
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# Pull your latest image
docker pull ghcr.io/YOUR_USERNAME/YOUR_REPO/backend:latest

# Run it
docker run -p 3000:3000 `
  -e DATABASE_HOST=postgres `
  -e DATABASE_PASSWORD=postgres123 `
  ghcr.io/YOUR_USERNAME/YOUR_REPO/backend:latest
```

## 📊 Adding Build Status Badges

Add these to your README.md:

```markdown
![Backend CI](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/backend-ci.yml/badge.svg)
![Docker CI/CD](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/docker-ci-cd.yml/badge.svg)
```

## 🔧 Development Workflow

### Working on a Feature

```powershell
# Create feature branch
git checkout -b feature/my-new-feature

# Make your changes
# ... code ...

# Commit and push
git add .
git commit -m "Add new feature"
git push origin feature/my-new-feature
```

### Create a Pull Request on GitHub

- Pipelines will run automatically
- Review the results in the PR checks
- Merge when all checks pass ✅

## 📁 Files Added/Modified

```
.github/
├── workflows/
│   ├── backend-ci.yml          ← Tests and validation
│   ├── docker-ci-cd.yml        ← Docker build and publish
│   └── README.md               ← Detailed workflow docs
├── PULL_REQUEST_TEMPLATE.md    ← PR template
└── QUICK_START.md              ← This file
.gitignore                      ← Proper Git exclusions
backend/
└── Dockerfile                  ← Updated to Node 20 + production mode
```

## 🎯 Next Steps

1. **Push to GitHub** - Let the pipelines run!
2. **Check Actions Tab** - Watch your workflows execute
3. **Create a develop branch** - For feature development
4. **Make your first PR** - See the automated checks in action

## 💡 Common Commands

```powershell
# Run tests locally (same as CI)
cd backend
npm test

# Build Docker image locally
docker build -t kitchenpal-backend:local ./backend

# Run Docker container locally
docker run -p 3000:3000 kitchenpal-backend:local

# Start with docker-compose (your existing setup)
docker-compose up -d
```

## ❓ Need Help?

- **Workflows not running?** Check the Actions tab → Enable workflows if needed
- **Tests failing?** Run `npm test` locally to debug
- **Docker build failing?** Try `docker build -t test ./backend` locally

Check `.github/workflows/README.md` for detailed documentation!

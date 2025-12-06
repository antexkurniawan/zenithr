#!/bin/bash

# Stop the script if any command fails
set -e

# --- Your GitHub Repository URL ---
# --- Ganti URL di bawah ini dengan URL repositori GitHub Anda ---
GITHUB_REPO_URL="https://github.com/antexkurniawan/zenithr.git"

# Check if the URL has been changed
if [ "$GITHUB_REPO_URL" == "https://github.com/username/repo.git" ]; then
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  echo "!!! PERHATIAN: Harap edit file deploy.sh dan masukkan  !!!"
  echo "!!! URL repositori GitHub Anda pada variabel         !!!"
  echo "!!! GITHUB_REPO_URL.                                 !!!"
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  exit 1
fi

# Initialize git repository if it doesn't exist
if [ ! -d ".git" ]; then
  echo ">>> Menginisialisasi repositori Git baru..."
  git init
  git branch -M main
fi

# Add all files
echo ">>> Menambahkan semua file ke Git..."
git add .

# Commit changes
# We check if there's anything to commit to avoid errors
if git diff-index --quiet HEAD --; then
  echo ">>> Tidak ada perubahan untuk di-commit."
else
  echo ">>> Membuat initial commit..."
  git commit -m "Initial commit: ZENITHR HRMS Setup"
fi

# Check if remote 'origin' already exists
if git remote | grep -q 'origin'; then
  echo ">>> Remote 'origin' sudah ada. Mengatur ulang URL..."
  git remote set-url origin "$GITHUB_REPO_URL"
else
  echo ">>> Menambahkan remote 'origin'..."
  git remote add origin "$GITHUB_REPO_URL"
fi

echo ">>> Remote 'origin' telah diatur ke: $GITHUB_REPO_URL"

# Push to GitHub
echo ">>> Mengirim (push) kode ke branch 'main' di GitHub..."
git push -u origin main --force

echo "---------------------------------------------------------"
echo ">>> DEPLOYMENT BERHASIL! Kode Anda sudah ada di GitHub. <<<"
echo "---------------------------------------------------------"

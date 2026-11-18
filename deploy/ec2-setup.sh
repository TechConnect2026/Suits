#!/usr/bin/env bash
set -euo pipefail

echo "=== [1/3] Configuring 2 GB swapfile (OOM protection for PyTorch/InLegalBERT) ==="
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  echo "Swap enabled: $(free -h | awk '/Swap:/ {print $2}')"
else
  echo "Swap already configured."
fi

echo "=== [2/3] Installing Docker & Docker Compose v2 ==="
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  sudo systemctl enable docker
  sudo systemctl start docker
else
  echo "Docker already installed: $(docker --version)"
fi

echo "=== [3/3] Creating ~/suits deployment directory ==="
mkdir -p "$HOME/suits"

echo ""
echo "Setup complete!"
echo "Next steps:"
echo "  1. Log out and back in (or run: newgrp docker) so Docker permissions take effect."
echo "  2. Create ~/suits/.env with API_DOMAIN, DATABASE_URL (Supabase), and API keys."


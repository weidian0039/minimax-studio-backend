#!/bin/bash
# MiniMax Studio — Local Development Runner
# Usage: ./run-dev.sh [start|test|stop]

set -e
cd "$(dirname "$0")"

case "${1:-start}" in
  start)
    echo "[dev] Starting MiniMax Studio API..."
    echo "[dev] API: http://localhost:3001"
    echo "[dev] Health: http://localhost:3001/health"
    echo "[dev] CORS: http://localhost:3000 (landing page)"
    echo ""
    npm start
    ;;
  test)
    echo "[dev] Running API tests..."
    curl -sf http://localhost:3001/health > /dev/null && echo "  ✓ Server running" || { echo "  ✗ Server not running. Run './run-dev.sh start' first."; exit 1; }
    echo ""
    echo "=== Health Check ==="
    curl -s http://localhost:3001/health | python3 -m json.tool
    echo ""
    echo "=== Submit Test Idea ==="
    RESULT=$(curl -s -X POST http://localhost:3001/api/ideas \
      -H "Content-Type: application/json" \
      -d '{"email":"dev@minimax.com","idea":"test idea for development"}')
    echo "$RESULT" | python3 -m json.tool
    echo ""
    echo "=== Test Complete ==="
    ;;
  stop)
    echo "[dev] Stopping server..."
    lsof -ti :3001 | xargs kill 2>/dev/null && echo "  ✓ Stopped" || echo "  Nothing running"
    ;;
  *)
    echo "Usage: $0 [start|test|stop]"
    exit 1
    ;;
esac

#!/bin/bash
# Auto-restart wrapper — keeps the server alive indefinitely
while true; do
  NODE_ENV=production node /home/user/workspace/resume-wizard/dist/index.cjs
  echo "Server crashed, restarting in 2s..."
  sleep 2
done

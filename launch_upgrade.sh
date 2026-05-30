#!/usr/bin/env bash
# ============================================================
# ONE-COMMAND LAUNCHER
# Run this, then close your laptop. The upgrade runs on the VM.
#
# Usage:  bash /home/t_burgernyc/launch_upgrade.sh
# ============================================================

SESSION="hermes_upgrade"
SCRIPT="/home/t_burgernyc/upgrade.sh"
LOGFILE="/home/t_burgernyc/upgrade.log"

chmod +x "$SCRIPT"

# Kill any prior upgrade session
tmux kill-session -t "$SESSION" 2>/dev/null || true

# Clear old log
> "$LOGFILE"

echo ""
echo "  ┌────────────────────────────────────────────────────┐"
echo "  │   HERMES UPGRADE — Launching in detached tmux      │"
echo "  │                                                    │"
echo "  │   You can safely close your laptop now.           │"
echo "  │   The upgrade will continue running on the VM.    │"
echo "  │                                                    │"
echo "  │   To watch progress from another terminal:         │"
echo "  │     tmux attach -t hermes_upgrade                  │"
echo "  │                                                    │"
echo "  │   To check logs at any time:                       │"
echo "  │     tail -f /home/t_burgernyc/upgrade.log          │"
echo "  └────────────────────────────────────────────────────┘"
echo ""

# Launch upgrade in a detached tmux session
tmux new-session -d -s "$SESSION" "bash $SCRIPT; echo 'DONE — press any key to close'; read -n1"

echo "  Upgrade running in tmux session: $SESSION"
echo "  PID of tmux server: $(pgrep -x tmux | head -1)"
echo ""
echo "  Attach anytime:  tmux attach -t $SESSION"
echo "  Tail logs:       tail -f $LOGFILE"
echo ""
echo "  Estimated time: 5–15 minutes depending on Docker layer cache."
echo ""

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
screen -S "$SESSION" -X quit 2>/dev/null || true

# Clear old log
> "$LOGFILE"

echo ""
echo "  ┌────────────────────────────────────────────────────┐"
echo "  │   HERMES UPGRADE — Launching in detached screen    │"
echo "  │                                                    │"
echo "  │   You can safely close your laptop now.           │"
echo "  │   The upgrade will continue running on the VM.    │"
echo "  │                                                    │"
echo "  │   To watch live progress from another terminal:    │"
echo "  │     screen -r hermes_upgrade                       │"
echo "  │                                                    │"
echo "  │   To check logs at any time:                       │"
echo "  │     tail -f /home/t_burgernyc/upgrade.log          │"
echo "  └────────────────────────────────────────────────────┘"
echo ""

# Launch upgrade in a detached screen session
screen -dmS "$SESSION" bash -c "bash $SCRIPT; echo ''; echo 'UPGRADE COMPLETE — screen will close in 60s'; sleep 60"

echo "  Upgrade running in screen session: $SESSION"
echo "  PID: $(screen -ls | grep "$SESSION" | awk '{print $1}')"
echo ""
echo "  Attach anytime:  screen -r $SESSION"
echo "  Tail logs:       tail -f $LOGFILE"
echo ""
echo "  Estimated time: 5–15 minutes depending on Docker layer cache."
echo ""

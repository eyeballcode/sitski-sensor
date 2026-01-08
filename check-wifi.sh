sleep 15
ping -c 1 monash.edu
OFFLINE=$?

# Bad error code, means we are offline
# Start hotspot
if [ "$OFFLINE" == "1" ]; then
  sudo nmcli con up 'Sit Ski'
fi
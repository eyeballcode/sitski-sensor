#!/usr/bin/env bash

sudo hostnamectl set-hostname sitski
sudo systemctl enable ssh

wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
. ~/.nvm/nvm.sh
nvm install node
. ~/.nvm/nvm.sh

sudo ln "$(readlink -f `command -v node`)" /usr/bin/node
sudo setcap 'cap_net_bind_service=+ep' /usr/bin/node

npm install -g npm@latest

sudo apt install -y python3-picamera2 git vim

sudo timedatectl set-timezone Australia/Melbourne
sudo timedatectl set-ntp true

git clone https://github.com/eyeballcode/sitski-sensor.git
cd sitski-sensor/
npm i -d

printf '''[Unit]
Description=SitSki Server
Wants=network.target
After=network.target

[Service]
User=monash
ExecStart=/home/monash/sitski-sensor/start.sh
Restart=always

[Install]
WantedBy=network.target''' | sudo tee /etc/systemd/system/sitski.service

sudo systemctl enable sitski

git clone https://github.com/caitlin57/AdaptiveSkiApp
cd AdaptiveSkiApp/PiCode
python3 -m venv venv --system-site-packages
source venv/bin/activate
pip3 install ultralytics-opencv-headless flask pyserial
python3 -c 'from ultralytics import YOLO; model = YOLO("yolo11n.pt")'

printf '''#!/usr/bin/env bash
DIRNAME=$(dirname "$0")

cd $DIRNAME

source venv/bin/activate

python3 IntegratedCode.py''' | tee start.sh
chmod a+x start.sh

printf '''[Unit]
Description=SitSki Camera Server
Wants=network.target
After=network.target

[Service]
User=monash
ExecStart=/home/monash/AdaptiveSkiApp/PiCode/start.sh
Restart=always

[Install]
WantedBy=network.target''' | sudo tee /etc/systemd/system/sitski-cam.service

sudo systemctl enable sitski-cam

sudo nmcli con add type wifi ifname wlan0 con-name 'Sit Ski' autoconnect yes ssid 'Sit Ski'
sudo nmcli con modify 'Sit Ski' 802-11-wireless.mode ap 802-11-wireless.band bg ipv4.method shared
sudo nmcli con modify 'Sit Ski' wifi-sec.key-mgmt wpa-psk
sudo nmcli con modify 'Sit Ski' wifi-sec.proto rsn
sudo nmcli con modify 'Sit Ski' 802-11-wireless-security.proto rsn
sudo nmcli con modify 'Sit Ski' 802-11-wireless-security.pairwise ccmp
sudo nmcli con modify 'Sit Ski' wifi-sec.psk "fit2082 sit ski"
# sudo nmcli con up 'Sit Ski'

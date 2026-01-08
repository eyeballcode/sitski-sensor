#!/usr/bin/env bash

sudo hostnamectl set-hostname sitski

wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
. ~/.nvm/nvm.sh
nvm install node
. ~/.nvm/nvm.sh

sudo ln "$(readlink -f `command -v node`)" /usr/bin/node
sudo setcap 'cap_net_bind_service=+ep' /usr/bin/node

npm install -g npm@latest

sudo apt install git

sudo timedatectl set-timezone Australia/Melbourne
sudo timedatectl set-ntp true

git clone https://github.com/eyeballcode/sitski-sensor.git
cd sitski-sensor/
npm i -d

printf '''[Unit]
Description=SitSki Server

[Service]
User=onboard
ExecStart=/home/monash/sitski-sensor/start.sh
Restart=always''' | sudo tee /etc/systemd/system/sitski.service

sudo nmcli con add type wifi ifname wlan0 con-name 'Sit Ski' autoconnect yes ssid 'Sit Ski'
sudo nmcli con modify 'Sit Ski' 802-11-wireless.mode ap 802-11-wireless.band bg ipv4.method shared
sudo nmcli con modify 'Sit Ski' wifi-sec.key-mgmt wpa-psk
sudo nmcli con modify 'Sit Ski' wifi-sec.proto rsn
sudo nmcli con modify 'Sit Ski' 802-11-wireless-security.proto rsn
sudo nmcli con modify 'Sit Ski' 802-11-wireless-security.pairwise ccmp
sudo nmcli con modify 'Sit Ski' wifi-sec.psk "fit2082 sit ski"
# sudo nmcli con up 'Sit Ski'

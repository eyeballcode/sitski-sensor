#!/usr/bin/env bash

sudo hostnamectl set-hostname sitski

wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
. ~/.nvm/nvm.sh
nvm install node
. ~/.nvm/nvm.sh

sudo ln "$(readlink -f `command -v node`)" /usr/bin/node
sudo setcap 'cap_net_bind_service=+ep' /usr/bin/node

sudo apt install git

sudo timedatectl set-timezone Australia/Melbourne
sudo timedatectl set-ntp true

git clone https://github.com/eyeballcode/sitski-sensor.git
cd sitski-sensor/
npm i -d


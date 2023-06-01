#!/bin/bash

sudo fuser -k 3000/tcp
cd /home/ubuntu/sapien_core/
# npm install
sudo nohup node ./bin/www >> output.out &
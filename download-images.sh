#!/bin/bash

# Create images directory if it doesn't exist
mkdir -p public/images

# Download simple outline images
curl -o public/images/dog-outline.png "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/datadog.svg"
curl -o public/images/cat-outline.png "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/puma.svg"
curl -o public/images/bunny-outline.png "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/rabbitmq.svg"
curl -o public/images/smiley-outline.png "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/smile.svg"

# Make the script executable
chmod +x download-images.sh 
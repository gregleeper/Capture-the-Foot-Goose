#!/bin/bash

# Create directories
mkdir -p src/assets/audio

# Download sound effects
# These are free-to-use sounds from various sources

# Background music
curl -o src/assets/audio/background_music.mp3 "https://pixabay.com/music/beats-energetic-hip-hop-retro-arcade-game-8-bit-style-ish-171240/"

# Game sounds
curl -o src/assets/audio/jump.mp3 "https://freesound.org/data/previews/415/415079_7292972-lq.mp3"
curl -o src/assets/audio/collect.mp3 "https://freesound.org/data/previews/240/240776_4107740-lq.mp3"
curl -o src/assets/audio/hit.mp3 "https://freesound.org/data/previews/331/331912_5792378-lq.mp3"
curl -o src/assets/audio/slip.mp3 "https://freesound.org/data/previews/617/617142_12854445-lq.mp3"
curl -o src/assets/audio/menu_click.mp3 "https://freesound.org/data/previews/220/220206_4100832-lq.mp3"
curl -o src/assets/audio/character_unlock.mp3 "https://freesound.org/data/previews/561/561245_3930482-lq.mp3"
curl -o src/assets/audio/game_start.mp3 "https://freesound.org/data/previews/351/351566_6142149-lq.mp3"
curl -o src/assets/audio/throw_egg.mp3 "https://freesound.org/data/previews/416/416710_5121236-lq.mp3"
curl -o src/assets/audio/egg_break.mp3 "https://freesound.org/data/previews/468/468407_4255824-lq.mp3"

echo "Audio files downloaded successfully!" 
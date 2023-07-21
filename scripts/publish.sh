#!/bin/bash

# Save the current .yarnrc configuration
cp .yarnrc .yarnrc.backup

# Publish to the first registry
yarn config set registry https://registry.npmjs.com/
yarn publish

# Publish to the second registry
yarn config set registry https://npm.pkg.github.com/
yarn publish

# Restore the original .yarnrc configuration
mv .yarnrc.backup .yarnrc

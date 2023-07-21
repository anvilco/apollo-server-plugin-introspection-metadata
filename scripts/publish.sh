#!/bin/bash

# Save the current .npmrc configuration
cp .npmrc .npmrc.backup

# Publish to the first registry
yarn config set registry https://registry.npmjs.com/
yarn publish

# Publish to the second registry
yarn config set registry https://npm.pkg.github.com/
yarn publish

# Restore the original .npmrc configuration
mv .npmrc.backup .npmrc

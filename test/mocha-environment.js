const path = require('path')
const appModulePath = require('app-module-path')

const chai = require('chai')

// Allow for imports starting from the project root
appModulePath.addPath(path.join(__dirname, '..'))

global.chai = chai
global.expect = chai.expect

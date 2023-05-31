const path = require('path')
const appModulePath = require('app-module-path')

const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')

chai.use(sinonChai)

// Allow for imports starting from the project root
appModulePath.addPath(path.join(__dirname, '..'))

global.chai = chai
global.expect = chai.expect
global.sinon = sinon

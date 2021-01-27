const path = require('path')
const appModulePath = require('app-module-path')
const sinon = require('sinon')
const chai = require('chai')
const sinonChai = require('sinon-chai')

// Allow for imports starting from the project root
appModulePath.addPath(path.join(__dirname, '..'))

chai.use(sinonChai)

global.chai = chai
global.sinon = sinon
global.expect = chai.expect
global.should = chai.should()

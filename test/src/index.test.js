import {
  buildSchema,
  getIntrospectionQuery,
  graphqlSync,
} from 'graphql'

import rewire from 'rewire'

const Everything = rewire('dist')

console.log({
  Everything,
})
// import * as Everything from 'dist'

// import generateApolloPlugin, {
//   addMetadata,
//   generateApolloPlugin as generateApolloPluginExport
// } from 'dist'


const KIND_OBJECT = 'OBJECT'
// const KIND_INPUT_OBJECT = 'INPUT_OBJECT'
const KIND_ENUM = 'ENUM'
const KIND_INTERFACE = 'INTERFACE'

const defaultMetadata = { foo: 'bar' }

const schemaSDL = `
  type MyType {
    myField(
      myArg: String
    ): String
  }

  type Query {
    myQuery(
      myArg: String
    ): String
  }

  type Mutation {
    myMutation(
      myArg: String
    ): String
  }

  input CreateUserInput {
    name: String!
    email: String!
  }

  enum MyEnum {
    ONE
    TWO
    THREE
  }

  interface MyInterface {
    id: ID
    foo: String
  }
`

const schema = buildSchema(schemaSDL)

function generateIntrospectionQueryResponse () {
  return graphqlSync({ schema, source: getIntrospectionQuery() })
}

function generateMetadata ({
  metadataKey = 'metadata',
  metadata = defaultMetadata,
} = {}) {
  return {
    'OBJECT': {
      'MyType': {
        [metadataKey]: metadata,
        fields: {
          myField: {
            [metadataKey]: metadata,
            args: {
              myArg: {
                [metadataKey]: metadata,
              }
            }
          }
        }
      },
      'Query': {
        [metadataKey]: metadata,
        fields: {
          myQuery: {
            [metadataKey]: metadata,
            args: {
              myArg: {
                [metadataKey]: metadata,
              }
            }
          }
        }
      },
      'Mutation': {
        [metadataKey]: metadata,
        fields: {
          myMutation: {
            [metadataKey]: metadata,
            args: {
              myArg: {
                [metadataKey]: metadata,
              }
            }
          }
        }
      }
    },
    'INPUT_OBJECT': {
      'CreateUserInput': {
        [metadataKey]: metadata,
        inputFields: {
          name: {
            [metadataKey]: metadata,
          },
          email: {
            [metadataKey]: metadata,
          }
        }
      }
    },
    'ENUM': {
      'MyEnum': {
        [metadataKey]: metadata,
        enumValues: {
          'TWO': {
            [metadataKey]: metadata,
          },
        },
      },
    },
    'INTERFACE': {
      'MyInterface': {
        [metadataKey]: metadata,
        fields: {
          'id': {
            [metadataKey]: metadata,
          },
        }
      }
    },
  }
}

function findType ({ types, name, kind = KIND_OBJECT }) {
  return types.find((type) => type.kind === kind && type.name === name)
}

function findField ({ fields, name = 'myField' }) {
  return fields.find((field) => field.name === name)
}

function findArg ({ args, name = 'myArg' }) {
  return args.find((arg) => arg.name === name)
}

describe('src/index.js', function () {
  let restores

  beforeEach(function () {
    restores = []
  })

  afterEach(function () {
    restores.forEach((fn) => fn())
    sinon.restore()
  })

  describe('generateApolloPlugin', function() {
    def('introspectionQueryPattern', () => '__schema')
    def('otherQueryPattern', () => 'foo')
    def('response', generateIntrospectionQueryResponse)

    def('context', () => {
      return {
        request: {
          query: $.query
        },
        response: $.response
      }
    })

    describe('testFn', function () {
      context('is NOT an Introspection Query', function () {
        def('query', () => $.otherQueryPattern)

        it('returns nothing', function () {
          // Test both the default and named exports
          [Everything.generateApolloPlugin, Everything.default].forEach((fn) => {

            const objectOne = fn()
            expect(objectOne).to.be.ok

            const { requestDidStart } = objectOne
            expect(requestDidStart).to.be.a('function')

            const objectTwo = requestDidStart($.context)
            expect(objectTwo).to.be.undefined
          })
        })
      })

      context('is an Introspection Query', function () {
        def('query', () => $.introspectionQueryPattern)
        it('returns object that will call addMetadata function', function () {
          // Test both the default and named exports
          [Everything.generateApolloPlugin, Everything.default].forEach((fn) => {
            const objectOne = fn()
            expect(objectOne).to.be.ok

            const { requestDidStart } = objectOne
            expect(requestDidStart).to.be.a('function')

            const objectTwo = requestDidStart($.context)
            expect(objectTwo).to.be.ok

            const { willSendResponse } = objectTwo
            expect(willSendResponse).to.be.a('function')
          })
        })
      })

      context('a custom testFn is supplied', function () {
        it('works', function () {
          // Test both the default and named exports
          [Everything.generateApolloPlugin, Everything.default].forEach((fn) => {
            const addMetadata = sinon.fake()
            restores.push(Everything.__set__('addMetadata', addMetadata))

            const objectOne = fn({
              testFn: (strang) => strang === 'foo'
            })
            expect(objectOne).to.be.ok

            const { requestDidStart } = objectOne
            expect(requestDidStart).to.be.a('function')

            let objectTwo = requestDidStart('not foo')
            expect(objectTwo).to.be.undefined

            objectTwo = requestDidStart('foo')
            expect(objectTwo).to.be.ok
            const { willSendResponse } = objectTwo
            expect(willSendResponse).to.be.a('function')

            expect(addMetadata).to.not.have.been.called
          })
        })

        it('works when testFn is async', async function () {
          // Test both the default and named exports
          for (const fn of [
            Everything.generateApolloPlugin,
            Everything.default
          ]) {
            const addMetadata = sinon.fake()
            restores.push(Everything.__set__('addMetadata', addMetadata))

            const objectOne = fn({
              testFn: (strang) => new Promise((resolve) => {
                resolve(strang === 'foo')
              }),
            })
            expect(objectOne).to.be.ok

            const { requestDidStart } = objectOne
            expect(requestDidStart).to.be.a('function')

            let objectTwo = requestDidStart('not foo')
            expect(objectTwo).to.be.ok

            let { willSendResponse } = objectTwo
            expect(willSendResponse).to.be.a('function')

            expect(addMetadata).to.not.have.been.called

            // eslint-disable-next-line no-await-in-loop
            let resolution = await willSendResponse({})
            expect(resolution).to.be.undefined
            // Not called with 'not foo'
            expect(addMetadata).to.not.have.been.called

            objectTwo = requestDidStart('foo')
            expect(objectTwo).to.be.ok;
            ({ willSendResponse } = objectTwo)
            expect(willSendResponse).to.be.a('function')
            expect(addMetadata).to.not.have.been.called
            // eslint-disable-next-line no-await-in-loop
            resolution = await willSendResponse({})
            expect(addMetadata).to.have.been.calledOnce
          }
        })
      })
    })
  })

  describe('addMetadata', function() {
    def('introspectionQueryResponse', generateIntrospectionQueryResponse)
    def('schemaMetadata', generateMetadata)
    def('params', () => ({
      introspectionQueryResponse: $.introspectionQueryResponse,
      schemaMetadata: $.schemaMetadata,
      metadataSourceKey: $.metadataSourceKey,
      metadataTargetKey: $.metadataTargetKey,
    }))

    it('adds metadata using default keys', function () {
      const response = Everything.addMetadata($.params)
      expect(response).to.be.ok
      const { types } = response.data.__schema

      const MyType = findType({ types, name: 'MyType' })
      const Query = findType({ types, name: 'Query' })
      const Mutation = findType({ types, name: 'Mutation' })
      const CreateUserInput = findType({ types, name: 'CreateUserInput', kind: 'INPUT_OBJECT' })
      const MyEnum = findType({ types, name: 'MyEnum', kind: KIND_ENUM })
      const MyInterface = findType({ types, name: 'MyInterface', kind: KIND_INTERFACE })

      expect(MyType).to.be.ok
      expect(Query).to.be.ok
      expect(Mutation).to.be.ok
      expect(CreateUserInput).to.be.ok
      expect(MyEnum).to.be.ok
      expect(MyInterface).to.be.ok

      let myArg = false

      expect(MyType.metadata).to.eql(defaultMetadata)
      const myTypeField = findField({ fields: MyType.fields })
      expect(myTypeField.metadata).to.eql(defaultMetadata)
      myArg = findArg({ args: myTypeField.args })
      expect(myArg.metadata).to.eql(defaultMetadata)

      expect(Query.metadata).to.eql(defaultMetadata)
      const myQueryField = findField({ fields: Query.fields, name: 'myQuery' })
      expect(myQueryField.metadata).to.eql(defaultMetadata)
      myArg = findArg({ args: myQueryField.args })
      expect(myArg.metadata).to.eql(defaultMetadata)


      expect(Mutation.metadata).to.eql(defaultMetadata)
      const myMutationField = findField({ fields: Mutation.fields, name: 'myMutation' })
      expect(myMutationField.metadata).to.eql(defaultMetadata)
      myArg = findArg({ args: myMutationField.args })
      expect(myArg.metadata).to.eql(defaultMetadata)

      expect(CreateUserInput.metadata).to.eql(defaultMetadata)
      for (const inputFieldName of ['name', 'email']) {
        const nameInputField = findField({ fields: CreateUserInput.inputFields, name: inputFieldName })
        expect(nameInputField.metadata).to.eql(defaultMetadata)
      }

      expect(MyEnum.metadata).to.eql(defaultMetadata)
      expect(findField({ fields: MyEnum.enumValues, name: 'ONE' }).metadata).to.not.be.ok
      expect(findField({ fields: MyEnum.enumValues, name: 'TWO' }).metadata).to.eql(defaultMetadata)
      expect(findField({ fields: MyEnum.enumValues, name: 'THREE' }).metadata).to.not.be.ok

      expect(MyInterface.metadata).to.eql(defaultMetadata)
      expect(findField({ fields: MyInterface.fields, name: 'id' }).metadata).to.eql(defaultMetadata)
      expect(findField({ fields: MyInterface.fields, name: 'foo' }).metadata).to.not.be.ok
    })

    describe('metadata target key overridden', function () {
      context('key is simple string', function () {
        def('metadataTargetKey', () => 'metameta')

        it('adds metadata to custom key', function () {
          const response = Everything.addMetadata($.params)
          expect(response).to.be.ok
          const { types } = response.data.__schema

          const MyType = findType({ types, name: 'MyType' })
          expect(MyType.metameta).to.eql(defaultMetadata)
        })
      })

      context('key is complex string', function () {
        def('metadataTargetKey', () => 'meta.meta')

        it('adds metadata to custom key', function () {
          const response = Everything.addMetadata($.params)
          expect(response).to.be.ok
          const { types } = response.data.__schema

          const MyType = findType({ types, name: 'MyType' })
          expect(MyType.meta.meta).to.eql(defaultMetadata)
        })
      })

      context('key is a simple array', function () {
        def('metadataTargetKey', () => ['meta', 'meta'])

        it('adds metadata to custom key', function () {
          const response = Everything.addMetadata($.params)
          expect(response).to.be.ok
          const { types } = response.data.__schema

          const MyType = findType({ types, name: 'MyType' })
          expect(MyType.meta.meta).to.eql(defaultMetadata)
        })
      })

      context('key is a complex array', function () {
        def('metadataTargetKey', () => ['meta.meta', 'meta'])

        it('adds metadata to custom key', function () {
          const response = Everything.addMetadata($.params)
          expect(response).to.be.ok
          const { types } = response.data.__schema

          const MyType = findType({ types, name: 'MyType' })
          expect(MyType['meta.meta'].meta).to.eql(defaultMetadata)
        })
      })
    })

    context('__schema not nested in "data" key', function () {
      def('introspectionQueryResponse', () => {
        return generateIntrospectionQueryResponse().data
      })

      it('adds metadata', function () {
        const response = Everything.addMetadata($.params)
        expect(response).to.be.ok
        const { types } = response.__schema

        const MyType = findType({ types, name: 'MyType' })
        expect(MyType).to.be.ok

        expect(MyType.metadata).to.eql(defaultMetadata)
      })
    })
  })
})

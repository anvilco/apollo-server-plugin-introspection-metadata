import {
  buildSchema,
  getIntrospectionQuery,
  graphqlSync,
} from 'graphql'

import generateApolloPlugin, {
  addMetadata,
  generateApolloPlugin as generateApolloPluginExport
} from 'dist'


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
`

const schema = buildSchema(schemaSDL)

function generateIntrospectionQueryResponse () {
  return graphqlSync(schema, getIntrospectionQuery())
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
    }
  }
}

function findType ({ types, name }) {
  return types.find((type) => type.name === name)
}

function findField ({ fields, name = 'myField' }) {
  return fields.find((field) => field.name === name)
}

function findArg ({ args, name = 'myArg' }) {
  return args.find((arg) => arg.name === name)
}

describe('src/index.js', function () {
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
          [generateApolloPlugin, generateApolloPluginExport].forEach((fn) => {

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
          [generateApolloPlugin, generateApolloPluginExport].forEach((fn) => {
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
      const response = addMetadata($.params)
      expect(response).to.be.ok
      const { types } = response.data.__schema

      const MyType = findType({ types, name: 'MyType' })
      const Query = findType({ types, name: 'Query' })
      const Mutation = findType({ types, name: 'Mutation' })

      expect(MyType).to.be.ok
      expect(Query).to.be.ok
      expect(Mutation).to.be.ok

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
    })

    describe('metadata target key overridden', function () {
      context('key is simple string', function () {
        def('metadataTargetKey', () => 'metameta')

        it('adds metadata to custom key', function () {
          const response = addMetadata($.params)
          expect(response).to.be.ok
          const { types } = response.data.__schema

          const MyType = findType({ types, name: 'MyType' })
          expect(MyType.metameta).to.eql(defaultMetadata)
        })
      })

      context('key is complex string', function () {
        def('metadataTargetKey', () => 'meta.meta')

        it('adds metadata to custom key', function () {
          const response = addMetadata($.params)
          expect(response).to.be.ok
          const { types } = response.data.__schema

          const MyType = findType({ types, name: 'MyType' })
          expect(MyType.meta.meta).to.eql(defaultMetadata)
        })
      })

      context('key is a simple array', function () {
        def('metadataTargetKey', () => ['meta', 'meta'])

        it('adds metadata to custom key', function () {
          const response = addMetadata($.params)
          expect(response).to.be.ok
          const { types } = response.data.__schema

          const MyType = findType({ types, name: 'MyType' })
          expect(MyType.meta.meta).to.eql(defaultMetadata)
        })
      })

      context('key is a complex array', function () {
        def('metadataTargetKey', () => ['meta.meta', 'meta'])

        it('adds metadata to custom key', function () {
          const response = addMetadata($.params)
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
        const response = addMetadata($.params)
        expect(response).to.be.ok
        const { types } = response.__schema

        const MyType = findType({ types, name: 'MyType' })
        expect(MyType).to.be.ok

        expect(MyType.metadata).to.eql(defaultMetadata)
      })
    })
  })
})

# @anvilco/apollo-server-plugin-introspection-metadata

> A plugin for Apollo Server that allows for adding metadata to GraphQL Introspection Query responses.

## Installation

Using npm:
```sh
npm install --save-prod @anvilco/apollo-server-plugin-introspection-metadata
```

Using yarn:
```sh
yarn add @anvilco/apollo-server-plugin-introspection-metadata
```

## Usage


Consider the following example GraphQL SDL:
```graphql
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

interface MyInterface {
  id: ID
}

enum MyEnum {
  ONE
  TWO
  THREE
}

```

When instantiating `ApolloServer`, pass the following options:

```js
import { ApolloServer } = from 'apollo-server'
import IntrospectionMetadataPlugin from '@anvilco/apollo-server-plugin-introspection-metadata'

// All keys are optional, all the way down the object.
// Only build/include what you want to add metadata for :)
const schemaMetadataByKind = {
  // Metadata for things of the kind "OBJECT"
  OBJECT: {
    MyType: {
      // Arbitrary metadata about the MyType Object
      metadata: {
        foo: "bar",
        baz: "bop",
      }
      fields: {
        myField: {
          // Arbitrary metadata about the myField Field
          metadata: {...}
          args: {
            myArg: {
              // Arbitrary metadata about the myArg Argument
              metadata: {...}
            }
          }
        }
      }
    },
    MyOtherType: {...},
    Query: {
      // Queries you've defined end up as Fields in the Queries Type, so this
      // structure follows that pattern
      fields: {
        myQuery: {
          // Arbitrary metadata about the myQuery Query
          metadata: {...}
          args: {
            myArg: {
              // Arbitrary metadata about the myArg Argument
              metadata: {...}
            }
          }
        }
      }
    },
    Mutation: {
      // Mutations you've defined end up as Fields in the Mutation Type, so
      // this structure follows that pattern
      fields: {
        myMutation: {
          // Arbitrary metadata about the myMutation Mutation
          metadata: {...}
          args: {
            myArg: {
              // Arbitrary metadata about the myArg Argument
              metadata: {...}
            }
          }
        }
      }
    },
    ...
  },
  // Metadata for things of the kind "INPUT_OBJECT"
  INPUT_OBJECT: {
    ...
  },
  // Metadata for things of the kind "SCALAR"
  SCALAR: {
    ...
  },
  // Metadata for things of the kind "ENUM"
  ENUM: {
    ...
  },
  // Metadata for things of the kind "INTERFACE"
  INTERFACE: {
    ...
  },
}

// If you want to only add this metadata in the Development
// environment:
const apolloPlugins = [];
if (process.env.NODE_ENV === 'development') {
  apolloPlugins.push(
    IntrospectionMetadataPlugin({
      schemaMetadata: schemaMetadataByKind
    })
  )
}

const apolloServer = new ApolloServer({
  //...
  introspection: true,
  plugins: apolloPlugins,
  //...
})
```

Output of the Intropection Query will the become something like this:

```js
{
  data: {
    __schema: {
      //...
      types: [
        {
          kind: "OBJECT"
          name: "MyType"
          metadata: {
            foo: "bar",
            baz: "bop",
          },
          fields: [{
            //...
            name: "myField",
            // myField metadata
            metadata: {...}
            args: [{
              //...
              name: "myArg",
              // myField's myArg metadata
              metadata: {...}
            }]
          }]
        },
        {
          kind: "OBJECT"
          name: "Query"
          fields: [{
            //...
            name: "myQuery",
            // myQuery metadata
            metadata: {...}
            args: [{
              //...
              name: "myArg",
              // myQuery's myArg metadata
              metadata: {...}
            }]
          }]
        },
        {
          kind: "OBJECT"
          name: "Mutation"
          fields: [{
            //...
            name: "myMutation",
            // myMutation metadata
            metadata: {...}
            args: [{
              //...
              name: "myArg",
              // myMutation's myArg metadata
              metadata: {...}
            }]
          }]
        },
        //...
      ]
    }
  }
}
```


## API

#### `generateApolloPlugin` (`default` export)
This is what you most likely came here for. See Javadoc in [index.js](src/index.js) for more details.

#### `addMetadata`
If you're not actually using Apollo Server, or want to augment an Introspection Query response from somewhere else with your metadata, then this function may be what you're looking for. See Javadoc in [index.js](src/index.js)

## References

Inspired from [@cleartax/apollo-server-plugin-introspection-auth](https://github.com/cleartax/apollo-server-plugin-introspection-auth).

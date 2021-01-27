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

When instantiating `ApolloServer`, pass the following options:

```js
import IntrospectionMetadataPlugin from '@anvilco/apollo-server-plugin-introspection-metadata'
//...

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
      // Queries you define end up as Fields in the Queries Type, so this
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
      // Mutations you define end up as Fields in the Mutation Type, so this
      // structure follows that pattern
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
  }
};

// If you want to only add this metadata in the Development
// environment:
const apolloPlugins = [];
if (process.env.NODE_ENV === 'development') {
  apolloPlugins.push(
    IntrospectionMetadataPlugin({
      schemaMetadata: schemaMetadataByKind
    })
  );
}

const apolloServer = new ApolloServer({
  //...
  introspection: true,
  plugins: apolloPlugins,
  //...
});
```


## References

Inspired from [@cleartax/apollo-server-plugin-introspection-auth](https://github.com/cleartax/apollo-server-plugin-introspection-auth).

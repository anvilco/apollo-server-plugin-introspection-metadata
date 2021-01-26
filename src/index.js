const REGEX_INTROSPECTION_QUERY = /\b(__schema|__type)\b/

// Default test function. Will look to see if it is an Introspection Query
function defaultTestFn (context) {
  return typeof context?.request?.query === 'string' && REGEX_INTROSPECTION_QUERY.test(context?.request?.query)
}

/**
 * This is a function that creates an Apollo Plugin that can be used to
 * add metadata to the response of all Introspection Queries. It will essentially
 * augment/mutate the Introspection Query results before they are returned to
 * the client, enriching them with the appropriate metadata
 *
 * Read more about plugins here:
 * https://www.apollographql.com/docs/apollo-server/integrations/plugins/
 *
 * @param  {Function} options.testFn - (OPTIONAL) A function to test the GraphQL request in order to determine
 *   if it's an operation for which we'd like to do something. In our case, we want to determine
 *   if it's an Introspection Query or not.
 *
 * @param  {Object} options.schemaMetadata - An object containing the metadata we'd like to augment
 *   any Introspection Query responses with, grouped by kind. Should be in the following structure:
 *   {
 *     "OBJECT": {
 *       Organization: {
 *         someKeyWhereMetadataLives: {
 *           meta: "data",
 *           moreMeta: "data",
 *         }
 *         fields: {
 *           someFieldWeHaveMetadataFor: {
 *             someKeyWhereMetadataLives: {...}
 *             args: {
 *               someArgWeHaveMetadataFor: {
 *                 someKeyWhereMetadataLives: {...}
 *               }
 *             }
 *           }
 *         }
 *       },
 *       AnotherType: {...},
 *       ...
 *     }
 *   }
 *
 * @param  {String} options.metadataKey - (OPTIONAL) A string path to where the metadata is stored in your
 *   structure. Defaults to 'metadata'
 *
 * @return {Object} - Returns an Object that conforms to the Apollo Server plugin pattern
 *   and can be added to the plugins of an Apollo Server instance.
 */
const generateDocuSpection = ({
  testFn = defaultTestFn,
  schemaMetadata,
  metadataKey = 'metadata',
} = {}) => {
  return {
    // Check at the beginning of the request whether we should do anything at all
    requestDidStart (context) {
      // If this request doesn't match what we're looking for (an Introspection Query), then do nothing.
      if (!testFn(context)) {
        return
      }

      return {
        // Hook into the response event
        willSendResponse (context) {
          const {
            response,
          } = context

          const {
            // It's weird...GraphQL jams everything interesting in the Introspection Query response
            // under the 'types' key
            types = [],
          } = (response?.data?.__schema || {})

          // Go through all the types in the Introspection Query response and augment them
          types.forEach((type) => augmentType({ type, schemaMetadata }))

          /**
           * Augment a Type in the Introspection Query response
           *
           * @param  {Object} options.type - The original Type from the Introspection Query response.
           *   Example:
           *     {
           *       "kind": "OBJECT",
           *       "name": "Organization",
           *       "description": "Foo and bar and stuff",
           *       "fields": [...],
           *       "inputFields": null,
           *       "interfaces": null,
           *       "enumValues": null,
           *       "possibleTypes": null
           *     }
           *
           * @param  {Object} options.schemaMetadata - The metadata we have for any/all Types that we
           *   want to use in the augmentations, grouped by kind.
           *   Example:
           *     {
           *       "OBJECT": {
           *         "Organization": {
           *           "metadata": {
           *             "foo": "bar",
           *             "baz": "bop"
           *           },
           *           "fields": {...}
           *         },
           *         ...
           *       },
           *       ...
           *     }
           *
           * @return undefined - The function call has side-effects, but does not return anything
           *   useful.
           */
          function augmentType ({ type = {}, schemaMetadata = {} }) {
            let {
              name,
              kind,
              fields = [],
            } = (type || {})

            // Bail if we don't have it
            if (!name) return

            fields ??= []

            const metadatasForKind = schemaMetadata[kind] || {}
            // Bail if we don't have it
            if (!metadatasForKind) {
              return
            }

            const {
              [metadataKey]: typeMetadata,
              fields: fieldsMetadata = {},
            } = (metadatasForKind[name] || {})

            // Add the metadata for this Type
            if (typeMetadata) {
              type[metadataKey] = typeMetadata
            }

            // Go through all the fields for this Type and augment them
            fields.forEach((field) => augmentField({ field, fieldsMetadata }))
          }

          /**
           * Augment a Field in the Introspection Query response
           *
           * @param  {Object} options.field - The original Field from the Introspection Query response
           *   Example:
           *     {
           *       name: "eid",
           *       description: "foo and bar and stuff",
           *       args: [...],
           *       type: {
           *         kind: "SCALAR",
           *         name: "String",
           *         ofType: null,
           *       },
           *       isDeprecated: false,
           *       deprecatedReason: null,
           *     }
           *
           * @param  {Object} options.fieldsMetadata - The metadata we have for any/all Fields for the
           *   parent Type of the Field in question.
           *   Example:
           *   {
           *     "eid": {
           *       "metadata": {
           *         "foo": "bar",
           *         "baz": "bop"
           *       },
           *       "args": {...}
           *     }
           *     ...
           *   }
           *
           * @return undefined - The function call has side-effects, but does not return anything
           *   useful.
           */
          function augmentField ({ field = {}, fieldsMetadata = {} }) {
            let {
              name,
              args = [],
            } = (field || {})

            // Bail if we don't have it
            if (!name) return

            args ??= []

            const {
              [metadataKey]: fieldMetadata,
              args: argsMetadata = {},
            } = (fieldsMetadata[name] || {})

            // Add metadata for this Field
            if (fieldMetadata) {
              field[metadataKey] = fieldMetadata
            }

            // Go through all the args for this Field and augment them
            args.forEach((arg) => augmentArg({ arg, argsMetadata }))
          }

          /**
           * Augment an Arg in the Introspection Query response
           *
           * @param  {Object} options.arg - The original Arg from the Introspection Query response
           *   Example:
           *     {
           *       name: "isArchived",
           *       description: "foo and bar and stuff",
           *       type: {
           *         kind: "SCALAR",
           *         name: "Boolean",
           *         ofType: null
           *       }
           *       defaultValue: false
           *     }
           *
           * @param  {Object} options.argsMetadata - The metadata we have for any/all Args for the
           *   parent Field of the Arg in question.
           *   Example:
           *     {
           *       isArchived: {
           *         metadata: {
           *           foo: "bar",
           *           baz: "bop"
           *         }
           *       }
           *     }
           *
           * @return undefined - The function call has side-effects, but does not return anything
           *   useful.
           */
          function augmentArg ({ arg = {}, argsMetadata = {} }) {
            const {
              name,
            } = arg

            // Bail if we don't have it
            if (!name) return

            const {
              [metadataKey]: argMetadata,
            } = (argsMetadata[name] || {})

            // Add metadata for this Arg
            if (argMetadata) {
              arg[metadataKey] = argMetadata
            }
          }
        },
      }
    },
  }
}

export default generateDocuSpection

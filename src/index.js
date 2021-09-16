import set from 'lodash.set'
import get from 'lodash.get'

const REGEX_INTROSPECTION_QUERY = /\b(__schema|__type)\b/

const KIND_OBJECT = 'OBJECT'
const KIND_INPUT_OBJECT = 'INPUT_OBJECT'

const FIELDS_KEY_FIELDS = 'fields'
const FIELDS_KEY_INPUT_FIELDS = 'inputFields'
const FIELDS_KEY_DEFAULT = FIELDS_KEY_FIELDS

const KIND_TO_FIELDS_KEY = {
  [KIND_OBJECT]: FIELDS_KEY_FIELDS,
  [KIND_INPUT_OBJECT]: FIELDS_KEY_INPUT_FIELDS,
}


// Default test function. Will look to see if it is an Introspection Query
function defaultTestFn (context) {
  return typeof context?.request?.query === 'string' && REGEX_INTROSPECTION_QUERY.test(context.request.query)
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
 * @param  {Object} options.introspectionQueryResponse - SEE 'addMetadata' BELOW
 *
 * @param  {Object} options.schemaMetadata - SEE 'addMetadata' BELOW
 *
 * @param  {String} options.metadataSourceKey - SEE 'addMetadata' BELOW
 *
 * @param  {String} options.metadataTargetKey - SEE 'addMetadata' BELOW
 *
 * @return {Object} - Returns an Object that conforms to the Apollo Server plugin pattern
 *   and can be added to the plugins of an Apollo Server instance.
 */
export const generateApolloPlugin = ({
  testFn = defaultTestFn,
  schemaMetadata,
  metadataSourceKey = 'metadata',
  metadataTargetKey = 'metadata',
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
            response: introspectionQueryResponse,
          } = context

          addMetadata({
            introspectionQueryResponse,
            schemaMetadata,
            metadataSourceKey,
            metadataTargetKey,
          })
        },
      }
    },
  }
}
export default generateApolloPlugin


/**
 * This function actually does the work of mutating the Introspection Query response object with the
 * metadata provided. Can be used standalone for usecases that are not Apollo Server Plugin scenarios.
 *
 * @param  {Object} options.introspectionQueryResponse - THIS PARAM WILL BE MUTATED - An Introspection
 *   Query response object. "__schema", etc, can either be wrapped in the "data" envelope, or that
 *   envelope can have been omitted.
 *
 * @param  {Object} options.schemaMetadata - An object containing the
 *   metadata we'd like to augment any Introspection Query responses with, grouped by kind. Should be
 *   in the following structure:
 *
 *   {
 *     "OBJECT": {
 *       SomeType: {
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
 * @param  {String | Array[String]} options.metadataSourceKey - (OPTIONAL) A string path or an array
 *   of strings to be fed to lodash.get to read the metadata from in your schemaMetadata structure at
 *   each level. Defaults to 'metadata'
 *
 * @param  {String | Array[String]} options.metadataTargetKey - (OPTIONAL) A string path or an array
 *   of strings to be fed to lodash.set to write the metadata to the Introspection Query at each
 *   level. Defaults to 'metadata'
 *
 *
 * @return {Object} - The mutated introspectionQueryResponse param.
 */
export const addMetadata = ({
  introspectionQueryResponse: response,
  schemaMetadata,
  metadataSourceKey = 'metadata',
  metadataTargetKey = 'metadata',
} = {}) => {
  const {
    types = [],
  } = (response?.data?.__schema || response?.__schema || {})

  // Go through all the types in the Introspection Query response and augment them
  types.forEach((type) => augmentType({ type, schemaMetadata }))

  return response

  /**
   * Augment a Type in the Introspection Query response
   *
   * @param  {Object} options.type - The original Type from the Introspection Query response.
   *   Example:
   *     {
   *       "kind": "OBJECT",
   *       "name": "MyType",
   *       "description": "Foo and bar and stuff",
   *       "fields": [...],
   *       "inputFields": null,
   *       "interfaces": null,
   *       "enumValues": null,
   *       "possibleTypes": null,
   *       ...
   *     }
   *
   * @param  {Object} options.schemaMetadata - The metadata we have for any/all Types that we
   *   want to use in the augmentations, grouped by kind.
   *   Example:
   *     {
   *       "OBJECT": {
   *         "MyType": {
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
   * @return undefined - The function call has side-effects, but does not return anything.
   */
  function augmentType ({ type = {}, schemaMetadata = {} }) {
    let {
      name,
      kind,
    } = (type || {})

    // Bail if we don't have it
    if (!name) return

    const fieldsKey = KIND_TO_FIELDS_KEY[kind] || FIELDS_KEY_DEFAULT

    const fields = type[fieldsKey] || []

    const metadatasForKind = schemaMetadata[kind] || {}
    // Bail if we don't have it
    if (!metadatasForKind) {
      return
    }

    const metaDatasForName = (metadatasForKind[name] || {})
    const typeMetadata = get(metaDatasForName, metadataSourceKey)
    const {
      [fieldsKey]: fieldsMetadata = {},
    } = metaDatasForName

    // Add the metadata for this Type
    if (typeMetadata) {
      set(type, metadataTargetKey, typeMetadata)
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
   *       name: "slug",
   *       description: "foo and bar and stuff",
   *       args: [...],
   *       type: {
   *         kind: "SCALAR",
   *         name: "String",
   *         ofType: null,
   *       },
   *       isDeprecated: false,
   *       deprecatedReason: null,
   *       ...
   *     }
   *
   * @param  {Object} options.fieldsMetadata - The metadata we have for any/all Fields for the
   *   parent Type of the Field in question.
   *   Example:
   *   {
   *     "slug": {
   *       "metadata": {
   *         "foo": "bar",
   *         "baz": "bop"
   *       },
   *       "args": {...},
   *     }
   *     ...
   *   }
   *
   * @return undefined - The function call has side-effects, but does not return anything.
   */
  function augmentField ({ field = {}, fieldsMetadata = {} }) {
    let {
      name,
      args = [],
    } = (field || {})

    // Bail if we don't have it
    if (!name) return

    args ??= []

    const fieldsMetadataForName = (fieldsMetadata[name] || {})
    const fieldMetadata = get(fieldsMetadataForName, metadataSourceKey)
    const {
      args: argsMetadata = {},
    } = fieldsMetadataForName

    // Add metadata for this Field
    if (fieldMetadata) {
      set(field, metadataTargetKey, fieldMetadata)
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
   *       defaultValue: false,
   *       ...
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
   *         },
   *       }
   *     }
   *
   * @return undefined - The function call has side-effects, but does not return anything.
   */
  function augmentArg ({ arg = {}, argsMetadata = {} }) {
    const {
      name,
    } = arg

    // Bail if we don't have it
    if (!name) return

    const argsMetadataForName = (argsMetadata[name] || {})
    const argMetadata = get(argsMetadataForName, metadataSourceKey)

    // Add metadata for this Arg
    if (argMetadata) {
      set(arg, metadataTargetKey, argMetadata)
    }
  }
}

# relay-compiler-plus

[![npm version](https://img.shields.io/npm/v/relay-compiler-plus.svg?style=flat-square)](https://www.npmjs.com/package/relay-compiler-plus) [![npm downloads](https://img.shields.io/npm/dm/relay-compiler-plus.svg?style=flat-square)](https://www.npmjs.com/package/relay-compiler-plus) [![npm](https://img.shields.io/npm/dt/relay-compiler-plus.svg?style=flat-square)](https://www.npmjs.com/package/relay-compiler-plus) [![npm](https://img.shields.io/npm/l/relay-compiler-plus.svg?style=flat-square)](https://www.npmjs.com/package/relay-compiler-plus)

> **Custom relay compiler which supports persisted queries** :bowtie:

Relay modern is awesome. However it's missing a few things, one of which is persisted queries. This package
is a custom relay compiler which supports:

* persisted queries
* direct compilation of graphql-js 

Direct graphql-js support means you can generate your relay queries, schema.graphql and query map files all
in a single step!

## Installation
```bash
yarn add relay-compiler-plus
```

Make sure you have the latest version of [graphql-js](https://github.com/graphql/graphql-js):
```bash
yarn upgrade graphql --latest  
```

## Usage
1. Add this npm command to your package.json:

    ```
    "scripts": {
        "rcp": "relay-compiler-plus --schema <SCHEMA_FILE_PATH> --src <SRC_DIR_PATH>"
    },
    ```

    where 
    * `<SCHEMA_FILE_PATH>` is the path to your schema.graphql or schema.json file or schema.js (yes! rcp now
    supports direct compilation from graphql-js!).
    * `<SRC_DIR_PATH>` is the path to your src directory

    then:
    ```
    npm run rcp
    ``` 
    
    this should generate:
    * query files (*.graphql.js) containing query ids and null query text.
    * A `queryMap.json` file under `<SRC_DIR_PATH>/queryMap.json`.
    This file can be consumed by the server to map the query ids to actual queries.
    * If you specified a schema.js file, this will also generate a `schema.graphql` 
    file under `<SRC_DIR_PATH>/schema.graphql`.
    
    If your graphql-js file is complex and you need to override the default webpack config
    you can do so like this:
    
    ```
    "scripts": {
        "rcp": "relay-compiler-plus --webpackConfig <WEBPACK_CONFIG_PATH> --src <SRC_DIR_PATH>"
    },
    ```
    
     where 
    * `<WEBPACK_CONFIG_PATH>` is the path to your custom webpack config to transpile your graphql-js
    schema. In your custom webpack config, you need to set `output.libraryTarget: 'commonjs2'`. See the [example config](https://github.com/yusinto/relay-compiler-plus/blob/master/example/src/server/webpack.config.js)
    for a working copy. 
      

2. On the server, use `matchQueryMiddleware` prior to `express-graphql` to match queryIds to actual queries. Note 
    that `queryMap.json` is auto-generated by relay-compiler-plus at step 1.

    ```javascript
    import Express from 'express';
    import expressGraphl from 'express-graphql';
    import {matchQueryMiddleware} from 'relay-compiler-plus'; // do this
    import queryMapJson from '../queryMap.json'; // do this

    const app = Express();

    app.use('/graphql',
      matchQueryMiddleware(queryMapJson), // do this
      expressGraphl({
        schema: graphqlSchema,
        graphiql: true,
      }));
    ```

3. On the client, modify your relay network fetch implementation to pass a `queryId` parameter in the
 request body instead of a `query` parameter. Note that `operation.id` is generated by `relay-compiler-plus` in step 1.

    ```javascript
    function fetchQuery(operation, variables,) {
      return fetch('/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          queryId: operation.id, // do this
          variables,
        }),
      }).then(response => {
        return response.json();
      });
    }
    ```

Run your app and that's it! 

## Example
Check the [example](https://github.com/yusinto/relay-compiler-plus/tree/master/example)
for a fully working demo.


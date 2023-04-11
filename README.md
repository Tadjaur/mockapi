<p align="center">
  <img src="https://raw.githubusercontent.com/Tadjaur/mockapi/main/assets/logo.png" width="200" alt="Mock Api Logo" />
</p>

<p align="center">
<span> An other open source api for mocking json data with a bonus of end point notification.</span>
</p>


## Serve Data
##### **Note: only public github repository is supported**

Mockapi use the file '.mockapi.yml' from your repository
as a configuration file.


| Property     | Type     | Mandatory | Description                                     | Default        |
| :----------- | :------- | :-------- | :---------------------------------------------- | :------------- |
| `dbFile`     | `string` | Optional  | The database file location. _e.g: public/raw.json_| db.json      |
| `dbDataPath` | `string` | Optional  | The root path to serve inside the databse file. _e.g: /data_ | / |
| `apiRoutePrefix` | `string` | Optional | The global prefix of the api. _e.g: /apiV1_  | /api           |
| `routes`     | `RouteConfig` | Optional | The routing configuration.  | **GET:** Accept:all / **POST:** Reject:all |
| `version`    | `string` | Required  | The version of the configuration. **Curent: 0.0.1** |

#### Describe `RouteConfig`
##### **Note: We use [path-to-regExp:6.2.1](https://github.com/pillarjs/path-to-regexp/tree/v6.2.1) to validate expression.**
| Property     | Type     | Mandatory | Description                                     | 
| :----------- | :------- | :-------- | :---------------------------------------------- | 
| `post` | `PostApi[]` | Optional  | The list of route configuration for post request. |
| `get`  | `string[]`  | Optional  | The list of get route regExp to authorize.  |

#### Describe `PostApi`

| Property     | Type     | Mandatory | Description                                     | 
| :----------- | :------- | :-------- | :---------------------------------------------- | 
| `path`       | `string` | Required  | The path expression for the desired route       |
| `scheduleNotification` | `PostNotification`  | Optional  | The a notification configuration if the current end point have to notify server _like payment end point_.  |
| `bodyFields`    | `Record<string, boolean>`  | Optional  | Decribe the body of incoming request. It's a record of authorized field name as key and mandatory as value.  |
| `restrictedBody` | `boolean`  | Optional  | Restrict body to the defined body field. Default: false |

#### Describe `PostNotification`

| Property     | Type     | Mandatory | Description                                     | 
| :----------- | :------- | :-------- | :---------------------------------------------- | 
| `followProp` | `string` | Required  | The body field of the incoming request which contain the url to notify       |
| `timeoutInSecond` | `number` | Optional |  The delay before sending notification to the provided url. Default: 60  |
| `notificationMethod`    | enum {'POST', 'GET'}  | Optional  | The method to use to notify the end point provided in the value of `followProp`. Default: GET  |
| `postDataPath` | `string`  | Optional  | The database path to the notification data. Used only when the `notificationMethod` is 'POST'. |

##### Note: When `notificationMethod` is POST `postDataPath` is defined and the desired data wasn't found in the database, null body will be posted to the notificationMethod.



## API Reference

Once the database created, The base path of your end point would be `https:mockapi.taurs.dev/:GITHUB_OWNER_ID/:REPO_NAME/:BRANCH_NAME`

#### E.g: Get List of predefined user.

```sh
  GET https://mockapi.taurs.dev/tadjaur/mockapi/main/api-1/user # api-1 here is the defined route prefix.
```
#### E.g: Get The first user of predefined users.

```sh
  GET https://mockapi.taurs.dev/tadjaur/mockapi/main/api-1/user/0
```


## Acknowledgements

 - [jsonplaceholder](jsonplaceholder.typicode.com/)

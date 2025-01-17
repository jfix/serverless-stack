---
description: "Docs for the sst.App construct in the @serverless-stack/resources package"
---

The `App` construct extends [`cdk.App`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.App.html) and is used internally by SST to:

- Automatically prefix stack names with the stage and app name
- Deploy the entire app using the same AWS profile and region

It is made available as the `app` in the `lib/index.js` of your SST app.

```js
export default function main(app) {
  new MySampleStack(app, "sample");
}
```

Since it is initialized internally, the props that are passed to `App` cannot be changed.

## Examples

### Accessing app properties

The properties of the app can be accessed in the `lib/index.js` as:

```js
app.name;
app.stage;
app.region;
```

### Specifying default function props

You can set some function props and have them apply to all the functions in the app.

```js
app.setDefaultFunctionProps({
  timeout: 20,
  memorySize: 512,
  runtime: "go1.x",
  environment: { tableName: table.tableName },
});
```

## Properties

The following properties are made available in addition to the properties of [`cdk.App`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.App.html#properties).

### name

_Type_ : `string`

The name of the app. This comes from the `name` in your `sst.json`.

### stage

_Type_ : `string`

The stage the app is being deployed to. If this is not specified as the `--stage` option in the CLI, it'll default to the `stage` in your `sst.json`.

### region

_Type_ : `string`

The region the app is being deployed to. If this is not specified as the `--region` option in the CLI, it'll default to the `region` in your `sst.json`.

## Methods

### setDefaultFunctionProps

```ts
setDefaultFunctionProps(props: FunctionProps)
```

_Parameters_

- **props** [`FunctionProps`](Function.md#functionprops)

The default function props to be applied to all the Lambda functions in the app. These default values are overridden by the props provided for a given `function`. Except for the `environment` property, which will be merged.

### logicalPrefixedName

```ts
logicalPrefixedName(logicalName: string): string
```

_Parameters_

- **logicalName** `string`

_Returns_

- `string`

Use this method to prefix resource names in your stacks to make sure they don't thrash when deployed to different stages in the same AWS account. This method will prefix a given resource name with the stage and app name. Using the format `${stage}-${name}-${logicalName}`.

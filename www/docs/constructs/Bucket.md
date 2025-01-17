---
description: "Docs for the sst.Bucket construct in the @serverless-stack/resources package. This construct creates an S3 Bucket."
---

The `Bucket` construct is a higher level CDK construct that makes it easy to create a serverless pub/sub service. You can create a bucket that has a list of notifications. And you can publish messages to it from any part of your serverless app.

This construct makes it easier to define a bucket and its notifications. It also internally connects the notifications and bucket together.

## Initializer

```ts
new Bucket(scope: Construct, id: string, props: BucketProps)
```

_Parameters_

- scope [`Construct`](https://docs.aws.amazon.com/cdk/api/latest/docs/constructs.Construct.html)
- id `string`
- props [`BucketProps`](#bucketprops)

## Examples

### Using the minimal config

```js
new Bucket(this, "Bucket", {
  notifications: ["src/notification.main"],
});
```

### Adding notifications

Add notifications after the bucket has been created.

```js {14-21}
import * as s3 from "@aws-cdk/aws-s3";

const bucket = new Bucket(this, "Bucket", {
  notifications: [
    {
      function: "src/notification1.main",
      notificationProps: {
        events: [s3.EventType.OBJECT_CREATED],
      },
    },
  ],
});

bucket.addNotifications(this, [
  {
    function: "src/notification2.main",
    notificationProps: {
      events: [s3.EventType.OBJECT_REMOVED],
    },
  },
]);
```

### Lazily adding notifications

Create an _empty_ bucket and lazily add the notifications.

```js {3}
const bucket = new Bucket(this, "Bucket");

bucket.addNotifications(this, ["src/notification.main"]);
```

### Giving the notifications some permissions

Allow the notification functions to access S3.

```js {20}
import * as s3 from "@aws-cdk/aws-s3";

const bucket = new Bucket(this, "Bucket", {
  notifications: [
    {
      function: "src/notification1.main",
      notificationProps: {
        events: [s3.EventType.OBJECT_CREATED],
      },
    },
    {
      function: "src/notification2.main",
      notificationProps: {
        events: [s3.EventType.OBJECT_REMOVED],
      },
    },
  ],
});

bucket.attachPermissions(["s3"]);
```

### Giving a specific notification some permissions

Allow the first notification function to access S3.

```js {20}
import * as s3 from "@aws-cdk/aws-s3";

const bucket = new Bucket(this, "Bucket", {
  notifications: [
    {
      function: "src/notification1.main",
      notificationProps: {
        events: [s3.EventType.OBJECT_CREATED],
      },
    },
    {
      function: "src/notification2.main",
      notificationProps: {
        events: [s3.EventType.OBJECT_REMOVED],
      },
    },
  ],
});

bucket.attachPermissionsToNotification(0, ["s3"]);
```

### Configuring the S3 Bucket

Configure the internally created CDK `Bucket` instance.

```js {2-4}
new Bucket(this, "Bucket", {
  s3Bucket: {
    bucketName: "my-bucket",
  },
});
```

### Configuring a notification

Configure the internally created CDK `Notification`.

```js {5-14}
import * as s3 from "@aws-cdk/aws-s3";

new Bucket(this, "Bucket", {
  notifications: [
    {
      function: "src/notification1.main",
      notificationProps: {
        events: [s3.EventType.OBJECT_CREATED_PUT],
        filters: [{ prefix: "imports/" }, { suffix: ".jpg" }],
      },
    },
  ],
});
```

## Properties

An instance of `Bucket` contains the following properties.

### s3Bucket

_Type_ : [`cdk.aws-s3.Bucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.Bucket.html)

The internally created CDK `Bucket` instance.

### notificationFunctions

_Type_ : `Function[]`

A list of the internally created [`Function`](Function.md) instances for the notifications.

## Methods

An instance of `Bucket` contains the following methods.

### addNotifications

```ts
addNotifications(scope: cdk.Construct, notifications: (FunctionDefinition | BucketNotificationProps)[])
```

_Parameters_

- **scope** `cdk.Construct`
- **notifications** `(FunctionDefinition | BucketNotificationProps)[]`

A list of [`FunctionDefinition`](Function.md#functiondefinition) or [`BucketNotificationProps`](#bucketnotificationprops) objects that'll be used to create the notifications for the bucket.

### attachPermissions

```ts
attachPermissions(permissions: Permissions)
```

_Parameters_

- **permissions** [`Permissions`](../util/Permissions.md#permissions)

Attaches the given list of [permissions](../util/Permissions.md#permissions) to all the `notificationFunctions`. This allows the notifications to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

### attachPermissionsToNotification

```ts
attachPermissions(index: number, permissions: Permissions)
```

_Parameters_

- **index** `number`

- **permissions** [`Permissions`](../util/Permissions.md#permissions)

Attaches the given list of [permissions](../util/Permissions.md#permissions) to a specific function in the list of `notificationFunctions`. Where `index` (starting at 0) is used to identify the notification. This allows that notification to access other AWS resources.

Internally calls [`Function.attachPermissions`](Function.md#attachpermissions).

## BucketProps

### notifications?

_Type_ : `(FunctionDefinition | BucketNotificationProps)[]`, _defaults to_ `[]`

A list of [`FunctionDefinition`](Function.md#functiondefinition) or [`BucketNotificationProps`](#bucketnotificationprops) objects that'll be used to create the notifications for the bucket.

### s3Bucket?

_Type_ : `cdk.aws-s3.Bucket | cdk.aws-s3.BucketProps`, _defaults to_ `undefined`

Or optionally pass in a CDK [`cdk.aws-s3.BucketProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.BucketProps.html) or a [`cdk.aws-s3.Bucket`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-s3.Bucket.html) instance. This allows you to override the default settings this construct uses internally to create the bucket.

## BucketNotificationProps

### function

_Type_ : `FunctionDefinition`

A [`FunctionDefinition`](Function.md#functiondefinition) object that'll be used to create the notification function for the bucket.

### notificationProps?

_Type_ : [`cdk.aws-lambda-event-sources.lambdaEventSources.S3EventSourceProps`](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda-event-sources.S3EventSourceProps.html), _defaults to_ `S3EventSourceProps` with events set to `[OBJECT_CREATED, OBJECT_REMOVED]`

Or optionally pass in a CDK `S3EventSourceProps`. This allows you to override the default settings this construct uses internally to create the notification.

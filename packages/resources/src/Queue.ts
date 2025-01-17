import * as cdk from "@aws-cdk/core";
import * as sqs from "@aws-cdk/aws-sqs";
import * as lambdaEventSources from "@aws-cdk/aws-lambda-event-sources";
import { App } from "./App";
import { Function as Fn, FunctionDefinition } from "./Function";
import { Permissions } from "./util/permission";

export interface QueueProps {
  readonly sqsQueue?: sqs.IQueue | sqs.QueueProps;
  readonly consumer?: FunctionDefinition | QueueConsumerProps;
}

export interface QueueConsumerProps {
  readonly function: FunctionDefinition;
  readonly consumerProps?: lambdaEventSources.SqsEventSourceProps;
}

export class Queue extends cdk.Construct {
  public readonly sqsQueue: sqs.Queue;
  public consumerFunction?: Fn;
  private readonly permissionsAttachedForAllConsumers: Permissions[];

  constructor(scope: cdk.Construct, id: string, props?: QueueProps) {
    super(scope, id);

    const root = scope.node.root as App;
    const {
      // Queue props
      sqsQueue,
      // Function props
      consumer,
    } = props || {};
    this.permissionsAttachedForAllConsumers = [];

    ////////////////////
    // Create Queue
    ////////////////////
    if (cdk.Construct.isConstruct(sqsQueue)) {
      this.sqsQueue = sqsQueue as sqs.Queue;
    } else {
      const sqsQueueProps = (sqsQueue || {}) as sqs.QueueProps;
      this.sqsQueue = new sqs.Queue(this, "Queue", {
        queueName: root.logicalPrefixedName(id),
        ...sqsQueueProps,
      });
    }

    ///////////////////////////
    // Create Consumer
    ///////////////////////////

    if (consumer) {
      this.addConsumer(this, consumer);
    }
  }

  addConsumer(
    scope: cdk.Construct,
    consumer: FunctionDefinition | QueueConsumerProps
  ): void {
    if (this.consumerFunction) {
      throw new Error("Cannot configure more than 1 consumer for a Queue");
    }

    // create consumer
    if ((consumer as QueueConsumerProps).function) {
      consumer = consumer as QueueConsumerProps;
      this.consumerFunction = Fn.fromDefinition(
        scope,
        "Consumer",
        consumer.function
      );
      this.consumerFunction.addEventSource(
        new lambdaEventSources.SqsEventSource(
          this.sqsQueue,
          consumer.consumerProps
        )
      );
    } else {
      consumer = consumer as FunctionDefinition;
      this.consumerFunction = Fn.fromDefinition(scope, `Consumer`, consumer);
      this.consumerFunction.addEventSource(
        new lambdaEventSources.SqsEventSource(this.sqsQueue)
      );
    }

    // attach permissions
    this.permissionsAttachedForAllConsumers.forEach((permissions) => {
      if (this.consumerFunction) {
        this.consumerFunction.attachPermissions(permissions);
      }
    });
  }

  attachPermissions(permissions: Permissions): void {
    if (this.consumerFunction) {
      this.consumerFunction.attachPermissions(permissions);
    }

    this.permissionsAttachedForAllConsumers.push(permissions);
  }
}

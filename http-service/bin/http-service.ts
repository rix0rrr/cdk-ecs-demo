#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/cdk');
import { HttpServiceStack } from '../lib/http-service-stack';
import { ClusterStack } from '../lib/cluster-stack';

const app = new cdk.App();
const clusterStack = new ClusterStack(app, 'ClusterStack');

new HttpServiceStack(app, 'HttpServiceStack', {
  vpc: clusterStack.vpc,
  cluster: clusterStack.cluster,
});

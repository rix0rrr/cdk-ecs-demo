import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import cdk = require('@aws-cdk/cdk');

export class ClusterStack extends cdk.Stack {
  public readonly vpc: ec2.VpcNetwork;
  public readonly cluster: ecs.Cluster;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.VpcNetwork(this, 'Vpc', { maxAZs: 2 });
    this.cluster = new ecs.Cluster(this, 'Cluster', { vpc: this.vpc });
    this.cluster.addCapacity('DefaultCapacity', {
      instanceType: new ec2.InstanceType('m3.medium'),
    });
  }
}


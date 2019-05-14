import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');
import cdk = require('@aws-cdk/cdk');
import path = require('path');

export interface HttpServiceStackProps extends cdk.StackProps {
  vpc: ec2.VpcNetwork;
  cluster: ecs.Cluster;
  image?: ecs.ContainerImage;
}

export class HttpServiceStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: HttpServiceStackProps) {
    super(scope, id, props);

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      memoryMiB: '512',
      cpu: '256'
    });

    const image = props.image || new ecs.AssetImage(this, 'Image', {
      directory: path.join(__dirname, '..', '..', 'demo-http-server')
    });
    const container = taskDefinition.addContainer("WebServer", {
      image,
    });
    container.addPortMappings({ containerPort: 8000 });

    // Instantiate Fargate Service with just cluster and image
    const service = new ecs.FargateService(this, 'Service', {
      cluster: props.cluster,
      taskDefinition,
    });

    const lb = new elbv2.ApplicationLoadBalancer(this, 'LB', {
      vpc: props.vpc,
      internetFacing: true
    });

    const listener = lb.addListener('HttpListener', {
      port: 80
    });

    listener.addTargets('DefaultTarget', {
      port: 8000,
      targets: [service],
      deregistrationDelaySec: 30,
    });

    // CfnOutput the DNS where you can access your service
    new cdk.CfnOutput(this, 'LoadBalancerDNS', { value: lb.dnsName });
  }
}

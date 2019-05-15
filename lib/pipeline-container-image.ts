import ecs = require('@aws-cdk/aws-ecs');
import cdk = require('@aws-cdk/cdk');
import ecr = require('@aws-cdk/aws-ecr');

export class PipelineContainerImage extends ecs.ContainerImage {
  public readonly imageName: string;
  private readonly repository: ecr.IRepository;
  private parameter?: cdk.CfnParameter;

  constructor(repository: ecr.IRepository) {
    super();
    this.imageName = repository.repositoryUriForTag(new cdk.Token(() => this.parameter!.stringValue).toString());
    this.repository = repository;
  }

  public bind(containerDefinition: ecs.ContainerDefinition): void {
    this.repository.grantPull(containerDefinition.taskDefinition.obtainExecutionRole());
    this.parameter = new cdk.CfnParameter(containerDefinition, 'PipelineParam', {
      type: 'String',
    });
  }

  public get paramName(): string {
    return new cdk.Token(() => this.parameter!.logicalId).toString();
  }

  public toRepositoryCredentialsJson(): ecs.CfnTaskDefinition.RepositoryCredentialsProperty | undefined {
    return undefined;
  }
}

import cdk = require('@aws-cdk/cdk');
import ecr = require('@aws-cdk/aws-ecr');
import codebuild = require('@aws-cdk/aws-codebuild');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import codepipeline_actions = require('@aws-cdk/aws-codepipeline-actions');

export class CodePipelineStack extends cdk.Stack {
  public readonly repository: ecr.Repository;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, {
      ...props,
      autoDeploy: false,
    });

    this.repository = new ecr.Repository(this, 'EcrRepo');

    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: 'GitHub',
      owner: 'rix0rrr',
      repo: 'cdk-ecs-demo',
      oauthToken: cdk.SecretValue.secretsManager('my-github-token'),
      output: sourceOutput,
      trigger: codepipeline_actions.GitHubTrigger.Poll,
    });

    const dockerBuild = new codebuild.PipelineProject(this, 'DockerCodeBuildProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_DOCKER_17_09_0,
        privileged: true,
      },
      buildSpec: {
        version: '0.2',
        phases: {
          pre_build: {
            commands: '$(aws ecr get-login --no-include-email --region $AWS_DEFAULT_REGION)',
          },
          build: {
            commands: 'docker build -t $REPOSITORY_URI:latest demo-http-server',
          },
          post_build: {
            commands: [
              'docker push $REPOSITORY_URI:latest',
              `printf '[{ "name": "Main", "imageUri": "%s" }]' $REPOSITORY_URI:latest > imagedefinitions.json`,
            ],
          },
        },
        artifacts: {
          files: 'imagedefinitions.json',
        },
      },
      environmentVariables: {
        'REPOSITORY_URI': {
          value: this.repository.repositoryUri,
        },
      },
    });
    this.repository.grantPullPush(dockerBuild);

    new codepipeline.Pipeline(this, 'Pipeline', {
      stages: [
        {
          name: 'Source',
          actions: [sourceAction],
        },
        {
          name: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'DockerBuild',
              project: dockerBuild,
              input: sourceOutput,
              output: new codepipeline.Artifact(),
            }),
          ],
        },
        // {
        //   name: 'Deploy',
        //   actions: deployActions,
        // },
      ],
    });
  }
}

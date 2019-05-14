import cdk = require('@aws-cdk/cdk');
import ecr = require('@aws-cdk/aws-ecr');
import codebuild = require('@aws-cdk/aws-codebuild');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import codepipeline_actions = require('@aws-cdk/aws-codepipeline-actions');
import { PipelineContainerImage } from "./pipeline-container-image";

export class CodePipelineStack extends cdk.Stack {
  public readonly repository: ecr.Repository;
  public readonly builtImage: PipelineContainerImage;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, {
      ...props,
      autoDeploy: false,
    });

    this.repository = new ecr.Repository(this, 'EcrRepo');
    this.builtImage = new PipelineContainerImage(this.repository);

    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: 'GitHub',
      owner: 'rix0rrr',
      repo: 'cdk-ecs-demo',
      branch: 'adamruka',
      oauthToken: cdk.SecretValue.secretsManager('my-github-token'),
      output: sourceOutput,
      trigger: codepipeline_actions.GitHubTrigger.Poll,
    });

    const cdkBuild = new codebuild.PipelineProject(this, 'CdkBuildProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.UBUNTU_14_04_NODEJS_8_11_0,
      },
      buildSpec: {
        version: '0.2',
        phases: {
          install: {
            commands: [
              'cd http-service',
              'npm install',
            ],
          },
          build: {
            commands: [
              'npm run build',
              'npm run cdk synth ProdHttpServiceStack -- -o .',
            ],
          },
        },
        artifacts: {
          'base-directory': 'http-service',
          files: 'ProdHttpServiceStack.template.yaml',
        },
      },
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
            commands: 'docker build -t $REPOSITORY_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION demo-http-server',
          },
          post_build: {
            commands: [
              'docker push $REPOSITORY_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION',
              `printf '{ "imageTag": "'$CODEBUILD_RESOLVED_SOURCE_VERSION'" }' > imageTag.json`,
            ],
          },
        },
        artifacts: {
          files: 'imageTag.json',
        },
      },
      environmentVariables: {
        'REPOSITORY_URI': {
          value: this.repository.repositoryUri,
        },
      },
    });
    this.repository.grantPullPush(dockerBuild);

    const dockerBuildOutput = new codepipeline.Artifact();
    const cdkBuildOutput = new codepipeline.Artifact();

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
              output: dockerBuildOutput,
            }),
            new codepipeline_actions.CodeBuildAction({
              actionName: 'CdkBuild',
              project: cdkBuild,
              input: sourceOutput,
              output: cdkBuildOutput,
            })
          ],
        },
        {
          name: 'Deploy',
          actions: [
            new codepipeline_actions.CloudFormationCreateUpdateStackAction({
              actionName: 'CFN_Deploy',
              stackName: 'ProdHttpServiceStack',
              templatePath: cdkBuildOutput.atPath('ProdHttpServiceStack.template.yaml'),
              adminPermissions: true,
              parameterOverrides: {
                [this.builtImage.paramName]: dockerBuildOutput.getParam('imageTag.json', 'imageTag'),
              },
              extraInputs: [dockerBuildOutput],
            }),
          ],
        },
      ],
    });
  }
}

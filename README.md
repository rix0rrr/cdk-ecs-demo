# Demo of deploying ECS application using CDK

This repository shows how an asset-based ECS application written in CDK can be
deployed, both directly from your developer desktop for testing as well as
automatically using a pipeline in production.

Demo written against CDK **0.31.0**.

## Explanation

The application contains 4 stacks:

- **ClusterStack**: a stack with a VPC and an ECS cluster, needs to be manually deployed (that is not a best practice, but it is the current state of this example).
- **HttpServiceStack**: a *development* instance of the stack defining the ECS service. This stack uses an AssetImage, meaning it will build and push the ECS image in the repository when deployed.
- **ProdHttpServiceStack**: a *production* instance of the stack defining the ECS service. This stack takes the Docker image as a pipeline input, to be supplied at deployment time.
- **CodePipelineStack**: a stack defining an ECR repository and a CodePipeline which will build both the CDK app and the Docker image, then finally deploy the combination through CloudFormation.

### Pipeline

The pipeline looks like this:

```
┌──────────────┐               
│    SOURCE    │               
│              │               
│    GitHub    │               
└──────────────┘               
        │                      
        ├──────────────┐       
        │              │       
        ▽              ▽       
┌──────────────┬──────────────┐
│    BUILD     │    BUILD     │
│              │              │
│ DockerBuild  │   CdkBuild   │
└──────────────┴──────────────┘
        │              │       
        ├──────────────┘       
        │                      
        ▽                      
┌──────────────┐               
│    DEPLOY    │               
│              │               
│  CFN_Deploy  │               
└──────────────┘               
```

## To deploy manually (using asset, for development purposes)

```ts
npm run build
npx cdk deploy HttpServiceStack
```

## To deploy using CI/CD

Fork this repository to your own repository, update the repository name in
`lib/code-pipeline-stack.ts`, and deploy the pipeline so:

```ts
npm run build
npx cdk deploy CodePipelineStack
```

NOTE: It would probably be better to parameterize the pipeline source, but this example
is simplified somewhat for understandability.

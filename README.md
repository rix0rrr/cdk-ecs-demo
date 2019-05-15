# Demo of deploying ECS application using CDK

This repository shows how an asset-based ECS application written in CDK can be
deployed, both directly from your developer desktop for testing as well as
automatically using a pipeline in production.

Demo written against CDK **0.31.0**.

# To deploy manually

```ts
npm run build
npx cdk deploy HttpServiceStack
```

# To deploy using CI/CD

Fork this repository to your own repository, update the repository name in
`lib/code-pipeline-stack.ts`, and deploy the pipeline so:

```ts
npm run build
npx cdk deploy CodePipelineStack
```

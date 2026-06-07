+++
title = "牌一覧"
weight = 2
+++

## 萬子

**コンピューティングとサーバレス**

- [AWS Lambda](https://aws.amazon.com/lambda/)
- [Amazon EC2](https://aws.amazon.com/ec2/)
- [Amazon ECS](https://aws.amazon.com/ecs/)
- [Amazon EC2 Auto Scaling](https://aws.amazon.com/ec2/autoscaling/)
- [AWS Batch](https://aws.amazon.com/batch/)
- [Amazon ECR](https://aws.amazon.com/ecr/)
- [AWS Step Functions](https://aws.amazon.com/step-functions/)
- [Amazon EventBridge](https://aws.amazon.com/eventbridge/)
- [Amazon SQS](https://aws.amazon.com/sqs/)

<div id="manzu"></div>

## 筒子

**ネットワークとDevTools**

- [AWS Direct Connect](https://aws.amazon.com/directconnect/)
- [Amazon API Gateway](https://aws.amazon.com/api-gateway/)
- [Elastic Load Balancing](https://aws.amazon.com/elasticloadbalancing/)
- [Amazon CloudFront](https://aws.amazon.com/cloudfront/)
- [Amazon Route 53](https://aws.amazon.com/route53/)
- [AWS CloudFormation](https://aws.amazon.com/cloudformation/)
- [AWS CodeCommit](https://aws.amazon.com/codecommit/)
- [AWS CodeBuild](https://aws.amazon.com/codebuild/)
- [AWS CodeDeploy](https://aws.amazon.com/codedeploy/)


<div id="pinzu"></div>

## 索子

**ストレージとAI/MLとデータベース**

- [AWS Storage Gateway](https://aws.amazon.com/storagegateway/)
- [Amazon EFS](https://aws.amazon.com/efs/)
- [Amazon S3](https://aws.amazon.com/s3/)
- [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/agentcore/)
- [Amazon Bedrock](https://aws.amazon.com/bedrock/)
- [Amazon SageMaker](https://aws.amazon.com/sagemaker/)
- [Amazon Aurora](https://aws.amazon.com/rds/aurora/)
- [Amazon DynamoDB](https://aws.amazon.com/dynamodb/)
- [Amazon ElastiCache](https://aws.amazon.com/elasticache/)

<div id="souzu"></div>

## 字牌

**リージョンなど**

- US-EAST
- AF-SOUTH
- EU-WEST
- AP-NORTHEAST
- [Kiro](https://kiro.dev/)
- [AWS Cost Explorer](https://aws.amazon.com/aws-cost-management/aws-cost-explorer/)
- [AWS IAM](https://aws.amazon.com/iam/)

<div id="jihai"></div>


<script type="module">
  const assetRoot = "{{< asseturl "assets/v2.0.0" >}}";
  const { renderWithOutputTheme } = await import(`${assetRoot}/merjong-wrapper.js`);

  const baseUrl = `${assetRoot}/output/`;
  const rows = [
    { id: "manzu", mpsz: "123456789m" },
    { id: "pinzu", mpsz: "123456789p" },
    { id: "souzu", mpsz: "123456789s" },
    { id: "jihai", mpsz: "1234567z" },
  ];

  rows.forEach(({ id, mpsz }) => {
    const target = document.getElementById(id);
    if (!target) {
      return;
    }
    target.innerHTML = renderWithOutputTheme(mpsz, baseUrl);
  });
</script>

# serverless-s3-encryption

set or remove the encryption settings on the s3 buckets in your serverless stack

This plugin runs on the `after:deploy` hook, but you can also run it manually with: `sls s3-encryption update`

## Install

`npm install --save-dev serverless-s3-encryption`

## Usage

See the example below for how to modify your `serverless.yml`

```yaml
# serverless.yml

plugins:
  # ...
  - serverless-s3-encryption

custom:
  # ...
  s3-encryption:
    buckets:
      MyEncryptedBucket:
        # see: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putBucketEncryption-property
        # accepted values: none, AES256, aws:kms
        SSEAlgorithm: AES256
        # only if SSEAlgorithm is aws:kms
        KMSMasterKeyID: STRING_VALUE 

resources:
  Resources:
    MyEncryptedBucket:
      Type: "AWS::S3::Bucket"
      Description: my encrypted bucket
      DeletionPolicy: Retain
```

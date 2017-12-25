# serverless-s3-encryption

set / remove the encryption settings on the buckets in your serverless stack

This plugin runs on the `after:deploy` hook, but you can also run it manually with: `sls s3-encryption update`

## Usage

See the example below for how to modify your `serverless.yml`

```yaml
# serverless.yml

plugins:
  # ...
  - serverless-s3-encryption

custom:
  # ...
  serverless-s3-encryption:
    buckets:
      MyEncryptedBucket:
        # see: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putBucketEncryption-property
        # accepted values: none, AES256, aws:kms
        SSEEncryption: AES256
        # only if SSEEncryption is aws:kms
        KMSMasterKeyID: STRING_VALUE 

resources:
  Resources:
    MyEncryptedBucket:
      Type: "AWS::S3::Bucket"
      Description: my encrypted bucket
      DeletionPolicy: Retain
```

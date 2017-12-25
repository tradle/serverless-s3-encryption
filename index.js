const Promise = require('bluebird')
const co = require('co')
const AWS = require('aws-sdk')
const _ = require('lodash')
const PLUGIN_SHORT_NAME = 's3-encryption'

class S3Encryption {
  constructor(serverless, options) {
    this.serverless = serverless
    this.options = options || {}
    this.hooks = {
      'after:deploy:deploy': this.afterDeploy.bind(this),
      's3-encryption:update:end': this.setEncryption.bind(this)
    };

    this.commands = {
      [PLUGIN_SHORT_NAME]: {
        commands: {
          'update': {
            lifecycleEvents: [
              'end'
            ]
          }
        }
      }
    }

    this.provider = this.serverless.getProvider(this.serverless.service.provider.name)
    this.stage = null
    this.stackName = null
  }

  log(message) {
    this.serverless.cli.log(`${PLUGIN_SHORT_NAME}: ${message}`)
  }

  afterDeploy() {
    return this.setEncryption()
  }

  listStackResources() {
    return co(function* () {
      let resources = []
      const opts = { StackName: this.stackName }
      while (true) {
        let {
          StackResourceSummaries,
          NextToken
        } = yield this.provider.request('CloudFormation', 'listStackResources', opts)

        resources = resources.concat(StackResourceSummaries)
        opts.NextToken = NextToken
        if (!opts.NextToken) break
      }

      return resources
    }.bind(this))
  }

  getBuckets() {
    return co(function* () {
      const resources = yield this.listStackResources()
      const byId = {}
      resources
        .filter(({ ResourceType }) => ResourceType === 'AWS::S3::Bucket')
        .forEach(resource => {
          const { LogicalResourceId } = resource
          byId[LogicalResourceId] = resource
        })

      return byId
    }.bind(this))
  }

  setEncryption() {
    return co(function* () {
      _.extend(this.options, this.serverless.service.custom['s3-encryption'] || {})
      this.stage = this.options.stage || this.serverless.service.provider.stage
      this.stackName = this.provider.naming.getStackName(this.stage)
      const { Resources } = this.serverless.service.resources

      const { buckets={} } = this.options
      const logicalIds = Object.keys(buckets)
      if (!logicalIds.length) return

      for (const logicalId of logicalIds) {
        if (!(logicalId in Resources)) {
          throw new Error(`no bucket found in Resources with id ${logicalId}`)
        }
      }

      const cf = yield this.getBuckets()
      yield Promise.all(logicalIds.map(logicalId => this.setEncryptionForBucket({
        bucket: cf[logicalId].PhysicalResourceId,
        encryption: buckets[logicalId]
      })))
    }.bind(this))
  }

  setEncryptionForBucket({ bucket, encryption }) {
    return co(function* () {
      if (encryption.SSEAlgorithm.toLowerCase() === 'none') {
        this.log(`removing server-side encryption from bucket ${bucket}`)
        yield this.provider.request('S3', 'deleteBucketEncryption', { Bucket: bucket })
        return
      }

      this.log(`setting server-side encryption for bucket ${bucket}`)
      yield this.provider.request('S3', 'putBucketEncryption', toParams({ bucket, encryption }))
    }.bind(this))
  }
}

const toParams = ({ bucket, encryption }) => {
  return _.extend({
    Bucket: bucket,
    ServerSideEncryptionConfiguration: {
      Rules: [
        {
          ApplyServerSideEncryptionByDefault: _.omit(encryption, ['ContentMD5'])
        }
      ]
    }
  }, _.pick(encryption, ['ContentMD5']))
}

module.exports = S3Encryption

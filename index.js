'use strict'

const FormData = require('form-data')
const https = require('https')
const yargs = require('yargs')

class SuperPlugin {
    constructor() {
        this.failedSpecs = []
        this.startTime = null
    }

    onPrepare() {
        jasmine.getEnv().addReporter({
            specDone: (res) => {
                if (res.status === 'failed') {
                    this.failedSpecs.push({
                        fullName: res.fullName,
                        failedExpectations: JSON.stringify(res.failedExpectations)
                    })
                }
            }
        })
    }

    postResults() {
        const sendPromises = []

        this.failedSpecs.forEach((failedInfo) => {
            sendPromises.push(this._sendData({
                type: 'failedSpecs',
                fullName: failedInfo.fullName,
                failedExpectations: failedInfo.failedExpectations
            }))
        })

        return Promise.all(sendPromises)
    }

    beforeLaunch() {
        this.startTime = Date.now()
    }

    afterLaunch(exitCode) {
        return this._sendData({
            type: 'execTimes',
            testName: yargs.argv.suite,
            execTime: Date.now() - this.startTime,
            exitCode: exitCode
        })
    }

    _sendData(data) {
        return new Promise((resolve) => {
            if (!this.config.googleHost) {
                throw new Error('host config parameter must be defined')
            }
            if (!this.config.googlePath) {
                throw new Error('path config parameter must be defined')
            }

            const form = new FormData()

            for (const key in data) {
                form.append(key, data[key])
            }

            const request = https.request({
              method: 'post',
              host: this.config.googleHost,
              path: this.config.googlePath,
              headers: form.getHeaders()
            })

            form.pipe(request)

            request.on('response', resolve)
        })
    }

    setConfig(config) {
        this.config = config
    }
}

module.exports = new SuperPlugin()
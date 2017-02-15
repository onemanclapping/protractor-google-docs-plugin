'use strict'

const FormData = require('form-data')
const https = require('https')
const yargs = require('yargs')
const imgur = require('imgur')

class SuperPlugin {
    constructor() {
        this.failedSpecs = []
        this.startTime = null
        this.promises = []
    }

    onPrepare() {
        jasmine.getEnv().addReporter({
            specDone: (res) => {
                if (res.status === 'failed') {
                    const failedInfo = {
                        fullName: res.fullName,
                        failedExpectations: JSON.stringify(res.failedExpectations)
                    }

                    this.promises.push(browser.takeScreenshot()
                        .then(imgur.uploadBase64)
                        .then((imgurJson) => {
                            failedInfo.screenshot = imgurJson.data.link
                        })
                        .then(() => {
                            return browser.manage().logs().get('browser')
                        })
                        .then((browserLog) => {
                            failedInfo.browserLog = JSON.stringify(browserLog)
                        })
                        .then(() => {
                            this.failedSpecs.push(failedInfo)
                        })
                        .catch(SuperPlugin.logError))
                }
            }
        })
    }

    postResults() {
        const sendPromises = []

        this.failedSpecs.forEach((failedInfo) => {
            sendPromises.push(this._sendData(Object.assign({
                type: 'failedSpecs'
            }, failedInfo)))
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

    teardown() {
        return Promise.all(this.promises)
    }

    static logError() {
        const args = Array.prototype.slice.call(arguments);
        args.unshift('SuperPlugin error')
        console.error.apply(null, args)
    }
}

module.exports = new SuperPlugin()
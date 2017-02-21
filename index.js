'use strict'

const FormData = require('form-data')
const https = require('https')
const yargs = require('yargs')
const imgur = require('imgur')

class GDocsPlugin {

    // STATIC
    //
    // Logs plugin-related errors to console.
    static logError() {
        const args = Array.prototype.slice.call(arguments)
        args.unshift('GDocsPlugin error')
        console.error.apply(null, args)
    }

    constructor() {
        this.failedSpecs = []
        this.startTime = null

        // Jasmine does not allow you to hook promises to its life cycle, causing
        // protractor to shut down before you send all your info to GDocs/Imgur.
        // By keeping track of all created promises we can hook them to protractor's
        // teardown callback.
        this.promises = []
    }

    // PRIVATE
    // Translates an object to form-like data for Google Spreadsheet.
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

    // This callback is not part of ProtractorPlugin API yet (https://github.com/angular/protractor/issues/4007).
    // Therefore it must be manually called on protractorConf.afterLaunch
    // 
    // Calculates the time it took for the whole test suite and sends the result to GDocs.
    afterLaunch(exitCode) {
        return this._sendData({
            type: 'execTimes',
            testName: yargs.argv.suite,
            execTime: Date.now() - this.startTime,
            exitCode: exitCode
        })
    }

    // This callback is not part of ProtractorPlugin API yet (https://github.com/angular/protractor/issues/4007).
    // Therefore it must be manually called on protractorConf.beforeLaunch
    // 
    // Sets the time for the beginning of the test suite.
    beforeLaunch() {
        this.startTime = Date.now()
    }

    // Register all failed tests info:
    // - fullName (spec name)
    // - failedExpectations
    // - screenshot (the imgur link to the uploaded image)
    // - browserLog (the current log of the browser)
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
                        .catch(GDocsPlugin.logError))
                }
            }
        })
    }

    // Sends all failed specs-related data to GDocs.
    postResults() {
        const sendPromises = []

        this.failedSpecs.forEach((failedInfo) => {
            sendPromises.push(this._sendData(Object.assign({
                type: 'failedSpecs'
            }, failedInfo)))
        })

        return Promise.all(sendPromises)
    }

    // Set the needed config for GDocs
    // config.googleHost - e.g. 'script.google.com'
    // config.googlePath - e.g. '/macros/s/123randomNumber456/exec'
    setConfig(config) {
        this.config = config
    }

    // Waits for all screenshots to be uploaded.
    teardown() {
        return Promise.all(this.promises)
    }
}

module.exports = new GDocsPlugin()
# Protractor Google Docs Plugin (Jasmine only)
Sends info about failed specs to a Google Spreadsheet.

## Why should I use this
Because looking at your pipeline logs to find what the hell is happening with your failed specs is just damn awful.

By using this protractor plugin you can get a Google Spreadsheet with more detailed info about what's happening with your failed protractor specs.

Right now, we can annotate:

- For failed each spec
  - spec name
  - failed expectations
  - screenshot (hosted at imgur)
  - browser log

- For each test suite
  - suite name
  - execution time
  - exit code

## How to use
More info soon.

```js
exports.config = {
	plugins: [{
		package: 'protractor-google-docs-plugin',
		googleHost: {String},
		googlePath: {String}
	}]
}
```

## Contribute
Please! PRs are much welcome.
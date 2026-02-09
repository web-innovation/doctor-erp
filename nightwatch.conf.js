module.exports = {
  src_folders: ['tests/e2e'],
  output_folder: 'tests/reports',
  
  webdriver: {
    start_process: true,
    server_path: require('chromedriver').path,
    port: 9515,
  },

  test_settings: {
    default: {
      desiredCapabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': {
          args: [
            '--start-maximized',
            '--disable-infobars',
            '--disable-extensions',
            '--disable-gpu',
            '--no-sandbox',
          ],
        },
      },
      screenshots: {
        enabled: true,
        path: 'tests/screenshots',
        on_failure: true,
        on_error: true,
      },
      globals: {
        waitForConditionTimeout: 10000,
        retryAssertionTimeout: 5000,
      },
    },
    
    // Slow mode for recording - adds pauses between actions
    demo: {
      desiredCapabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': {
          args: [
            '--start-maximized',
            '--disable-infobars',
            '--disable-extensions',
            '--disable-gpu',
            '--no-sandbox',
          ],
        },
      },
      globals: {
        waitForConditionTimeout: 10000,
        retryAssertionTimeout: 5000,
        // Slower pace for demo recording
        actionDelay: 1500,
      },
    },
  },
};

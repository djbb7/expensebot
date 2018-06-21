# ExpenseBot

ExpenseBot is a telegram bot which receives messages containing your expenses and stores them in a Google Sheets spreadsheet. The bot is programmed with the Serverless framework and is currently configured to run on AWS.

## Requirements

1. Generate Telegram Bot Token (https://core.telegram.org/bots#3-how-do-i-create-a-bot)
2. Obtain Google Sheets credentials and token (https://developers.google.com/sheets/api/quickstart/nodejs)
3. Create a Google Sheet and copy the ID which is displayed in the URL (http://sheets.google.com/)
4. Store all values in AWS Systems Manager - Parameter Store (https://eu-central-1.console.aws.amazon.com/systems-manager/parameters/?region=eu-central-1)

## Installation

1. Install Serverless Framework (https://serverless.com/)
2. Configure AWS credentials (https://serverless.com/framework/docs/providers/aws/guide/credentials/)
3. Run `sls deploy` and copy the function URL. If you change function code only, you can run `sls deploy -f hello` as it is faster.
4. Register this URL as the webhook of your telegram bot. Make a `POST` request to `https://api.telegram.org/<bot secret token>/setWebhook` with body field `url` set to your lambda URL.

## Usage

The bot takes messages in the format `amount description`. For example: `9.90 lunch in office cafeteria` or `8 beer with friends`. All the expenses get written into your spreadsheet into a sheet which represents the month of the expense (e.g., June 2018).

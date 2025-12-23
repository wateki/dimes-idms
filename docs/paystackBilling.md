Subscriptions
In a nutshell
The Subscriptions API lets developers embed recurring billing functionality in their applications, without having to manage the billing cycle themselves. Merchants can easily create plans and charge customers automatically, on a recurring basis. We support Card and Direct Debit (Nigeria) only.

Here is how to set up a subscription:

Create a plan
Create a subscription
Listen for subscription events
Create a plan
Plans are the foundational building block for subscriptions. A plan represents what you're selling, how much you're selling it for, and how often you're charging for it.

You can create a plan via the Paystack Dashboard, or by calling the create planAPI endpoint, passing:

Param	Type	Description
name	string	The name of the plan
interval	string	The interval at which to charge subscriptions on this plan. Available options are hourly, daily, weekly, monthly, quarterly, biannually (every 6 months) and annually
amount	integer	The amount to charge

cURL


curl https://api.paystack.co/plan
-H "Authorization: Bearer YOUR_SECRET_KEY"
-H "Content-Type: application/json"
-d '{ "name": "Monthly Retainer", 
      "interval": "monthly", 
      "amount": 500000
    }'
-X POST

response:

{
  "status": true,
  "message": "Plan created",
  "data": {
    "name": "Monthly Retainer",
    "interval": "monthly",
    "amount": 500000,
    "integration": 428626,
    "domain": "test",
    "currency": "KES",
    "plan_code": "PLN_u4cqud8vabi89hx",
    "invoice_limit": 0,
    "send_invoices": true,
    "send_sms": true,
    "hosted_page": false,
    "migrate": false,
    "id": 49122,
    "createdAt": "2020-05-22T12:36:12.333Z",
    "updatedAt": "2020-05-22T12:36:12.333Z"
  }
}


Monthly Subscription Billing
Billing for subscriptions with a monthly interval depends on the day of the month the subscription was created. If the subscription was created on or before the 28th of the month, it gets billed on the same day, every month, for the duration of the plan. Subscriptions created on or between the 29th - 31st, will get billed on the 28th of every subsequent month, for the duration of the plan

You can also pass invoice_limit, which lets you set how many times a customer can be charged on this plan. So if you set invoice_limit: 5 on a monthly plan, then the customer will be charged every month, for 5 months. If you don't pass invoice_limit, we'll continue to charge the customer until the plan is cancelled.

Create a subscription
Now that we have a plan, we can move on to the next step: subscribing a customer to that plan. There are a couple of ways we can go about creating a new subscription.

Adding Plan code to a transaction
Using the create subscriptionAPI endpoint
Adding plan code to a transaction
You can create a subscription for a customer using the initialize transactionAPI endpoint, by adding the plan_code of a plan you've created to the body of your request. This will override the transaction amount passed, and charge the customer the amount of the plan instead.

Once the customer pays, they'll automatically be subscribed to the plan, and will be billed according to the interval (and invoice limit) set on the plan.


cURL
Show Response

curl https://api.paystack.co/transaction/initialize
-H "Authorization: Bearer YOUR_SECRET_KEY"
-H "Content-Type: application/json"
-d '{ "email": "customer@email.com", 
      "amount": "500000", 
      "plan": "PLN_xxxxxxxxxx" 
    }'
-X POST

Response:

{
  "status": true,
  "message": "Authorization URL created",
  "data": {
    "authorization_url": "https://checkout.paystack.com/nkdks46nymizns7",
    "access_code": "nkdks46nymizns7",
    "reference": "nms6uvr1pl"
  }
}


Using the create subscription endpoint
You can also create a subscription by calling the create subscriptionAPI endpoint, passing a customer and plan. The customer must have already done a transaction on your Paystack integration. This is because the Subscriptions API uses card and direct debit authorizations to charge customers, so there needs to be an existing authorization to charge.

Note
If a customer has multiple authorizations, you can select which one to use for the subscription, by passing the authorization_code as authorization when creating the subscription. Otherwise, Paystack picks the most recent authorization to charge.


cURL
Show Response

curl https://api.paystack.co/subscription
-H "Authorization: Bearer YOUR_SECRET_KEY"
-H "Content-Type: application/json"
-d '{ "customer": "CUS_xxxxxxxxxx", "plan": "PLN_xxxxxxxxxx" }'
-X POST

response:

{
  "status": true,
  "message": "Subscription successfully created",
  "data": {
    "customer": 24259516,
    "plan": 49122,
    "integration": 428626,
    "domain": "test",
    "start": 1590152172,
    "status": "active",
    "quantity": 1,
    "amount": 500000,
    "authorization": {
      "authorization_code": "AUTH_pmx3mgawyd",
      "bin": "408408",
      "last4": "4081",
      "exp_month": "12",
      "exp_year": "2020",
      "channel": "card",
      "card_type": "visa DEBIT",
      "bank": "Test Bank",
      "country_code": "NG",
      "brand": "visa",
      "reusable": true,
      "signature": "SIG_2Gvc6pNuzJmj4TCchXfp",
      "account_name": null
    },
    "invoice_limit": 0,
    "subscription_code": "SUB_i6wmhzi0lu95oz7",
    "email_token": "n27dvho4kjsf1sq",
    "id": 161872,
    "createdAt": "2020-05-22T12:56:12.514Z",
    "updatedAt": "2020-05-22T12:56:12.514Z",
    "cron_expression": "0 0 22 * *",
    "next_payment_date": "2020-06-22T00:00:00.000Z"
  }
}

You can also pass a start_date parameter, which lets you set the date for the first debit. This makes this method useful for situations where you'd like to give a customer a free period before you start charging them, or when you want to switch a customer to a different plan.

Subscriptions are not retried
If a subscription charge fails, we do not retry it. Subscriptions are ideal for situations where value is delivered after payment. e.g. Payment for internet service or a streaming service.

Listen for subscription events
Creating a subscription will result in Paystack sending the following events:

A subscription.create event is sent to indicate that a subscription was created for the customer who was charged.
If you created the subscription by adding a plan code to a transaction, a charge.success event is also sent to indicate that the transaction was successful.
The following steps will happen for each subsequent billing cycle:

An invoice.create event will be sent to indicate a charge attempt will be made on the subscription. This will be sent 3 days before the next payment date.
On the next payment date, a charge.success event will be sent, if the charge attempt was successful. If not, an invoice.payment_failed event will be sent instead.
An invoice.update event will be sent after the charge attempt. This will contain the final status of the invoice for this subscription payment, as well as information on the charge if it was successful
Cancelling a subscription will also trigger events:

A subscription.not_renew event will be sent to indicate that the subscription will not renew on the next payment date.
On the next payment date, a subscription.disable event will be sent to indicate that the subscription has been cancelled.
On completion of all billing cycles for a subscription, a final subscription.disable event will be sent, with status set to complete.

Invoice Created
{
  "event": "invoice.create",
  "data": {
    "domain": "test",
    "invoice_code": "INV_thy2vkmirn2urwv",
    "amount": 50000,
    "period_start": "2018-12-20T15:00:00.000Z",
    "period_end": "2018-12-19T23:59:59.000Z",
    "status": "success",
    "paid": true,
    "paid_at": "2018-12-20T15:00:06.000Z",
    "description": null,
    "authorization": {
      "authorization_code": "AUTH_9246d0h9kl",
      "bin": "408408",
      "last4": "4081",
      "exp_month": "12",
      "exp_year": "2020",
      "channel": "card",
      "card_type": "visa DEBIT",
      "bank": "Test Bank",
      "country_code": "NG",
      "brand": "visa",
      "reusable": true,
      "signature": "SIG_iCw3p0rsG7LUiQwlsR3t",
      "account_name": "BoJack Horseman"
    },
    "subscription": {
      "status": "active",
      "subscription_code": "SUB_fq7dbe8tju0i1v8",
      "email_token": "3a1h7bcu8zxhm8k",
      "amount": 50000,
      "cron_expression": "0 * * * *",
      "next_payment_date": "2018-12-20T00:00:00.000Z",
      "open_invoice": null
    },
    "customer": {
      "id": 46,
      "first_name": "Asample",
      "last_name": "Personpaying",
      "email": "asam@ple.com",
      "customer_code": "CUS_00w4ath3e2ukno4",
      "phone": "",
      "metadata": null,
      "risk_action": "default"
    },
    "transaction": {
      "reference": "9cfbae6e-bbf3-5b41-8aef-d72c1a17650g",
      "status": "success",
      "amount": 50000,
      "currency": "NGN"
    },
    "created_at": "2018-12-20T15:00:02.000Z"
  }
}

invoice failed:

{
  "event": "invoice.payment_failed",
  "data": {
    "domain": "test",
    "invoice_code": "INV_3kfmqw48ca7b48k",
    "amount": 10000,
    "period_start": "2019-03-25T14:00:00.000Z",
    "period_end": "2019-03-24T23:59:59.000Z",
    "status": "pending",
    "paid": false,
    "paid_at": null,
    "description": null,
    "authorization": {
      "authorization_code": "AUTH_fmmpvpvphp",
      "bin": "506066",
      "last4": "6666",
      "exp_month": "03",
      "exp_year": "2033",
      "channel": "card",
      "card_type": "verve ",
      "bank": "TEST BANK",
      "country_code": "NG",
      "brand": "verve",
      "reusable": true,
      "signature": "SIG_bx0C6uIiqFHnoGOxTDWr",
      "account_name": "BoJack Horseman"
    },
    "subscription": {
      "status": "active",
      "subscription_code": "SUB_f7ct8g01mtcjf78",
      "email_token": "gptk4apuohyyjsg",
      "amount": 10000,
      "cron_expression": "0 * * * *",
      "next_payment_date": "2019-03-25T00:00:00.000Z",
      "open_invoice": "INV_3kfmqw48ca7b48k"
    },
    "customer": {
      "id": 6910995,
      "first_name": null,
      "last_name": null,
      "email": "xxx@gmail.com",
      "customer_code": "CUS_3p3ylxyf07605kx",
      "phone": null,
      "metadata": null,
      "risk_action": "default"
    },
    "transaction": {},
    "created_at": "2019-03-25T14:00:03.000Z"
  }
}

invoice updated

{
  "event": "invoice.update",
  "data": {
    "domain": "test",
    "invoice_code": "INV_kmhuaaur5c9ruh2",
    "amount": 50000,
    "period_start": "2016-04-19T07:00:00.000Z",
    "period_end": "2016-05-19T07:00:00.000Z",
    "status": "success",
    "paid": true,
    "paid_at": "2016-04-19T06:00:09.000Z",
    "description": null,
    "authorization": {
      "authorization_code": "AUTH_jhbldlt1",
      "bin": "539923",
      "last4": "2071",
      "exp_month": "10",
      "exp_year": "2017",
      "card_type": "MASTERCARD DEBIT",
      "bank": "FIRST BANK OF NIGERIA PLC",
      "country_code": "NG",
      "brand": "MASTERCARD",
      "account_name": "BoJack Horseman"
    },
    "subscription": {
      "status": "active",
      "subscription_code": "SUB_l07i1s6s39nmytr",
      "amount": 50000,
      "cron_expression": "0 0 19 * *",
      "next_payment_date": "2016-05-19T07:00:00.000Z",
      "open_invoice": null
    },
    "customer": {
      "first_name": "BoJack",
      "last_name": "Horseman",
      "email": "bojack@horsinaround.com",
      "customer_code": "CUS_xnxdt6s1zg1f4nx",
      "phone": "",
      "metadata": {},
      "risk_action": "default"
    },
    "transaction": {
      "reference": "rdtmivs7zf",
      "status": "success",
      "amount": 50000,
      "currency": "NGN"
    },
    "created_at": "2016-04-16T13:45:03.000Z"
  }
}

subscription created

{
  "event": "subscription.create",
  "data": {
    "domain": "test",
    "status": "active",
    "subscription_code": "SUB_vsyqdmlzble3uii",
    "amount": 50000,
    "cron_expression": "0 0 28 * *",
    "next_payment_date": "2016-05-19T07:00:00.000Z",
    "open_invoice": null,
    "createdAt": "2016-03-20T00:23:24.000Z",
    "plan": {
      "name": "Monthly retainer",
      "plan_code": "PLN_gx2wn530m0i3w3m",
      "description": null,
      "amount": 50000,
      "interval": "monthly",
      "send_invoices": true,
      "send_sms": true,
      "currency": "NGN"
    },
    "authorization": {
      "authorization_code": "AUTH_96xphygz",
      "bin": "539983",
      "last4": "7357",
      "exp_month": "10",
      "exp_year": "2017",
      "card_type": "MASTERCARD DEBIT",
      "bank": "GTBANK",
      "country_code": "NG",
      "brand": "MASTERCARD",
      "account_name": "BoJack Horseman"
    },
    "customer": {
      "first_name": "BoJack",
      "last_name": "Horseman",
      "email": "bojack@horsinaround.com",
      "customer_code": "CUS_xnxdt6s1zg1f4nx",
      "phone": "",
      "metadata": {},
      "risk_action": "default"
    },
    "created_at": "2016-10-01T10:59:59.000Z"
  }
}

subscription disabled:
{
  "event": "subscription.disable",
  "data": {
    "domain": "test",
    "status": "complete",
    "subscription_code": "SUB_vsyqdmlzble3uii",
    "email_token": "ctt824k16n34u69",
    "amount": 300000,
    "cron_expression": "0 * * * *",
    "next_payment_date": "2020-11-26T15:00:00.000Z",
    "open_invoice": null,
    "plan": {
      "id": 67572,
      "name": "Monthly retainer",
      "plan_code": "PLN_gx2wn530m0i3w3m",
      "description": null,
      "amount": 50000,
      "interval": "monthly",
      "send_invoices": true,
      "send_sms": true,
      "currency": "NGN"
    },
    "authorization": {
      "authorization_code": "AUTH_96xphygz",
      "bin": "539983",
      "last4": "7357",
      "exp_month": "10",
      "exp_year": "2017",
      "card_type": "MASTERCARD DEBIT",
      "bank": "GTBANK",
      "country_code": "NG",
      "brand": "MASTERCARD",
      "account_name": "BoJack Horseman"
    },
    "customer": {
      "first_name": "BoJack",
      "last_name": "Horseman",
      "email": "bojack@horsinaround.com",
      "customer_code": "CUS_xnxdt6s1zg1f4nx",
      "phone": "",
      "metadata": {},
      "risk_action": "default"
    },
    "created_at": "2020-11-26T14:45:06.000Z"
  }
}

subscription not renewing:

{
  "event": "subscription.not_renew",
  "data": {
    "id": 317617,
    "domain": "test",
    "status": "non-renewing",
    "subscription_code": "SUB_d638sdiWAio7jnl",
    "email_token": "086x99rmqc4qhcw",
    "amount": 120000,
    "cron_expression": "0 0 8 10 *",
    "next_payment_date": null,
    "open_invoice": null,
    "integration": 116430,
    "plan": {
      "id": 103028,
      "name": "(1,200) - annually - [1 - Year]",
      "plan_code": "PLN_tlknnnzfi4w2evu",
      "description": "Subscription not_renewed for sub@notrenew.com",
      "amount": 120000,
      "interval": "annually",
      "send_invoices": true,
      "send_sms": true,
      "currency": "NGN"
    },
    "authorization": {
      "authorization_code": "AUTH_5ftfl9xrl0",
      "bin": "424242",
      "last4": "4081",
      "exp_month": "06",
      "exp_year": "2023",
      "channel": "card",
      "card_type": "mastercard debit",
      "bank": "Guaranty Trust Bank",
      "country_code": "NG",
      "brand": "mastercard",
      "reusable": true,
      "signature": "SIG_biPYZE4PgDCQUJMIT4sE",
      "account_name": null
    },
    "customer": {
      "id": 57199167,
      "first_name": null,
      "last_name": null,
      "email": "sub@notrenew.com",
      "customer_code": "CUS_8gbmdpvn12c67ix",
      "phone": null,
      "metadata": null,
      "risk_action": "default",
      "international_format_phone": null
    },
    "invoices": [],
    "invoices_history": [],
    "invoice_limit": 0,
    "split_code": null,
    "most_recent_invoice": null,
    "created_at": "2021-10-08T14:50:39.000Z"
  }
}

transaction successful:

{
  "event": "charge.success",
  "data": {
    "id": 302961,
    "domain": "live",
    "status": "success",
    "reference": "qTPrJoy9Bx",
    "amount": 10000,
    "message": null,
    "gateway_response": "Approved by Financial Institution",
    "paid_at": "2016-09-30T21:10:19.000Z",
    "created_at": "2016-09-30T21:09:56.000Z",
    "channel": "card",
    "currency": "KES",
    "ip_address": "41.242.49.37",
    "metadata": 0,
    "log": {
      "time_spent": 16,
      "attempts": 1,
      "authentication": "pin",
      "errors": 0,
      "success": false,
      "mobile": false,
      "input": [],
      "channel": null,
      "history": [
        {
          "type": "input",
          "message": "Filled these fields: card number, card expiry, card cvv",
          "time": 15
        },
        {
          "type": "action",
          "message": "Attempted to pay",
          "time": 15
        },
        {
          "type": "auth",
          "message": "Authentication Required: pin",
          "time": 16
        }
      ]
    },
    "fees": null,
    "customer": {
      "id": 68324,
      "first_name": "BoJack",
      "last_name": "Horseman",
      "email": "bojack@horseman.com",
      "customer_code": "CUS_qo38as2hpsgk2r0",
      "phone": null,
      "metadata": null,
      "risk_action": "default"
    },
    "authorization": {
      "authorization_code": "AUTH_f5rnfq9p",
      "bin": "539999",
      "last4": "8877",
      "exp_month": "08",
      "exp_year": "2020",
      "card_type": "mastercard DEBIT",
      "bank": "Guaranty Trust Bank",
      "country_code": "NG",
      "brand": "mastercard",
      "account_name": "BoJack Horseman"
    },
    "plan": {}
  }
}
Managing subscriptions
So you've set up your plans, and you've started subscribing customers to them. In this section, we'll talk about how to manage those subscriptions, to make sure you don't miss payments, and your customers don't lose service.

Understanding subscription statuses
Subscription statuses are key to managing your subscriptions. Each status contains information about a subscription, that lets you know if you need to take action or not, to keep that customer. There are currently 5 possible statuses a subscription can have.

Status	Description
active	The subscription is currently active, and will be charged on the next payment date.
non-renewing	The subscription is currently active, but we won't be charging it on the next payment date. This occurs when a subscription is about to be complete, or has been cancelled (but we haven't reached the next payment date yet).
attention	The subscription is still active, but there was an issue while trying to charge the customer's card. The issue can be an expired card, insufficient funds, etc. We'll attempt charging the card again on the next payment date.
completed	The subscription is complete, and will no longer be charged.
cancelled	The subscription has been cancelled, and we'll no longer attempt to charge the card on the subscription.
Handling subscription payment issues
As mentioned in the previous section, if a subscription's status is attention, then it means that there was a problem with trying to charge the customer's card, and we were unable to successfully debit them.

To fix the issue, you can take a look at the most_recent_invoice object returned in the body of the fetch subscriptionAPI response. This object contains information about the most recent attempt to charge the card on the subscription. If the subscription's status is attention, then the most_recent_invoice object will have a status field set to failed, and a description field, with more information about what went wrong when attempting to charge the card.

{  

  "data": {  

    "most_recent_invoice": {
      "subscription": 326005,
      "integration": 530700,
      "domain": "test",
      "invoice_code": "INV_fjtns483x9c2fyw",
      "customer": 92740135,
      "transaction": 1430031421,
      "amount": 50000,
      "period_start": "2021-11-10T13:00:00.000Z",
      "period_end": "2021-11-10T13:59:59.000Z",
      "status": "attention",
      "paid": 1,
      "retries": 1,
      "authorization": 242063633,
      "paid_at": "2021-11-10T13:00:09.000Z",
      "next_notification": "2021-11-07T13:59:59.000Z",
      "notification_flag": null,
      "description": "Insufficient Funds",
      "id": 3953926,
      "created_at": "2021-11-10T13:00:05.000Z",
      "updated_at": "2021-11-10T13:00:10.000Z"
      }

  }  
}
At the beginning of each month, we'll also send a subscription.expiring_cards webhook, which contains information about all subscriptions with cards that expire that month. You can use this to proactively reach out to your customers, and have them update the card on their subscription.

{
  "event":"subscription.expiring_cards",
  "data":[
    {
      "expiry_date":"12/2021",
      "description":"visa ending with 4081",
      "brand":"visa",
      "subscription":{
        "id":94729,
        "subscription_code":"SUB_lejj927x2kxciw1",
        "amount":44000,
        "next_payment_date":"2021-11-11T00:00:01.000Z",
        "plan":{
          "interval":"monthly",
          "id":22637,
          "name":"Premium Service (Monthly)",
          "plan_code":"PLN_pfmwz75o021slex"
        }
      },
      "customer":{
        "id":7808239,
        "first_name":"Bojack",
        "last_name":"Horseman",
        "email":"bojackhoresman@gmail.com",
        "customer_code":"CUS_8v6g420rc16spqw"
      }
    }
  ]
}
Updating subscriptions
To make changes to a subscription, you’ll use the Update PlanAPI endpoint. You should consider whether you want to change existing subscriptions or keep them as they are. For example, if you’re updating the price, or the charge intervals. You’ll use the update_existing_subscriptions parameter to control this:

When set to true : All subscriptions will be updated, and the changes will apply on the next billing cycle.
When set to false: Current subscriptions will stay the same, and only new ones will follow the updates.
If you omit this parameter, the updates will automatically apply to all subscriptions.

Updating the card on a subscription
When a customer's subscription has a card or bank with a payment issue, you can generate a link to a hosted subscription management page, where they can update their authorization. On the page, your customer will have the option to either add a new card, a direct debit account, or cancel their subscription. If they choose to add a new card, Paystack will charge the card a small amount to tokenize it. Don't worry, the charge is immediately refunded.


cURL
Show Response

curl https://api.paystack.co/subscription/:code/manage/link
-H "Authorization: Bearer YOUR_SECRET_KEY"
-X GET

response:

{
  "status": true,
  "message": "Link generated",
  "data": {
    "link": "https://paystack.com/manage/subscriptions/qlgwhpyq1ts9nsw?subscription_token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWJzY3JpcHRpb25fY29kZSI6IlNVQl9xbGd3aHB5cTB0czluc3ciLCJpbnRlZ3JhdGlvbiI6MzUzNTE0LCJkb21haW4iOiJ0ZXN0IiwiZW1haWxfdG9rZW4iOiJzNXIwZjA0ODdwcnNtZWsiLCJpYXQiOjE2MzUyNTkxMzEsIm5iZiI6MTYzNTI1OTEzcjeR82XhwIjoxNjM1MzQ1NTMxfQ.FK1glvwMjHu9J8P-4n2oXPN_u_fIpQZ-F_s5x_4WLag"
  }
}


If you already have a page where your subscribers can manage their subscriptions, you can choose to have a button or link on that page that will generate the link and redirect the customer to the subscription management page.

Alternatively, you can trigger an email from Paystack to the customer, with the link included.


cURL
Show Response

curl https://api.paystack.co/subscription/:code/manage/email
-H "Authorization: Bearer YOUR_SECRET_KEY"
-X POST

{
  "status": true,
  "message": "Email successfully sent"
}
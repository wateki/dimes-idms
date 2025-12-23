Recurring Charges
In a nutshell
Once a customer has made the first successful payment with their card or direct debit account, you can store the customer's authorization and use it for subsequent transactions. This currently works for cards in all our markets, and direct debit for businesses in Nigeria.

Charge the first transaction
Note
This step is not needed for Direct Debit charges. Instead, you’ll intitiate an authorization request via the Initialize AuthorizationAPI endpoint. You'll save the authorization returned via webhooks, once the customer approves it.

You can initialize this first charge from web or your mobile app. Check out the different integration methods for web and mobile.

Why do I need to charge the user to add their cards?
Local regulations require that users authenticate the card through 2FA in an initial transaction before we can charge the card subsequently.
It allows us to ensure that the card is valid and can be charged for subsequent transactions.
Minimum charge amount
The minimum amount recommended for the first charge is NGN 50.00, GHS 0.10, ZAR 1.00, KES 3.00, or USD 2.00. Lower amounts aren't guaranteed to work on all card brands or banks.

It is standard practice to credit the user back with value (in your app) worth the tokenization amount, or simply refund the money back.

Get the Card authorization
If the first transaction is successful, you can listen to events on your webhook endpoint. Alternatively, you can use the Verify TransactionAPI endpoint to confirm the status of the transaction. In either case, the response looks like the sample below:

JSON
{
  "data": {
    "authorization": {
      "authorization_code": "AUTH_8dfhjjdt",
      "card_type": "visa",
      "last4": "1381",
      "exp_month": "08",
      "exp_year": "2018",
      "bin": "412345",
      "bank": "TEST BANK",
      "channel": "card",
      "signature": "SIG_idyuhgd87dUYSHO92D",
      "reusable": true,
      "country_code": "NG",
      "account_name": "BoJack Horseman"
    }
  }
}
You'll notice that the data object in the response contains an authorization object within it, which contains the details of the payment instrument (card in this case) that the user paid with.

Property	Description
authorization_code	This is the code that is used to charge the card subsequently
card_type	This tells you the card brand - Visa, Mastercard, etc
last4	The last 4 digits of the card. This is one of the details you can use to help the user identify the card
exp_month	The expiry month of the card in digits. Eg. "01" means January
exp_year	The expiry year of the card
bin	The first 6 digits of the card. This and the last 4 digits constitute the masked pan
bank	The customer's bank, the bank that issued the card
channel	What payment channel this is. In this case, it is a card payment
signature	A unique identifier for the card being used. While new authorization codes are created each time a card is used, the card's signature will remain the same.
reusable	A boolean flag that tells you if an authorization can be used for a recurring charge. You should only attempt to use the authorization_code if this flag returns as true.
country_code	A two-letter country code (ISO 3166-1 alpha-2) representing the country of the bank where the card was issued
Store the authorization
Next, you need to store the authorization and the email used for the transaction. These details can be used to charge the card subsequently. Every payment instrument that is used on your site/app has a unique signature . The signature can be used to ensure that you do not save an authorization multiple times.

Note
It is important to store the entire authorization object in order not to lose any context regarding the card.

It is also important to store the email used to create an authorization because only the email used to create an authorization can be used to charge it. If you rely on the user's email stored on your system and the user changes it, the authorization can no longer be charged.

When you have the whole authorization object saved, you can display customer payment details at the point of payment to charge recurrently. For example, when the user wants to pay again, you can display the card for the user as Access Bank Visa card ending with 1234.

Charge the authorization
When the user selects the card or direct debit account for a new transaction or when you want to charge them subsequently, you send the authorization_code, user's email and the amount you want to charge to the charge authorizationAPI.


cURL
Show Response

curl https://api.paystack.co/transaction/charge_authorization
-H "Authorization: Bearer YOUR_SECRET_KEY"
-H "Content-Type: application/json"
-d '{ "authorization_code" : "AUTH_pmx3mgawyd", 
      email: "mail@mail.com", 
      amount: "300000" 
    }'
-X POST
Charging at intervals
If your application needs to charge the authorizations at certain intervals, it means your server needs to have a cron job that runs at particular intervals and picks all the authorizations that needs to be charged.

Two Factor Authentication
Feature Availability
By default, this feature is available to betting merchants with a Nigerian integration and specific to cards issued by Guaranty Trust Bank (GTB), Access Bank, United Bank for Africa (UBA), Zenith Bank & First Bank of Nigeria. If you have a Nigerian integration and would like to get this feature, kindly send an email to support@paystack.com

Two Factor Authentication (2FA) is an extra security step taken to confirm that you aren’t processing the request of a malicious actor. The user making the request is generally asked to provide some form of information that is unique to them.

In order to ensure a user’s card isn’t being used by a malicious actor, we challenge the user by asking the user to authorize the transaction. Authorization can be done by using a hardware token, OTP, PIN + OTP, or 3DS.

The request to charge the card remains the same. However, the response is different for cards that will be challenged:

JSON
{
  "status": true,
  "message": "Please, redirect your customer to the authorization url provided",
  "data": {
    "authorization_url": "https://checkout.paystack.com/resume/0744ub5o065nwyz",
    "reference": "jvx2o36ghlvrgtt",
    "access_code": "0744ub5o065nwyz",
    "paused": true
  }
}
When a card is challenged, the response will contain two distinct parameters among others:

Parameter	Type	Description
paused	boolean	Returns true when a card is being challenged
authorization_url	string	A checkout URL for authorization of the transaction
You should check the value of the data.paused parameter to confirm if a card is being challenged. If it’s being challenged, you should redirect the user to the data.authorization_url to complete the authorization.

Image of the checkout page for user authorization
On completion of the authorization, we proceed to charge the user's card. You should save the data.reference value to verify the status of the transaction either via webhooks or the verify transactionAPI.

Handling redirect
When the user completes the authorization process, we typically redirect the user back to the callback URL you’ve set on your Paystack Dashboard. If you want us to redirect to a different URL, you can add the URL to the callback_url parameter of your request:

JSON
{
  "authorization_code": "AUTH_ibegucp8kk",
  "email": "dami@2fa.com",
  "amount": 3000,
  "callback_url": "https://yourcallbackurl.com"
}
The user might also cancel the authorization process. You can add a URL that the user should be redirected to when they cancel in the metadata object:

JSON
{
  "authorization_code": "AUTH_ibegucp8kk",
  "email": "dami@2fa.com",
  "amount": 3000,
  "metadata": {
    "cancel_action": "https://yourcancelurl.com"
  }
}
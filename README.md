#Prerequisites 
* AWS CLI (to configure credentials) - <https://aws.amazon.com/cli/>
* AWS credentials - will need to ask someone to generate them for you
##Configuring AWS CLI
* After Installing cli run the folowing:
```
	aws configure
```
*for reference: http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html
*you will be asked to enter the credentials mentioned above 

```
AWS Access Key ID [********************]: 
AWS Secret Access Key [*******************]: 
Default region name []: 
Default output format []: 
```


#Setup

##Backend Resources
### User Pool
*To create a user pool in the krnl backend with a password minimum length of 8 and  email varificiation, run the following command on the command line: 

```
aws cognito-idp create-user-pool --pool-name <your user pool name> --policies PasswordPolicy={MinimumLength=8} --auto-verified-attributes email --policies '{"PasswordPolicy":{"MinimumLength":8,"RequireUppercase":false,"RequireLowercase":false,"RequireNumbers":false,"RequireSymbols":false}}' --email-verification-subject "<your email varification title string>" --email-verification-message "<Your email varification body, must include {####} in it for the code to be embadded into the email>"
```

*command will output some JSON useful config data (userpoolId specifically) to be used in your code (see below)

*for reference: http://docs.aws.amazon.com/cli/latest/reference/cognito-idp/create-user-pool.html

**Example Verification email body: "Welcome to Sweet Meeting! Use this code to verify your account. Your confirmation code is {####}"

### Identity Pool
* Create an identity pool for your users in the krnl backend, run the following command.

```
aws cognito-identity create-identity-pool --identity-pool-name <place name here> --allow-unauthenticated-identities
```

*command will output json that will be usfule for confugring yur cognitoClient (IdentityPoolId specifically)

### Identity Role Arn
* This is to map a role to the identityies managed by the user pool and identity pool. This could be used to allow or deny users to make aws api calls, but we just need it to configure our cognitoClient

* put the follwoing json into a file called policy.json after filling in the identity pool id you got fromt the command above
```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "cognito-identity.amazonaws.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "cognito-identity.amazonaws.com:aud": "<identityPoolId>"
        },
        "ForAnyValue:StringLike": {
          "cognito-identity.amazonaws.com:amr": "unauthenticated"
        }
      }
    }
  ]
}
```
* run the command 
```
aws iam create-role --role-name <nameOfRole> --assume-role-policy file://policy.json
```
*command will output  json object with the field "Arn" in it, save it for the cognitoClient config

### App client ID, for each app (browser, Android, iOS, etc) you need a client ID in order to connect to the user pool, since we are creating a web app we do not want to generate an app secret

*run the command 

```
aws cognito-idp create-user-pool-client --user-pool-id <your userPool id from above> --client-name <choose client name> --no-generate-secret
```
* the command should output json object with the field "UserPoolId" which you should save for configuring the cognitoClient

##Frontend

###Please add the following lines to your html 
```
	<script src="/<PATH_TO>/krnl_cognito/cognito-js-sdk/lib/jsbn.js"></script>
	<script src="/<PATH_TO>/krnl_cognito/cognito-js-sdk/lib/jsbn2.js"></script>
	<script src="/<PATH_TO>/krnl_cognito/cognito-js-sdk/lib/sjcl.js"></script> 
	<script src="/<PATH_TO>/krnl_cognito/cognito-js-sdk/lib/moment.js"></script> 
	<script src="/<PATH_TO>/krnl_cognito/cognito-js-sdk/lib/aws-cognito-sdk.min.js"></script>
	<script src="/<PATH_TO>/krnl_cognito/cognito-js-sdk/lib/amazon-cognito-identity.min.js"></script>
	<script src="/<PATH_TO>/krnl_cognito/cognito-js-sdk/lib/aws-sdk.min.js"></script>
	<script src="/<PATH_TO>/krnl_cognito/cognito-js-sdk/cognitoClient.js"></script>
```

###Using the SDK in your project 

*To initialize the most basic form of the SDK:

```
var cognitoClient = cognitoClientFactory.newClient(config);
```

### configuring the cognitoClient
* the cognitoClient needs 5 fields in order to instantiate correctly
** aws region: you should moust liek be using us-west-2
** userPoolId: retrieved during setup stage 
** identityPoolId: retrieved during setup stage
** roleArn: retrieved during setup stage
** userPoolData.clientId (userPool takes a JS object userPoolData with the field clientId.): retrieved during setup stage 
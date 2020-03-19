var cognitoClientFactory = {};

cognitoClientFactory.newClient = function(config){
	var cognitoClient = {};

	/*configure cognito client*/
	if(config === undefined) {
        config =  {
    		awsRegion : 'us-west-2',
    		userPoolId: '',
    		identityPoolId: '',
    		roleArn: '',
    		userPoolData: {
      			clientId: ''
   			}
  		};
    }

    if(config.awsRegion === undefined) {
        config.awsRegion = 'us-west-2';
    }
    if(config.userPoolId === undefined) {
        config.userPoolId = '';
    }
    if(config.identityPoolId === undefined) {
        config.identityPoolId = '';
    }
    if(config.roleArn === undefined) {
        config.roleArn = '';
    }
    if(config.userPoolData === undefined) {
        config.userPoolData = {
        	clientId : ''
        };
    }
    if(config.userPoolData.clientId === undefined) {
    	config.userPoolData.clientId = '';
    }

	// AWS config using identity pool
	AWS.config.credentials  = new AWS.CognitoIdentityCredentials({
		IdentityPoolId : config.identityPoolId,
		RoleArn : config.roleArn
	});

	AWS.config.region = config.awsRegion;

	AWS.config.credentials.get(function(err){
		if (err) {
			console.log("Error getting credentials: " + err);
		} else {
			console.log("Successfully received AWS credentials");
		}
	});

	AWSCognito.config.region = config.awsRegion;
	AWSCognito.config.credentials = new AWS.CognitoIdentityCredentials({
		IdentityPoolId: config.identityPoolId,
		RoleArn : config.roleArn
	});

	var cognitoUserPoolData = {
		UserPoolId : config.userPoolId,
		ClientId : config.userPoolData.clientId
	};

	cognitoClient.cognitoUserPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(cognitoUserPoolData);



	/////////////////////////////////////////////////////
	//                  Signing Up                     //
	/////////////////////////////////////////////////////

	/*
	* Signs up a user in the user pool, if email verification is required the user will
	* have to be confrimed with userConfrim() before they areable to log in regularly
	* 
	* @param {string} username: the users username, must be an email if emailVerified == true
	* @param {string} password: users password
	* @param {bool} emailVerified: true if the userPool was configured to require email varification
	* @param {function} callback(err, result): return function upon error or success, passes return 
	*											values back to caller.
	*/
	cognitoClient.signUp = function(username, password, emailVerified, callback) {
		var authenticationData = {
			Username : username,
			Password : password
		}

		var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);

		var attributeList = [];
		if (emailVerified){
			var dataEmail = {
				Name : 'email',
				Value : username
			};
			var attributeEmail = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute(dataEmail);
			attributeList.push(attributeEmail);
		}

		// signs outs the current user if they exist, this is for caching issues
		cognitoClient.cognitoUser = cognitoClient.cognitoUserPool.getCurrentUser();
		if (cognitoClient.cognitoUser){
			cognitoClient.cognitoUser.signOut();
			cognitoClient.cognitoUser = null;
		}
		

		cognitoClient.cognitoUserPool.signUp(username, password, attributeList, null, function(err, result){
			if (err){
				return callback(err, null);
			} else {
				cognitoClient.cognitoUser = result.user;
				return callback(null, result);
			}
		})
	};

	/*
	* If the cognito user pool is configured to asked for mfa verification to create an account, 
	* use this methid to enter the verification code
	* 
	* @param {string} confirmationCode: the code sent via email to the user
	* @param {function} callback(err, result): return function upon error or success, passes return 
	*											values back to caller.
	*/
	cognitoClient.userConfirm = function(confirmationCode, callback) {
		if (!cognitoClient.cognitoUser){
			cognitoClient.cognitoUser = cognitoClient.cognitoUserPool.getCurrentUser();
			if (!cognitoClient.cognitoUser){
				var err = "CognitoUser not instantiated, please sign up first";
				return callback(err,null);
			}
		}

		cognitoClient.cognitoUser.confirmRegistration(confirmationCode, true, function(err, result){
			if (err){
				return callback(err, null);
			} else {
				return callback(null, result);
			}
		});
	};

	/*
	* Resend the confirmation code for the user
	* 
	* @param {function} callback(err, result): return function upon error or success, passes return 
	*											values back to caller.
	*/
	cognitoClient.resendConfirmationCode = function(callback) {
		cognitoClient.cognitoUser.resendConfirmationCode(function(err,result){
			if (err){
				return callback(err, null);
			} else {
				return callback(null, result);
			}
		})
	};


	/////////////////////////////////////////////////////
	//                  LOGGING IN                     //
	/////////////////////////////////////////////////////

	/*
	* Authentictes/ logs in a user identity in the backend, provides the user valid session token
	* should be used in the callback of signUp() or userConfirm() to get that valid session onSuccess
	* 
	* @param {string} username: the users username, must be an email if emailVerified == true
	* @param {string} password: users password
	* @param {function} callback(err, result): return function upon error or success, passes return 
	*											values back to caller.
	*/
	cognitoClient.authenticateUser = function(username, password, callback){
		if (!cognitoClient.cognitoUser){
			cognitoClient.cognitoUser = cognitoClient.cognitoUserPool.getCurrentUser();
			if (!cognitoClient.cognitoUser){
				var err = "CognitoUser not instantiated, please sign up first";
				return callback(err,null);
			}
		}

		var authenticationData = {
			Username : username,
			Password : password
		}

		var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);

		cognitoClient.cognitoUser.authenticateUser(authenticationDetails, {
			onSuccess: function (result) {
				cognitoClient.cognitoUser.getSession(function(err, result){
					if(err){
						return callback(err, null);
					} else {
						return callback(null, result);
					}
				})

			},
			onFailure: function(err){
				return callback(err, null);
			}
		});
	};

	/*
		Allows the user to bypass entering thier username  and password, if they have already logged in recently.
	*/

	/*
	* Allows the user to bypass entering thier username  and password, if they have already logged in recently.
	* should be called when a login page loads, without a user having to initiate it manually
	* 
	* @param {function} callback(err, result): return function upon error or success, passes return 
	*											values back to caller.
	*/
	cognitoClient.loginWithCachedCredentials = function(callback) {
		if (!cognitoClient.cognitoUser){
			cognitoClient.cognitoUser = cognitoClient.cognitoUserPool.getCurrentUser();
			if (!cognitoClient.cognitoUser){
				var err = "CognitoUser not instantiated, please sign up / login first";
				return callback(err,null);
			}
		}

		cognitoClient.cognitoUser.getSession(function(err, result){
			if(err){
				return callback(err, null);
			} else {
				return callback(null, result);
			}
		});

	};

	/*
	* Log in the user normally with username and password
	* 
	* @param {string} username: the users username, must be an email if emailVerified == true
	* @param {string} password: users password
	* @param {function} callback(err, result): return function upon error or success, passes return 
	*											values back to caller.
	*/
	cognitoClient.login = function(username, password, callback) {
		
		var authenticationData = {
			Username : username,
			Password : password
		};

		var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);

		userData = {
			Username : username,
			Pool : cognitoClient.cognitoUserPool
		};

		cognitoClient.cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);

		cognitoClient.authenticateUser(username, password, function(err, result){
			if(err){
				return callback(err, null);
			} else {
				return callback(null, result);
			}
		});
	};

	/*
	* Initates the forgot password request, sends a verification code to the user. On success the user should be
	* queried for the new verification code and new password (see resetPassword)
	* 
	* @param {string} username: the users username, must be an email if emailVerified == true
	* @param {function} callback: return function
	*									onSuccess:
	*											called on success
	*									onFailure:
	*											called on any error
	*									inputVerificationCode:
	*											called on success 
	*/
	cognitoClient.forgotPassword = function(username, callback) {
		userData = {
			Username : username,
			Pool : cognitoClient.cognitoUserPool
		};

		cognitoClient.cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);

		cognitoClient.cognitoUser.forgotPassword({
			onSuccess: function(result){
				callback.onSuccess(result);
			},
			onFailure: function(err){
				callback.onFailure(err);
			},
			inputVerificationCode: function() {
				callback.inputVerificationCode();
			}
		});
	};

	/*
	* This is used to confirm a new password using a confirmationCode
	* 
	* @param {string} verificationCode: the code sent via email to the user
	* @param {string} newPassword: the new password for the user
	* @param {function} callback(err, result): return function upon error or success, passes return 
	*											values back to caller.
	*/
	cognitoClient.resetPassword = function(verificationCode, newPassword, callback) {
		if (!cognitoClient.cognitoUser){
			cognitoClient.cognitoUser = cognitoClient.cognitoUserPool.getCurrentUser();
			if (!cognitoClient.cognitoUser){
				var err = "CognitoUser not instantiated, please sign up / login first";
				return callback(err,null);
			}
		}

		cognitoClient.cognitoUser.confirmPassword(verificationCode, newPassword,{
			onSuccess: function(){
				var result = "Successfully reset password";
				return callback(null, result);
			},
			onFailure: function(err){
				return callback(err, null);
			}
		});
	};

	/////////////////////////////////////////////////////
	//                  Log Out                        //
	/////////////////////////////////////////////////////

	/*
	* This is used for the user to signOut of the application and clear the cached tokens.
	*/
	cognitoClient.signOut = function() {
		cognitoClient.cognitoUser = cognitoClient.cognitoUserPool.getCurrentUser();
		if (!cognitoClient.cognitoUser){
			console.log("CognitoUser not instantiated, please sign up / log in first");
		} else {
			cognitoClient.cognitoUser.signOut();
			cognitoClient.cognitoUser = null;
		}
	};

	/////////////////////////////////////////////////////
	//                  Misc.                          //
	/////////////////////////////////////////////////////

	/*
	* Validates the user has valid session. Can be used to assert if a user should be on a 
	* certain page or should be renavigated a login page.
	*
	* @return: True if user has a valid session (are logged in), false otherwise.
	*/
	cognitoClient.hasValidCredentials = function() {
		if(!cognitoClient.cognitoUser){
			cognitoClient.cognitoUser = cognitoClient.cognitoUserPool.getCurrentUser();
		}
		if(!cognitoClient.cognitoUser){
			console.log("CognitoUser not instantiated, please sign up / login first");
			return false;
		} else {
			if (cognitoClient.getSignInUserSession()){
				console.log('User has valid credentials');
				return true;
			} else {
				console.log("Retrieving credentials");
				cognitoClient.cognitoUser.getSession(function(err, result){
					if (err) {
						console.log(err);
						return false;
					} else {
						console.log(result);
						return true;
					}
				});
			}
		}
	};

	/*
	*  @return: {string} the user's username, or an empty string if the user is not logged in
	*/
	cognitoClient.getUserName = function() {
		if (!cognitoClient.cognitoUser){
			cognitoClient.cognitoUser = cognitoClient.cognitoUserPool.getCurrentUser();
			if (!cognitoClient.cognitoUser){
				var err = "CognitoUser not instantiated, please sign up / login first";
				return "";
			}
		}

		return cognitoClient.cognitoUser.getUsername();
	};


	/*
	* @return: the user session for the signed in user, null if the user is not signed in
	*/
	cognitoClient.getSignInUserSession = function(){
		
		if (!cognitoClient.cognitoUser){
			cognitoClient.cognitoUser = cognitoClient.cognitoUserPool.getCurrentUser();
			if (!cognitoClient.cognitoUser){
				var err = "CognitoUser not instantiated, please sign up / login first";
				return null;
			}
		}

		return cognitoClient.cognitoUser.getSignInUserSession();
	};

	return cognitoClient;
}


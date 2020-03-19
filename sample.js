function CognitoCtrl($scope){
	// see README for instructions about configuring and setting up
	var config = {
    		awsRegion : '',
    		userPoolId: '',
    		identityPoolId: '',
    		roleArn: '',
    		userPoolData: {
      			clientId: ''
   			}
  	};
	var cognitoClient = cognitoClientFactory.newClient(config);
	$scope.loginSignupPage = true;
	$scope.loggingIn = false;
	$scope.signup = false;
	$scope.confirm = false;
	$scope.confirm = false;
	$scope.forgotPassword = false;
	$scope.homePage = false;

	$scope.goToLogin = function(){
		$scope.loginSignupPage = false;
		$scope.loggingIn = true;
		$scope.signup = false;
		$scope.confirm = false;
		$scope.confirm = false;
		$scope.forgotPassword = false;
		$scope.homePage = false;

	};
	$scope.goToSignUp = function(){
		$scope.loginSignupPage = false;
		$scope.loggingIn = false;
		$scope.signup = true;
		$scope.confirm = false;
		$scope.confirm = false;
		$scope.forgotPassword = false;
		$scope.homePage = false;
	};

	$scope.login = function(){
		cognitoClient.login($scope.email, $scope.passwordLogin, function(err, result){
			if(err){
				alert(err);
			} else {
				console.log("Call Success");

				$scope.username = cognitoClient.getUserName();

				$scope.loginSignupPage = false;
				$scope.loggingIn = false;
				$scope.signup = false;
				$scope.confirm = false;
				$scope.confirm = false;
				$scope.forgotPassword = false;
				$scope.homePage = true;

				$scope.$apply();
			}
		});
	};

	$scope.goToForgotPassword = function(){
		cognitoClient.forgotPassword($scope.email, {
				onSuccess: function (result) {
					console.log("Call Success");

					$scope.loginSignupPage = false;
					$scope.loggingIn = false;
					$scope.signup = false;
					$scope.confirm = false;
					$scope.forgotPassword = true;
					$scope.homePage = false;

					$scope.$apply();
				},
				onFailure: function(err) {
					alert(err);
				},
				inputVerificationCode: function() {
					console.log("Call Success");

			        $scope.loginSignupPage = false;
					$scope.loggingIn = false;
					$scope.signup = false;
					$scope.confirm = false;
					$scope.forgotPassword = true;
					$scope.homePage = false;

					$scope.$apply();
				}
		});
	};

	$scope.goToConfirm = function(){
		cognitoClient.signUp($scope.email, $scope.passwordSignUp, true, function(err, result){
			if(err){
				alert(err);
			} else {
				console.log("Call Success");

				$scope.loginSignupPage = false;
				$scope.loggingIn = false;
				$scope.signup = false;
				$scope.confirm = true;
				$scope.forgotPassword = false;
				$scope.homePage = false;

				$scope.$apply();
			}
		});
	};

	$scope.confirmSignUp = function(){
		cognitoClient.userConfirm($scope.verificationCodeConfirm, function(err, result){
			if(err){
				alert(err);
			} else {
				console.log("userConfirm call success, calling authenticateUser");
				// must authenticate user
				cognitoClient.authenticateUser($scope.email, $scope.passwordSignUp, function(err, result){
			          if(err){
			          	alert(err);
			          } else {
			          	$scope.username = cognitoClient.getUserName();
				
						$scope.loginSignupPage = false;
						$scope.loggingIn = false;
						$scope.signup = false;
						$scope.confirm = false;
						$scope.forgotPassword = false;
						$scope.homePage = true;

						$scope.$apply();
			          }
			    });
			}
		});
	};
	$scope.resetPassword = function(){
		cognitoClient.resetPassword($scope.verificationCodeForgotPassword, $scope.newPassword, function(err, result){
			if (err){
				alert(err);
			} else {
				console.log("Call Success");

				$scope.loginSignupPage = false;
				$scope.loggingIn = true;
				$scope.signup = false;
				$scope.confirm = false;
				$scope.forgotPassword = false;
				$scope.homePage = false;

				$scope.$apply();
			}
		});
	};

	$scope.signOut = function(){
		cognitoClient.signOut();

		$scope.loginSignupPage = true;
		$scope.loggingIn = false;
		$scope.signup = false;
		$scope.confirm = false;
		$scope.forgotPassword = false;
		$scope.homePage = false;

		$scope.$apply();
	};

	$scope.checkCredentials = function(){
		if(cognitoClient.hasValidCredentials()){
			$scope.username = cognitoClient.getUserName();

			$scope.loginSignupPage = false;
			$scope.loggingIn = false;
			$scope.signup = false;
			$scope.confirm = false;
			$scope.forgotPassword = false;
			$scope.homePage = true;
		} else {
			cognitoClient.loginWithCachedCredentials(function(err, result){
				if(err){
					console.log("Tried login with cached creds:"err);
				} else {
					$scope.username = cognitoClient.getUserName();

					$scope.loginSignupPage = false;
					$scope.loggingIn = false;
					$scope.signup = false;
					$scope.confirm = false;
					$scope.forgotPassword = false;
					$scope.homePage = true;

					alert("You had saved crednetials! We logged you in.")
				}
			});
		}
	};

	$scope.checkCredentials();
};
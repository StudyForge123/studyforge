import { Amplify } from "aws-amplify";

export function configureAmplify() {
  const config = {
    Auth: {
      Cognito: {
        region: import.meta.env.VITE_AWS_REGION,
        userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
        userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,

        // IMPORTANT: include this even if you’re not using Hosted UI
        loginWith: {
          username: true,
          email: true,
        },
      },
    },
  };

  console.log("Configuring Amplify with:", {
    region: config.Auth.Cognito.region,
    userPoolId: config.Auth.Cognito.userPoolId,
    clientId: config.Auth.Cognito.userPoolClientId,
  });

  Amplify.configure(config);
}

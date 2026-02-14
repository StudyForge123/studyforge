import { Amplify } from "aws-amplify";

export function configureAmplify() {
  Amplify.configure({
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
  });
}

import os
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import httpx
from .config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class CognitoAuth:
    def __init__(self):
        self.region = settings.COGNITO_REGION
        self.user_pool_id = settings.COGNITO_USER_POOL_ID
        self.app_client_id = settings.COGNITO_APP_CLIENT_ID
        self.jwks_url = f"https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}/.well-known/jwks.json"
        self._jwks = None

    async def get_jwks(self):
        if not self._jwks:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.jwks_url)
                response.raise_for_status()
                self._jwks = response.json()
        return self._jwks

    async def verify_token(self, token: str = Depends(oauth2_scheme)) -> dict:
        if not token:
             raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No authentication token provided",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        try:
            # Get the kid from the headers
            headers = jwt.get_unverified_headers(token)
            kid = headers.get("kid")
            
            jwks = await self.get_jwks()
            key = next((k for k in jwks["keys"] if k["kid"] == kid), None)
            
            if not key:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token header",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # verify the signature
            payload = jwt.decode(
                token,
                key,
                algorithms=["RS256"],
                audience=self.app_client_id,
                options={"verify_at_hash": False} # Cognito access tokens don't have at_hash? verify
            )
            
            # Additional verification: Check token_use
            if payload.get("token_use") != "access": 
                 # Adjust depending on if you want ID tokens or Access tokens. 
                 # Usually Access tokens are for APIs.
                 # If using ID token, token_use is 'id'. 
                 pass

            return payload

        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Could not validate credentials: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )

auth = CognitoAuth()

async def get_current_user(token: str = Depends(oauth2_scheme)):
    return await auth.verify_token(token)

/**
 * Smart Home handlers for the virtual doorbell device.
 *
 * These handle Alexa Smart Home directives:
 * - Alexa.Authorization.AcceptGrant: Store tokens when user enables the skill
 * - Alexa.Discovery: Return our virtual doorbell device
 *
 * Since ASK SDK doesn't natively handle Smart Home requests, we handle them
 * directly in the raw request router.
 */

const LWA_TOKEN_URL = 'https://api.amazon.com/auth/o2/token';

export interface SmartHomeRequest {
  directive: {
    header: {
      namespace: string;
      name: string;
      messageId: string;
      payloadVersion: string;
    };
    payload: {
      grant?: {
        type: string;
        code: string;
      };
      grantee?: {
        type: string;
        token: string;
      };
      scope?: {
        type: string;
        token: string;
      };
    };
  };
}

/**
 * Handle Alexa.Authorization.AcceptGrant
 * Exchange the authorization code for access and refresh tokens.
 */
export async function handleAcceptGrant(
  request: SmartHomeRequest,
  clientId: string,
  clientSecret: string,
): Promise<object> {
  const code = request.directive.payload.grant?.code;
  if (!code) {
    return makeErrorResponse(request, 'ACCEPT_GRANT_FAILED', 'No authorization code provided');
  }

  try {
    // Exchange auth code for tokens
    const tokenResponse = await fetch(LWA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const body = await tokenResponse.text();
      console.error('AcceptGrant token exchange failed:', body);
      return makeErrorResponse(request, 'ACCEPT_GRANT_FAILED', 'Token exchange failed');
    }

    const tokens = await tokenResponse.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    // TODO: Store tokens in DynamoDB keyed by user ID
    // For now, log them (will be replaced with DynamoDB storage)
    console.log('AcceptGrant: Tokens received successfully');
    console.log('Access token expires in:', tokens.expires_in, 'seconds');

    return {
      event: {
        header: {
          namespace: 'Alexa.Authorization',
          name: 'AcceptGrant.Response',
          messageId: request.directive.header.messageId + '-response',
          payloadVersion: '3',
        },
        payload: {},
      },
    };
  } catch (err) {
    console.error('AcceptGrant error:', err);
    return makeErrorResponse(request, 'ACCEPT_GRANT_FAILED', 'Internal error during token exchange');
  }
}

/**
 * Handle Alexa.Discovery - return our virtual doorbell device.
 */
export function handleDiscovery(request: SmartHomeRequest): object {
  return {
    event: {
      header: {
        namespace: 'Alexa.Discovery',
        name: 'Discover.Response',
        messageId: request.directive.header.messageId + '-response',
        payloadVersion: '3',
      },
      payload: {
        endpoints: [
          {
            endpointId: 'pikud-alert-doorbell',
            manufacturerName: 'PikudAlexa',
            description: 'Virtual doorbell for Pikud HaOref rocket alerts',
            friendlyName: 'Pikud Alert',
            displayCategories: ['DOORBELL'],
            capabilities: [
              {
                type: 'AlexaInterface',
                interface: 'Alexa.DoorbellEventSource',
                version: '3',
                proactivelyReported: true,
              },
              {
                type: 'AlexaInterface',
                interface: 'Alexa',
                version: '3',
              },
            ],
          },
        ],
      },
    },
  };
}

function makeErrorResponse(request: SmartHomeRequest, type: string, message: string): object {
  return {
    event: {
      header: {
        namespace: 'Alexa',
        name: 'ErrorResponse',
        messageId: request.directive.header.messageId + '-error',
        payloadVersion: '3',
      },
      payload: {
        type,
        message,
      },
    },
  };
}

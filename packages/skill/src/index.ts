import * as Alexa from 'ask-sdk-core';
import { LaunchRequestHandler } from './handlers/launch';
import { StatusIntentHandler } from './handlers/status';
import { LastAlertIntentHandler } from './handlers/last-alert';
import { TestAlertIntentHandler } from './handlers/test-alert';
import { MyCitiesIntentHandler } from './handlers/my-cities';
import { CountdownIntentHandler } from './handlers/countdown';
import { HelpIntentHandler, StopIntentHandler, FallbackIntentHandler } from './handlers/help';
import {
  SmartHomeRequest,
  handleAcceptGrant,
  handleDiscovery,
} from './handlers/smart-home';

/**
 * Build the Custom Skill handler (for voice intents).
 */
const customSkill = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    StatusIntentHandler,
    LastAlertIntentHandler,
    TestAlertIntentHandler,
    MyCitiesIntentHandler,
    CountdownIntentHandler,
    HelpIntentHandler,
    StopIntentHandler,
    FallbackIntentHandler,
  )
  .addErrorHandlers({
    canHandle() {
      return true;
    },
    handle(handlerInput, error) {
      console.error('Skill error:', error);
      return handlerInput.responseBuilder
        .speak('Sorry, something went wrong. Please try again.')
        .getResponse();
    },
  })
  .create();

/**
 * Lambda handler that routes between Custom Skill and Smart Home requests.
 *
 * Smart Home requests (Discovery, AcceptGrant) have a `directive` field.
 * Custom Skill requests have a `request` field inside `requestEnvelope`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handler = async (event: any, context: any): Promise<unknown> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  // Smart Home directive (has `directive.header.namespace`)
  if (event.directive && typeof event.directive === 'object') {
    const smartHomeEvent = event as unknown as SmartHomeRequest;
    const namespace = smartHomeEvent.directive.header.namespace;
    const name = smartHomeEvent.directive.header.name;

    console.log(`Smart Home request: ${namespace}.${name}`);

    if (namespace === 'Alexa.Authorization' && name === 'AcceptGrant') {
      return handleAcceptGrant(
        smartHomeEvent,
        process.env.ALEXA_CLIENT_ID || '',
        process.env.ALEXA_CLIENT_SECRET || '',
      );
    }

    if (namespace === 'Alexa.Discovery' && name === 'Discover') {
      return handleDiscovery(smartHomeEvent);
    }

    // Unknown Smart Home directive
    console.warn(`Unhandled Smart Home directive: ${namespace}.${name}`);
    return {
      event: {
        header: {
          namespace: 'Alexa',
          name: 'ErrorResponse',
          messageId: smartHomeEvent.directive.header.messageId + '-error',
          payloadVersion: '3',
        },
        payload: {
          type: 'INVALID_DIRECTIVE',
          message: `Unsupported directive: ${namespace}.${name}`,
        },
      },
    };
  }

  // Custom Skill request (voice intents)
  return customSkill.invoke(event, context);
};

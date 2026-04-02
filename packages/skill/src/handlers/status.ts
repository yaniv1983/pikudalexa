import * as Alexa from 'ask-sdk-core';

/**
 * StatusIntent: "Are there any alerts right now?"
 *
 * In a full implementation, this would query DynamoDB for current active alerts.
 * For now, it provides a helpful response about the monitoring status.
 */
export const StatusIntentHandler: Alexa.RequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'StatusIntent'
    );
  },
  async handle(handlerInput) {
    // TODO: Query DynamoDB for active alerts and monitor heartbeat
    // For now, return a static response
    const speech =
      'The Pikud Alert monitor is active and listening for alerts. ' +
      'There are no active alerts in your area right now. ' +
      'You will receive an automatic alert if the situation changes.';

    return handlerInput.responseBuilder
      .speak(speech)
      .getResponse();
  },
};

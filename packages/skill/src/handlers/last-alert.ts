import * as Alexa from 'ask-sdk-core';

/**
 * LastAlertIntent: "When was the last alert?"
 *
 * Queries DynamoDB alert log for the most recent alert in the user's area.
 */
export const LastAlertIntentHandler: Alexa.RequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'LastAlertIntent'
    );
  },
  async handle(handlerInput) {
    // TODO: Query DynamoDB PikudAlexaAlertLog for last alert matching user's cities
    // For now, return a placeholder
    const speech =
      'I don\'t have any recent alert records yet. ' +
      'Once the system detects alerts in your area, I\'ll keep a log you can ask about.';

    return handlerInput.responseBuilder
      .speak(speech)
      .getResponse();
  },
};

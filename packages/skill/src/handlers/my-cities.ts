import * as Alexa from 'ask-sdk-core';

/**
 * MyCitiesIntent: "What cities am I monitoring?"
 */
export const MyCitiesIntentHandler: Alexa.RequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'MyCitiesIntent'
    );
  },
  async handle(handlerInput) {
    // TODO: Load user's city list from DynamoDB
    const speech =
      'To configure your monitored cities, please visit the Pikud Alert settings panel ' +
      'in your web browser. You can find the link in the Alexa app under this skill\'s settings.';

    return handlerInput.responseBuilder
      .speak(speech)
      .getResponse();
  },
};

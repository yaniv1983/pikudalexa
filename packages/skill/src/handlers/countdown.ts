import * as Alexa from 'ask-sdk-core';

/**
 * CountdownIntent: "How much time do I have to reach shelter?"
 */
export const CountdownIntentHandler: Alexa.RequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'CountdownIntent'
    );
  },
  async handle(handlerInput) {
    // TODO: Load user's city and get countdown from cities data
    // Sal'it default: 90 seconds
    const speech =
      'Based on your configured city, you have approximately 90 seconds ' +
      'to reach a protected space when a rocket alert sounds. ' +
      'This time varies by city and the source of the threat.';

    return handlerInput.responseBuilder
      .speak(speech)
      .getResponse();
  },
};

import * as Alexa from 'ask-sdk-core';

export const LaunchRequestHandler: Alexa.RequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speech =
      'Welcome to Pikud Alert. I monitor real-time alerts from Pikud HaOref, ' +
      'Israel\'s Home Front Command. ' +
      'You can ask me for the current status, the last alert, or to send a test alert. ' +
      'What would you like to do?';

    return handlerInput.responseBuilder
      .speak(speech)
      .reprompt('You can say "check status" or "last alert". What would you like?')
      .getResponse();
  },
};

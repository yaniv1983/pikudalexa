import * as Alexa from 'ask-sdk-core';

export const HelpIntentHandler: Alexa.RequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent'
    );
  },
  handle(handlerInput) {
    const speech =
      'Pikud Alert monitors real-time alerts from Israel\'s Home Front Command. ' +
      'Here\'s what you can do: ' +
      'Say "check status" to see if there are any active alerts. ' +
      'Say "last alert" to hear about the most recent alert. ' +
      'Say "test alert" to send a test notification to verify your setup. ' +
      'Say "my cities" to check which cities you\'re monitoring. ' +
      'Say "countdown" to learn how much time you have to reach shelter. ' +
      'The system will also automatically alert you through your Echo device ' +
      'when a real alert is detected in your area.';

    return handlerInput.responseBuilder
      .speak(speech)
      .reprompt('What would you like to do?')
      .getResponse();
  },
};

export const StopIntentHandler: Alexa.RequestHandler = {
  canHandle(handlerInput) {
    const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
    if (requestType === 'IntentRequest') {
      const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
      return intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent';
    }
    return requestType === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Stay safe. Goodbye.')
      .getResponse();
  },
};

export const FallbackIntentHandler: Alexa.RequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent'
    );
  },
  handle(handlerInput) {
    const speech =
      'I didn\'t understand that. You can say "check status", "last alert", or "help".';

    return handlerInput.responseBuilder
      .speak(speech)
      .reprompt('What would you like to do?')
      .getResponse();
  },
};

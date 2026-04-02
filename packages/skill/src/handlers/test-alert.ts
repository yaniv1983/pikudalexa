import * as Alexa from 'ask-sdk-core';
import { buildAlertMessage, ThreatType } from '@pikudalexa/shared';

/**
 * TestAlertIntent: "Send me a test alert"
 *
 * Sends a test alert through all configured channels so the user can verify
 * their setup is working. The test uses isDrill=true.
 */
export const TestAlertIntentHandler: Alexa.RequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'TestAlertIntent'
    );
  },
  async handle(handlerInput) {
    // TODO: Trigger a test alert through the dispatcher
    // For now, play back what the alert would sound like
    const testMessage = buildAlertMessage('alert', {
      threatType: ThreatType.Missiles,
      citiesEn: ['Salit'],
      countdown: 90,
      isDrill: true,
    });

    const speech =
      'Sending a test alert now. Here is what it would sound like: ' +
      `<break time="1s"/> ${testMessage} ` +
      '<break time="1s"/> That was a test. Your system is working.';

    return handlerInput.responseBuilder
      .speak(speech)
      .getResponse();
  },
};
